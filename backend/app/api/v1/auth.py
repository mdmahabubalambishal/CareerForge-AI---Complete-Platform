from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ...core.security import verify_token
from ...db.supabase_client import supabase

router = APIRouter()

class ProfileUpdate(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None

@router.get("/me")
async def get_profile(user_id: str = Depends(verify_token)):
    """Logged-in user এর profile return করে"""
    result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result.data

@router.put("/me")
async def update_profile(
    update: ProfileUpdate,
    user_id: str = Depends(verify_token)
):
    result = supabase.table("profiles").update(
        update.model_dump(exclude_none=True)
    ).eq("id", user_id).execute()
    return result.data[0]

@router.get("/dashboard-stats")
async def get_dashboard_stats(user_id: str = Depends(verify_token)):
    """Dashboard এর জন্য basic stats"""
    profile = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    return {
        "credits": profile.data.get("credits", 0),
        "plan": profile.data.get("plan", "free"),
        "ats_score": 0,
        "applications": 0,
        "interviews": 0,
        "skill_match": 0,
    }