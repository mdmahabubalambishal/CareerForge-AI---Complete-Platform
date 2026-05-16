from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from app.core.security import verify_token
from app.db.supabase_client import supabase
from app.services.agents.job_scraper import scrape_jobs_with_ai, calculate_match_score
from app.services.agents.auto_apply import generate_tailored_application
from datetime import datetime

router = APIRouter()


class JobScraperRequest(BaseModel):
    role: str
    location: str = "Remote"
    skills: str
    count: int = 8


class AutoApplyRequest(BaseModel):
    scraped_job_id: str
    user_profile: dict


class BulkApplyRequest(BaseModel):
    role: str
    location: str = "Remote"
    skills: str
    user_profile: dict
    min_match_score: int = 70
    max_applications: int = 5


# ── Job Scraper ───────────────────────────────────────────────────────────────

@router.post("/scrape-jobs")
async def scrape_jobs(
    req: JobScraperRequest,
    user_id: str = Depends(verify_token)
):
    """AI দিয়ে jobs scrape করো"""
    try:
        # Agent job create করো
        agent_result = supabase.table("agent_jobs").insert({
            "user_id": user_id,
            "agent_type": "job_scraper",
            "status": "running",
            "input_data": req.model_dump(),
        }).execute()
        agent_job_id = agent_result.data[0]["id"]

        # Jobs generate করো
        jobs = scrape_jobs_with_ai(req.role, req.location, req.skills, req.count)

        # Match score calculate করো
        scraped = []
        for job in jobs:
            score = calculate_match_score(job, req.skills)
            job["match_score"] = score

            # DB তে save করো
            result = supabase.table("scraped_jobs").insert({
                "user_id": user_id,
                "agent_job_id": agent_job_id,
                "company": job.get("company"),
                "role": job.get("role"),
                "location": job.get("location"),
                "salary": job.get("salary"),
                "job_url": job.get("job_url"),
                "description": job.get("description"),
                "match_score": score,
            }).execute()
            job["id"] = result.data[0]["id"]
            scraped.append(job)

        # Agent job complete করো
        supabase.table("agent_jobs").update({
            "status": "completed",
            "output_data": {"jobs_found": len(scraped)},
            "updated_at": datetime.now().isoformat(),
        }).eq("id", agent_job_id).execute()

        # Sort by match score
        scraped.sort(key=lambda x: x.get("match_score", 0), reverse=True)

        return {
            "agent_job_id": agent_job_id,
            "jobs": scraped,
            "total": len(scraped),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scraped-jobs")
async def get_scraped_jobs(user_id: str = Depends(verify_token)):
    """User এর scraped jobs list করো"""
    result = supabase.table("scraped_jobs")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("match_score", desc=True)\
        .execute()
    return result.data


@router.delete("/scraped-jobs")
async def clear_scraped_jobs(user_id: str = Depends(verify_token)):
    """Scraped jobs clear করো"""
    supabase.table("scraped_jobs")\
        .delete()\
        .eq("user_id", user_id)\
        .execute()
    return {"message": "Cleared"}


# ── Auto Apply ────────────────────────────────────────────────────────────────

@router.post("/auto-apply")
async def auto_apply(
    req: AutoApplyRequest,
    user_id: str = Depends(verify_token)
):
    try:
        # Job fetch করো
        job_result = supabase.table("scraped_jobs")\
            .select("*")\
            .eq("id", req.scraped_job_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()

        if not job_result.data:
            raise HTTPException(status_code=404, detail="Job not found")

        job = job_result.data

        # Agent job history তে save করো
        agent_result = supabase.table("agent_jobs").insert({
            "user_id": user_id,
            "agent_type": "auto_apply",
            "status": "running",
            "input_data": {
                "job_id": req.scraped_job_id,
                "company": job.get("company"),
                "role": job.get("role"),
            },
        }).execute()
        agent_job_id = agent_result.data[0]["id"]

        # Application generate করো
        application = generate_tailored_application(job, req.user_profile)

        # Mark as applied
        supabase.table("scraped_jobs")\
            .update({"applied": True})\
            .eq("id", req.scraped_job_id)\
            .execute()

        # Agent job complete করো
        supabase.table("agent_jobs").update({
            "status": "completed",
            "output_data": {
                "company": job.get("company"),
                "role": job.get("role"),
                "match_score": application.get("match_score", 0),
                "recommendation": application.get("recommendation"),
            },
            "updated_at": datetime.now().isoformat(),
        }).eq("id", agent_job_id).execute()

        return {
            "job": job,
            "application": application,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bulk-apply")
async def bulk_apply(
    req: BulkApplyRequest,
    user_id: str = Depends(verify_token)
):
    """
    Full pipeline:
    1. Jobs scrape করো
    2. Best matches filter করো
    3. প্রতিটার জন্য application generate করো
    """
    try:
        # Step 1: Scrape jobs
        jobs = scrape_jobs_with_ai(req.role, req.location, req.skills, 10)

        results = []
        applied_count = 0

        for job in jobs:
            if applied_count >= req.max_applications:
                break

            score = calculate_match_score(job, req.skills)
            job["match_score"] = score

            if score >= req.min_match_score:
                # Application generate করো
                application = generate_tailored_application(job, req.user_profile)

                # Save to scraped_jobs
                saved = supabase.table("scraped_jobs").insert({
                    "user_id": user_id,
                    "company": job.get("company"),
                    "role": job.get("role"),
                    "location": job.get("location"),
                    "salary": job.get("salary"),
                    "job_url": job.get("job_url"),
                    "description": job.get("description"),
                    "match_score": score,
                    "applied": True,
                }).execute()

                results.append({
                    "job": job,
                    "application": application,
                    "saved_id": saved.data[0]["id"],
                })
                applied_count += 1

        return {
            "total_found": len(jobs),
            "total_applied": applied_count,
            "applications": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def agent_history(user_id: str = Depends(verify_token)):
    """Agent job history"""
    result = supabase.table("agent_jobs")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .limit(20)\
        .execute()
    return result.data