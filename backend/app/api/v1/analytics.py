from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.security import verify_token
from app.db.supabase_client import supabase
from app.core.config import settings
from groq import Groq
from datetime import datetime, timedelta

router = APIRouter()
client = Groq(api_key=settings.GROQ_API_KEY)


class SkillProgressCreate(BaseModel):
    skill_name: str
    level: int = 0
    notes: Optional[str] = ""


class SkillProgressUpdate(BaseModel):
    level: Optional[int] = None
    notes: Optional[str] = None


# ── Dashboard Stats ───────────────────────────────────────────────────────────

@router.get("/overview")
async def get_overview(user_id: str = Depends(verify_token)):
    """Full analytics overview"""

    # Applications
    apps = supabase.table("job_applications")\
        .select("status, created_at, salary_min, salary_max, currency")\
        .eq("user_id", user_id)\
        .execute().data or []

    # Resumes
    resumes = supabase.table("resumes")\
        .select("ats_score, title, created_at")\
        .eq("user_id", user_id)\
        .execute().data or []

    # ATS history
    ats_history = supabase.table("ats_history")\
        .select("score, created_at")\
        .eq("user_id", user_id)\
        .order("created_at")\
        .execute().data or []

    # Skill progress
    skills = supabase.table("skill_progress")\
        .select("*")\
        .eq("user_id", user_id)\
        .execute().data or []

    # Application stats
    total = len(apps)
    status_counts = {}
    for a in apps:
        s = a.get("status", "applied")
        status_counts[s] = status_counts.get(s, 0) + 1

    responded = total - status_counts.get("applied", 0)
    response_rate = round(responded / total * 100, 1) if total > 0 else 0

    # Best resume
    best_resume = max(resumes, key=lambda r: r.get("ats_score", 0), default=None) if resumes else None

    # Weekly applications (last 7 days)
    week_ago = (datetime.now() - timedelta(days=7)).isoformat()
    weekly_apps = [a for a in apps if a.get("created_at", "") > week_ago]

    return {
        "applications": {
            "total": total,
            "by_status": status_counts,
            "response_rate": response_rate,
            "weekly": len(weekly_apps),
        },
        "resumes": {
            "total": len(resumes),
            "best": best_resume,
            "avg_ats": round(sum(r.get("ats_score", 0) for r in resumes) / len(resumes), 1) if resumes else 0,
        },
        "ats_history": ats_history,
        "skills": skills,
    }


# ── Skill Progress ────────────────────────────────────────────────────────────

@router.get("/skills")
async def get_skills(user_id: str = Depends(verify_token)):
    result = supabase.table("skill_progress")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("updated_at", desc=True)\
        .execute()
    return result.data


@router.post("/skills")
async def add_skill(req: SkillProgressCreate, user_id: str = Depends(verify_token)):
    result = supabase.table("skill_progress").insert({
        "user_id": user_id,
        "skill_name": req.skill_name,
        "level": req.level,
        "notes": req.notes,
    }).execute()
    return result.data[0]


@router.put("/skills/{skill_id}")
async def update_skill(
    skill_id: str,
    req: SkillProgressUpdate,
    user_id: str = Depends(verify_token)
):
    data = req.model_dump(exclude_none=True)
    data["updated_at"] = datetime.now().isoformat()
    result = supabase.table("skill_progress")\
        .update(data)\
        .eq("id", skill_id)\
        .eq("user_id", user_id)\
        .execute()
    return result.data[0]


@router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: str, user_id: str = Depends(verify_token)):
    supabase.table("skill_progress")\
        .delete()\
        .eq("id", skill_id)\
        .eq("user_id", user_id)\
        .execute()
    return {"message": "Deleted"}


# ── Weekly Report ─────────────────────────────────────────────────────────────

@router.get("/weekly-report")
async def weekly_report(user_id: str = Depends(verify_token)):
    """AI-generated weekly career report"""

    # Fetch all data
    apps = supabase.table("job_applications")\
        .select("company, role, status, created_at")\
        .eq("user_id", user_id)\
        .execute().data or []

    resumes = supabase.table("resumes")\
        .select("title, ats_score, created_at")\
        .eq("user_id", user_id)\
        .execute().data or []

    skills = supabase.table("skill_progress")\
        .select("skill_name, level")\
        .eq("user_id", user_id)\
        .execute().data or []

    # Week data
    week_ago = (datetime.now() - timedelta(days=7)).isoformat()
    weekly_apps = [a for a in apps if a.get("created_at", "") > week_ago]
    total = len(apps)
    status_counts = {}
    for a in apps:
        s = a.get("status", "applied")
        status_counts[s] = status_counts.get(s, 0) + 1

    prompt = f"""
You are a career coach generating a weekly career progress report.

User's data this week:
- Applications this week: {len(weekly_apps)}
- Total applications: {total}
- Status breakdown: {status_counts}
- Resumes: {len(resumes)}, Best ATS: {max((r.get('ats_score',0) for r in resumes), default=0)}%
- Skills being tracked: {[s['skill_name'] for s in skills[:5]]}

Write a motivating, specific weekly career report in 3 sections:
1. This Week's Progress (2-3 sentences)
2. Key Wins (2-3 bullet points)
3. Next Week Action Plan (3 specific actions)

Keep it concise, professional, and encouraging.
"""
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=600,
        )
        report_text = response.choices[0].message.content

        return {
            "report": report_text,
            "stats": {
                "weekly_apps": len(weekly_apps),
                "total_apps": total,
                "status_counts": status_counts,
                "best_ats": max((r.get("ats_score", 0) for r in resumes), default=0),
                "skills_count": len(skills),
            },
            "generated_at": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))