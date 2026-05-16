from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
import json

from app.core.security import verify_token
from app.db.supabase_client import supabase
from app.services.ai.resume_ai import generate_resume, score_resume, match_jd
from app.services.resume.pdf_service import generate_pdf_bytes

router = APIRouter()

# ── Pydantic Models ──────────────────────────────────────────

class ResumeGenerateRequest(BaseModel):
    title: str = "My Resume"
    target_role: str
    target_company: Optional[str] = ""
    industry: Optional[str] = "Technology"
    user_data: dict
    job_description: Optional[str] = ""

class ATSScoreRequest(BaseModel):
    resume_id: str
    job_description: str

class JDMatchRequest(BaseModel):
    resume_id: str
    jd_text: str

class UpdateResumeRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[dict] = None
    target_role: Optional[str] = None
    target_company: Optional[str] = None

# ── Helper ───────────────────────────────────────────────────

def resume_dict_to_text(content: dict) -> str:
    """Resume JSON → plain text (ATS scoring এর জন্য)"""
    parts = []
    p = content.get("personal", {})
    parts.append(p.get("full_name", ""))
    parts.append(content.get("summary", ""))

    for exp in content.get("experience", []):
        parts.append(f"{exp.get('title','')} at {exp.get('company','')}")
        parts.extend(exp.get("bullets", []))

    for edu in content.get("education", []):
        parts.append(f"{edu.get('degree','')} from {edu.get('institution','')}")

    skills = content.get("skills", {})
    parts.extend(skills.get("technical", []))
    parts.extend(skills.get("tools", []))

    for proj in content.get("projects", []):
        parts.append(proj.get("description", ""))

    return "\n".join(filter(None, parts))

# ── Routes ───────────────────────────────────────────────────

@router.post("/generate")
async def generate(req: ResumeGenerateRequest, user_id: str = Depends(verify_token)):
    """AI দিয়ে resume generate করো"""
    try:
        content = generate_resume(req.user_data, req.target_role, req.target_company)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    # Save to DB
    insert_payload = {
        "user_id": user_id,
        "title": req.title or "My Resume",
        "content": content,
        "target_role": req.target_role,
        "target_company": req.target_company or "",
        "industry": req.industry or "Technology",
        "job_description": req.job_description or "",
    }

    result = supabase.table("resumes").insert(insert_payload).execute()

    # Supabase insert returns a list in `data` for the inserted rows
    if isinstance(result.data, list) and len(result.data) > 0:
        resume = result.data[0]
    else:
        resume = result.data

    # Decrement profile credits (-10)
    profile = supabase.table("profiles").select("credits").eq("id", user_id).single().execute()
    new_credits = max(0, (profile.data.get("credits", 0) - 10))
    supabase.table("profiles").update({"credits": new_credits}).eq("id", user_id).execute()

    return {"resume": resume, "credits_remaining": new_credits}


@router.get("/list")
async def list_resumes(user_id: str = Depends(verify_token)):
    """User এর সব resume list করো"""
    result = supabase.table("resumes")\
        .select("id, title, ats_score, target_role, version_number, created_at, updated_at")\
        .eq("user_id", user_id)\
        .order("updated_at", desc=True)\
        .execute()
    return result.data


@router.get("/{resume_id}")
async def get_resume(resume_id: str, user_id: str = Depends(verify_token)):
    """Single resume fetch করো"""
    result = supabase.table("resumes")\
        .select("*")\
        .eq("id", resume_id)\
        .eq("user_id", user_id)\
        .single()\
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Resume not found")
    return result.data


@router.put("/{resume_id}")
async def update_resume(
    resume_id: str,
    req: UpdateResumeRequest,
    user_id: str = Depends(verify_token)
):
    """Resume update করো"""
    update_data = req.model_dump(exclude_none=True)
    result = supabase.table("resumes")\
        .update(update_data)\
        .eq("id", resume_id)\
        .eq("user_id", user_id)\
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Resume not found")
    return result.data[0]


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, user_id: str = Depends(verify_token)):
    supabase.table("resumes")\
        .delete()\
        .eq("id", resume_id)\
        .eq("user_id", user_id)\
        .execute()
    return {"message": "Deleted"}


@router.post("/score")
async def ats_score(req: ATSScoreRequest, user_id: str = Depends(verify_token)):
    """ATS score calculate করো"""
    # Resume fetch করো
    res = supabase.table("resumes")\
        .select("content, title")\
        .eq("id", req.resume_id)\
        .eq("user_id", user_id)\
        .single()\
        .execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_text = resume_dict_to_text(res.data["content"])

    try:
        result = score_resume(resume_text, req.job_description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")

    score = result.get("overall_score", 0)

    # DB update করো
    supabase.table("resumes")\
        .update({"ats_score": score})\
        .eq("id", req.resume_id)\
        .execute()

    # History save করো
    supabase.table("ats_history").insert({
        "user_id": user_id,
        "resume_id": req.resume_id,
        "score": score,
        "job_description": req.job_description,
        "feedback": result,
    }).execute()

    return result


@router.post("/match-jd")
async def jd_match(req: JDMatchRequest, user_id: str = Depends(verify_token)):
    """Resume vs JD match করো"""
    res = supabase.table("resumes")\
        .select("content")\
        .eq("id", req.resume_id)\
        .eq("user_id", user_id)\
        .single()\
        .execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_text = resume_dict_to_text(res.data["content"])

    try:
        result = match_jd(resume_text, req.jd_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"JD matching failed: {str(e)}")

    # Keyword scan save করো
    supabase.table("keyword_scans").insert({
        "resume_id": req.resume_id,
        "user_id": user_id,
        "matched_keywords": result.get("matched", []),
        "missing_keywords": result.get("missing", []),
        "jd_text": req.jd_text,
        "match_score": result.get("match_score", 0),
    }).execute()

    return result


@router.get("/{resume_id}/export/pdf")
async def export_pdf(resume_id: str, user_id: str = Depends(verify_token)):
    res = supabase.table("resumes")\
        .select("content, title")\
        .eq("id", resume_id)\
        .eq("user_id", user_id)\
        .single()\
        .execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        from app.services.resume.pdf_service import generate_pdf_bytes
        pdf_bytes = generate_pdf_bytes(res.data["content"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    filename = res.data["title"].replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'}
    )


@router.get("/{resume_id}/ats-history")
async def ats_history(resume_id: str, user_id: str = Depends(verify_token)):
    """ATS score history chart এর জন্য"""
    result = supabase.table("ats_history")\
        .select("score, created_at, feedback")\
        .eq("resume_id", resume_id)\
        .eq("user_id", user_id)\
        .order("created_at")\
        .execute()
    return result.data