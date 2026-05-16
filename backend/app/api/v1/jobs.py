from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.security import verify_token
from app.db.supabase_client import supabase
from app.core.config import settings
from groq import Groq

router = APIRouter()
client = Groq(api_key=settings.GROQ_API_KEY)

# ── Models ────────────────────────────────────────────────────────────────────

class JobApplicationCreate(BaseModel):
    company: str
    role: str
    status: str = 'applied'
    priority: str = 'medium'
    job_type: str = 'full-time'
    work_mode: str = 'remote'
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: str = 'USD'
    location: Optional[str] = None
    remote: bool = False
    job_url: Optional[str] = None
    notes: Optional[str] = None
    applied_date: Optional[str] = None
    follow_up_date: Optional[str] = None

class JobApplicationUpdate(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    location: Optional[str] = None
    remote: Optional[bool] = None
    notes: Optional[str] = None
    interview_date: Optional[str] = None
    offer_amount: Optional[int] = None

class OfferAnalyzeRequest(BaseModel):
    offer_text: str
    role: str
    company: str

class SalaryRequest(BaseModel):
    role: str
    location: Optional[str] = None
    experience_level: Optional[str] = None

# ✅ নতুন — role optional, যেকোনো role এর জন্য কাজ করবে
class MarketTrendsRequest(BaseModel):
    role: Optional[str] = None

class RemoteBDRequest(BaseModel):
    role: Optional[str] = None

# ── Job Tracker ───────────────────────────────────────────────────────────────

@router.post("/applications")
async def create_application(
    req: JobApplicationCreate,
    user_id: str = Depends(verify_token)
):
    data = req.model_dump(exclude_none=True)
    # Empty string গুলো বাদ দাও — Supabase date field এ empty string চলে না
    data = {k: v for k, v in data.items() if v != ""}
    data["user_id"] = user_id
    result = supabase.table("job_applications").insert(data).execute()
    return result.data[0]


@router.get("/applications")
async def list_applications(user_id: str = Depends(verify_token)):
    result = supabase.table("job_applications")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .execute()
    return result.data


@router.put("/applications/{app_id}")
async def update_application(
    app_id: str,
    req: JobApplicationUpdate,
    user_id: str = Depends(verify_token)
):
    data = req.model_dump(exclude_none=True)
    result = supabase.table("job_applications")\
        .update(data)\
        .eq("id", app_id)\
        .eq("user_id", user_id)\
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Not found")
    return result.data[0]


@router.delete("/applications/{app_id}")
async def delete_application(app_id: str, user_id: str = Depends(verify_token)):
    supabase.table("job_applications")\
        .delete()\
        .eq("id", app_id)\
        .eq("user_id", user_id)\
        .execute()
    return {"message": "Deleted"}


@router.get("/applications/stats")
async def get_stats(user_id: str = Depends(verify_token)):
    result = supabase.table("job_applications")\
        .select("status")\
        .eq("user_id", user_id)\
        .execute()

    apps = result.data
    total = len(apps)
    stats = {
        "total": total,
        "applied": sum(1 for a in apps if a["status"] == "applied"),
        "screening": sum(1 for a in apps if a["status"] == "screening"),
        "interviewing": sum(1 for a in apps if a["status"] == "interviewing"),
        "offer": sum(1 for a in apps if a["status"] == "offer"),
        "rejected": sum(1 for a in apps if a["status"] == "rejected"),
        "withdrawn": sum(1 for a in apps if a["status"] == "withdrawn"),
        "ghosted": sum(1 for a in apps if a["status"] == "ghosted"),
        "response_rate": round(
            sum(1 for a in apps if a["status"] != "applied") / total * 100
            if total > 0 else 0, 1
        ),
    }
    return stats

# ── Salary Insights ───────────────────────────────────────────────────────────

@router.post("/salary/insights")
async def salary_insights(
    req: SalaryRequest,
    user_id: str = Depends(verify_token)
):
    all_data = [
        {"role": "LLM Engineer", "company": "Google", "location": "USA", "min_salary": 150000, "max_salary": 220000, "avg_salary": 185000, "currency": "USD", "experience_level": "Senior", "source": "Glassdoor"},
        {"role": "LLM Engineer", "company": "Anthropic", "location": "USA", "min_salary": 160000, "max_salary": 230000, "avg_salary": 195000, "currency": "USD", "experience_level": "Senior", "source": "Glassdoor"},
        {"role": "LLM Engineer", "company": "OpenAI", "location": "USA", "min_salary": 170000, "max_salary": 250000, "avg_salary": 210000, "currency": "USD", "experience_level": "Senior", "source": "Glassdoor"},
        {"role": "LLM Engineer", "company": "Meta", "location": "USA", "min_salary": 155000, "max_salary": 225000, "avg_salary": 190000, "currency": "USD", "experience_level": "Senior", "source": "Glassdoor"},
        {"role": "LLM Engineer", "company": "Remote", "location": "Bangladesh", "min_salary": 40000, "max_salary": 80000, "avg_salary": 60000, "currency": "USD", "experience_level": "Mid", "source": "LinkedIn"},
        {"role": "ML Engineer", "company": "Google", "location": "USA", "min_salary": 140000, "max_salary": 200000, "avg_salary": 170000, "currency": "USD", "experience_level": "Senior", "source": "Glassdoor"},
        {"role": "ML Engineer", "company": "Microsoft", "location": "USA", "min_salary": 135000, "max_salary": 195000, "avg_salary": 165000, "currency": "USD", "experience_level": "Senior", "source": "Glassdoor"},
        {"role": "Data Scientist", "company": "Google", "location": "USA", "min_salary": 130000, "max_salary": 190000, "avg_salary": 160000, "currency": "USD", "experience_level": "Senior", "source": "Glassdoor"},
        {"role": "Data Scientist", "company": "Remote", "location": "Bangladesh", "min_salary": 30000, "max_salary": 60000, "avg_salary": 45000, "currency": "USD", "experience_level": "Mid", "source": "LinkedIn"},
        {"role": "AI Engineer", "company": "Startup", "location": "USA", "min_salary": 120000, "max_salary": 180000, "avg_salary": 150000, "currency": "USD", "experience_level": "Mid", "source": "Glassdoor"},
        {"role": "AI Engineer", "company": "Remote", "location": "Bangladesh", "min_salary": 35000, "max_salary": 70000, "avg_salary": 52000, "currency": "USD", "experience_level": "Mid", "source": "LinkedIn"},
        {"role": "Software Engineer", "company": "Google", "location": "USA", "min_salary": 130000, "max_salary": 200000, "avg_salary": 165000, "currency": "USD", "experience_level": "Mid", "source": "Glassdoor"},
        {"role": "Software Engineer", "company": "Remote", "location": "Bangladesh", "min_salary": 20000, "max_salary": 50000, "avg_salary": 35000, "currency": "USD", "experience_level": "Mid", "source": "LinkedIn"},
        {"role": "Program Officer", "company": "BRAC", "location": "Bangladesh", "min_salary": 600000, "max_salary": 900000, "avg_salary": 750000, "currency": "BDT", "experience_level": "Mid", "source": "BRAC Careers"},
        {"role": "Program Officer", "company": "UNDP", "location": "Bangladesh", "min_salary": 800000, "max_salary": 1200000, "avg_salary": 1000000, "currency": "BDT", "experience_level": "Mid", "source": "UN Jobs"},
        {"role": "DevOps Engineer", "company": "Remote", "location": "USA", "min_salary": 120000, "max_salary": 180000, "avg_salary": 150000, "currency": "USD", "experience_level": "Mid", "source": "Glassdoor"},
        {"role": "Product Manager", "company": "Meta", "location": "USA", "min_salary": 150000, "max_salary": 220000, "avg_salary": 185000, "currency": "USD", "experience_level": "Senior", "source": "Glassdoor"},
    ]

    role_lower = req.role.lower()
    data = [d for d in all_data if role_lower in d["role"].lower()]

    if req.location:
        loc_lower = req.location.lower()
        filtered = [d for d in data if loc_lower in d["location"].lower()]
        if filtered:
            data = filtered

    # Role না পেলে Groq দিয়ে generate করবে
    if not data:
        try:
            prompt = f"""
Generate realistic salary data for the role "{req.role}" {'in ' + req.location if req.location else 'globally'}.
Return ONLY valid JSON array with 3-5 entries, each with these fields:
role, company, location, min_salary, max_salary, avg_salary, currency, experience_level, source
No markdown, no explanation.
"""
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=600,
            )
            import json, re
            raw = response.choices[0].message.content
            raw = re.sub(r'```json\s*', '', raw)
            raw = re.sub(r'```\s*', '', raw)
            data = json.loads(raw.strip())
        except Exception:
            return {"role": req.role, "message": "No data found for this role.", "data": [], "summary": {}}

    salaries = [d.get("avg_salary", 0) for d in data if d.get("avg_salary")]
    summary = {
        "min": min(salaries) if salaries else 0,
        "max": max(salaries) if salaries else 0,
        "avg": round(sum(salaries) / len(salaries)) if salaries else 0,
        "count": len(data),
    }

    return {"role": req.role, "data": data, "summary": summary}


# ── Offer Letter Analyzer ─────────────────────────────────────────────────────

@router.post("/offer/analyze")
async def analyze_offer(
    req: OfferAnalyzeRequest,
    user_id: str = Depends(verify_token)
):
    prompt = f"""
You are an expert offer letter analyzer and career advisor.

Analyze this job offer letter. Output ONLY valid JSON.

Role: {req.role}
Company: {req.company}

Offer Letter:
{req.offer_text}

Return:
{{
  "base_salary": 0,
  "total_compensation": 0,
  "currency": "USD",
  "key_benefits": [],
  "red_flags": [],
  "green_flags": [],
  "negotiation_points": [],
  "market_comparison": "above/at/below market",
  "recommendation": "accept/negotiate/decline",
  "summary": "brief analysis",
  "score": 75
}}
"""
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=1000,
        )
        import json, re
        raw = response.choices[0].message.content
        raw = re.sub(r'```json\s*', '', raw)
        raw = re.sub(r'```\s*', '', raw)
        return json.loads(raw.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Job Market Trends ─────────────────────────────────────────────────────────
# ✅ GET → POST, role parameter যোগ হয়েছে

@router.post("/market/trends")
async def market_trends(
    req: MarketTrendsRequest,
    user_id: str = Depends(verify_token)
):
    role = req.role or "Tech"

    # Default tech data
    default_data = {
        "top_roles": [
            {"role": "LLM Engineer", "demand": 95, "growth": "+45%"},
            {"role": "ML Engineer", "demand": 88, "growth": "+32%"},
            {"role": "AI Engineer", "demand": 85, "growth": "+38%"},
            {"role": "Data Scientist", "demand": 78, "growth": "+20%"},
            {"role": "MLOps Engineer", "demand": 72, "growth": "+55%"},
        ],
        "top_skills": [
            {"skill": "LangChain", "demand": 92},
            {"skill": "Python", "demand": 98},
            {"skill": "LLM Fine-tuning", "demand": 88},
            {"skill": "RAG Systems", "demand": 85},
            {"skill": "FastAPI", "demand": 80},
            {"skill": "Docker", "demand": 78},
        ],
        "remote_percentage": 68,
        "bd_remote_jobs": 245,
        "avg_salary_increase": "23%",
    }

    # role-specific হলে Groq দিয়ে dynamic data generate করবে
    try:
        prompt = f"""
You are a job market analyst. Generate realistic market trend data for the role "{role}".
Return ONLY valid JSON with this exact structure, no markdown:
{{
  "top_roles": [
    {{"role": "string", "demand": 0-100, "growth": "+X%"}},
    ... (5 related roles)
  ],
  "top_skills": [
    {{"skill": "string", "demand": 0-100}},
    ... (6-7 key skills for this role)
  ],
  "remote_percentage": 0-100,
  "bd_remote_jobs": number,
  "avg_salary_increase": "X%"
}}
"""
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=800,
        )
        import json, re
        raw = response.choices[0].message.content
        raw = re.sub(r'```json\s*', '', raw)
        raw = re.sub(r'```\s*', '', raw)
        return json.loads(raw.strip())
    except Exception:
        return default_data


# ── Remote Jobs BD ────────────────────────────────────────────────────────────
# ✅ GET → POST, role parameter যোগ হয়েছে

@router.post("/remote/bd")
async def remote_jobs_bd(
    req: RemoteBDRequest,
    user_id: str = Depends(verify_token)
):
    role = req.role or "Software Engineer"

    try:
        prompt = f"""
You are a remote job advisor for Bangladesh. Generate realistic remote job listings for the role "{role}" that are accessible to Bangladeshi professionals.
Return ONLY valid JSON with this exact structure, no markdown:
{{
  "jobs": [
    {{
      "company": "string",
      "role": "string",
      "salary": "$Xk-$Yk",
      "type": "Remote/Contract/Freelance",
      "skills": ["skill1", "skill2", "skill3"],
      "url": "https://..."
    }}
    ... (5 jobs)
  ],
  "tips": [
    "tip1", "tip2", "tip3", "tip4"
  ]
}}
"""
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1000,
        )
        import json, re
        raw = response.choices[0].message.content
        raw = re.sub(r'```json\s*', '', raw)
        raw = re.sub(r'```\s*', '', raw)
        return json.loads(raw.strip())
    except Exception:
        # Fallback static data
        return {
            "jobs": [
                {"company": "Scale AI", "role": role, "salary": "$30k-$60k", "type": "Contract", "skills": ["Python", "ML", "English"], "url": "https://scale.com/careers"},
                {"company": "Upwork", "role": role, "salary": "$40k-$80k", "type": "Freelance", "skills": ["Portfolio", "English", "GitHub"], "url": "https://upwork.com"},
                {"company": "Toptal", "role": role, "salary": "$60k-$120k", "type": "Freelance", "skills": ["Expert-level", "English", "Portfolio"], "url": "https://toptal.com"},
                {"company": "Remote.co", "role": role, "salary": "$35k-$70k", "type": "Remote", "skills": ["Communication", "Self-management"], "url": "https://remote.co"},
                {"company": "We Work Remotely", "role": role, "salary": "$30k-$65k", "type": "Remote", "skills": ["English", "GitHub", "Portfolio"], "url": "https://weworkremotely.com"},
            ],
            "tips": [
                "Build a strong GitHub portfolio",
                "Get certifications relevant to your role",
                "Create profiles on Upwork and Toptal",
                "Network on LinkedIn with international professionals",
            ]
        }