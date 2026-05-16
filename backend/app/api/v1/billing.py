from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from app.core.security import verify_token
from app.db.supabase_client import supabase
from app.core.config import settings
from app.core.plans import PLANS
from datetime import datetime, timedelta
import stripe
import uuid

router = APIRouter()

# Stripe setup
stripe.api_key = settings.STRIPE_SECRET_KEY


class CreateCheckoutRequest(BaseModel):
    plan: str
    gateway: str = "stripe"
    success_url: str = "http://localhost:3000/dashboard?payment=success"
    cancel_url: str = "http://localhost:3000/dashboard/billing?payment=cancelled"


class SSLCommerzRequest(BaseModel):
    plan: str


# ── Plans Info ────────────────────────────────────────────────────────────────

@router.get("/plans")
async def get_plans():
    return PLANS


@router.get("/my-plan")
async def get_my_plan(user_id: str = Depends(verify_token)):
    profile = supabase.table("profiles")\
        .select("plan, credits, ai_calls, resume_count")\
        .eq("id", user_id)\
        .single()\
        .execute()

    subscription = supabase.table("subscriptions")\
        .select("*")\
        .eq("user_id", user_id)\
        .execute()

    plan = profile.data.get("plan", "free")
    plan_info = PLANS.get(plan, PLANS["free"])

    return {
        "plan": plan,
        "plan_info": plan_info,
        "usage": {
            "ai_calls": profile.data.get("ai_calls", 0),
            "resume_count": profile.data.get("resume_count", 0),
        },
        "subscription": subscription.data[0] if subscription.data else None,
    }


# ── Stripe ────────────────────────────────────────────────────────────────────

@router.post("/stripe/checkout")
async def create_stripe_checkout(
    req: CreateCheckoutRequest,
    user_id: str = Depends(verify_token)
):
    if req.plan not in PLANS or req.plan == "free":
        raise HTTPException(status_code=400, detail="Invalid plan")

    plan = PLANS[req.plan]
    price_usd_cents = plan["price_usd"] * 100

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"CareerForge AI — {plan['name']}",
                        "description": f"Monthly subscription to {plan['name']} plan",
                    },
                    "unit_amount": price_usd_cents,
                    "recurring": {"interval": "month"},
                },
                "quantity": 1,
            }],
            mode="subscription",
            success_url=req.success_url + "&session_id={CHECKOUT_SESSION_ID}",
            cancel_url=req.cancel_url,
            metadata={
                "user_id": user_id,
                "plan": req.plan,
            }
        )
        return {"checkout_url": session.url, "session_id": session.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"]["user_id"]
        plan = session["metadata"]["plan"]

        # Plan update করো
        _activate_plan(user_id, plan, "stripe", session["subscription"])

    return {"status": "ok"}


# ── SSLCommerz ────────────────────────────────────────────────────────────────

@router.post("/sslcommerz/init")
async def sslcommerz_init(
    req: SSLCommerzRequest,
    user_id: str = Depends(verify_token)
):
    if req.plan not in PLANS or req.plan == "free":
        raise HTTPException(status_code=400, detail="Invalid plan")

    plan = PLANS[req.plan]
    tran_id = str(uuid.uuid4())[:8].upper()

    # Payment record save করো
    supabase.table("payments").insert({
        "user_id": user_id,
        "amount": plan["price_bdt"],
        "currency": "BDT",
        "status": "pending",
        "gateway": "sslcommerz",
        "gateway_payment_id": tran_id,
        "plan": req.plan,
    }).execute()

    try:
        from sslcommerz_python.payment import SSLCSession
        sslcz = SSLCSession(
            sslc_is_sandbox=True,
            sslc_store_id=settings.SSLCOMMERZ_STORE_ID,
            sslc_store_pass=settings.SSLCOMMERZ_STORE_PASS,
        )

        profile = supabase.table("profiles")\
            .select("email, full_name")\
            .eq("id", user_id)\
            .single()\
            .execute()

        sslcz.set_urls(
            success_url=f"http://localhost:8000/api/v1/billing/sslcommerz/success",
            fail_url=f"http://localhost:3000/dashboard/billing?payment=failed",
            cancel_url=f"http://localhost:3000/dashboard/billing?payment=cancelled",
            ipn_url=f"http://localhost:8000/api/v1/billing/sslcommerz/ipn",
        )
        sslcz.set_product_integration(
            total_amount=plan["price_bdt"],
            currency="BDT",
            product_category="subscription",
            product_name=f"CareerForge {plan['name']}",
            num_of_item=1,
            shipping_method="NO",
            product_profile="non-physical-goods",
        )
        sslcz.set_customer_info(
            name=profile.data.get("full_name", "Customer"),
            email=profile.data.get("email", ""),
            address1="Dhaka",
            city="Dhaka",
            postcode="1200",
            country="Bangladesh",
            phone="01700000000",
        )
        sslcz.set_tran_id(tran_id)

        response = sslcz.init_payment()

        if response.get("status") == "SUCCESS":
            return {"payment_url": response["GatewayPageURL"]}
        else:
            raise HTTPException(status_code=500, detail="SSLCommerz init failed")

    except ImportError:
        # SSLCommerz not installed — return mock for testing
        return {
            "payment_url": f"http://localhost:3000/dashboard/billing?mock_payment=true&plan={req.plan}&tran_id={tran_id}&user_id={user_id}",
            "note": "SSLCommerz sandbox mode"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sslcommerz/success")
async def sslcommerz_success(
    tran_id: str,
    val_id: str = "",
    status: str = "",
):
    # Payment verify করো
    payment = supabase.table("payments")\
        .select("*")\
        .eq("gateway_payment_id", tran_id)\
        .single()\
        .execute()

    if payment.data and status == "VALID":
        user_id = payment.data["user_id"]
        plan = payment.data["plan"]
        _activate_plan(user_id, plan, "sslcommerz", tran_id)
        supabase.table("payments")\
            .update({"status": "completed"})\
            .eq("gateway_payment_id", tran_id)\
            .execute()

    from fastapi.responses import RedirectResponse
    return RedirectResponse("http://localhost:3000/dashboard/billing?payment=success")


@router.post("/mock-upgrade")
async def mock_upgrade(
    plan: str,
    user_id: str = Depends(verify_token)
):
    """Testing এর জন্য mock upgrade"""
    if plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    _activate_plan(user_id, plan, "mock", "mock_" + plan)
    return {"message": f"Upgraded to {plan}", "plan": plan}


# ── Cancel ────────────────────────────────────────────────────────────────────

@router.post("/cancel")
async def cancel_subscription(user_id: str = Depends(verify_token)):
    supabase.table("profiles")\
        .update({"plan": "free"})\
        .eq("id", user_id)\
        .execute()
    supabase.table("subscriptions")\
        .update({"status": "cancelled", "plan": "free"})\
        .eq("user_id", user_id)\
        .execute()
    return {"message": "Subscription cancelled"}


# ── Helper ────────────────────────────────────────────────────────────────────

def _activate_plan(user_id: str, plan: str, gateway: str, gateway_id: str):
    """Plan activate করো"""
    # Profile update
    supabase.table("profiles")\
        .update({"plan": plan, "credits": 1000 if plan == "pro" else 5000})\
        .eq("id", user_id)\
        .execute()

    # Subscription upsert
    existing = supabase.table("subscriptions")\
        .select("id")\
        .eq("user_id", user_id)\
        .execute()

    period_end = (datetime.now() + timedelta(days=30)).isoformat()

    if existing.data:
        supabase.table("subscriptions").update({
            "plan": plan,
            "status": "active",
            "payment_gateway": gateway,
            "gateway_subscription_id": gateway_id,
            "current_period_end": period_end,
            "updated_at": datetime.now().isoformat(),
        }).eq("user_id", user_id).execute()
    else:
        supabase.table("subscriptions").insert({
            "user_id": user_id,
            "plan": plan,
            "status": "active",
            "payment_gateway": gateway,
            "gateway_subscription_id": gateway_id,
            "current_period_end": period_end,
        }).execute()