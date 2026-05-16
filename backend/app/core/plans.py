PLANS = {
    "free": {
        "name": "Free",
        "price_bdt": 0,
        "price_usd": 0,
        "limits": {
            "resumes": 2,
            "ai_calls_per_day": 20,
            "documents": 5,
            "job_applications": 10,
        },
        "features": [
            "2 Resume generations",
            "20 AI calls/day",
            "5 document uploads",
            "Basic chatbot",
            "Job tracker (10 apps)",
        ]
    },
    "pro": {
        "name": "Pro",
        "price_bdt": 299,
        "price_usd": 3,
        "limits": {
            "resumes": -1,          # unlimited
            "ai_calls_per_day": -1,  # unlimited
            "documents": -1,
            "job_applications": -1,
        },
        "features": [
            "Unlimited resumes",
            "Unlimited AI calls",
            "Unlimited documents",
            "Full RAG chatbot",
            "All writing tools",
            "Job Scraper Agent",
            "Interview prep",
            "Analytics",
            "Portfolio builder",
        ]
    },
    "enterprise": {
        "name": "Enterprise",
        "price_bdt": 999,
        "price_usd": 9,
        "limits": {
            "resumes": -1,
            "ai_calls_per_day": -1,
            "documents": -1,
            "job_applications": -1,
        },
        "features": [
            "Everything in Pro",
            "Team management",
            "Priority support",
            "Custom branding",
            "API access",
            "Dedicated support",
        ]
    }
}


def check_limit(plan: str, feature: str, current_usage: int) -> bool:
    """User এর limit check করো — True মানে allowed"""
    plan_config = PLANS.get(plan, PLANS["free"])
    limit = plan_config["limits"].get(feature, 0)
    if limit == -1:
        return True  # unlimited
    return current_usage < limit