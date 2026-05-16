import json
import re
from groq import Groq
from app.core.config import settings
from app.prompts.resume_prompts import (   # ← এখন app.prompts থেকে
    GENERATE_RESUME_PROMPT,
    ATS_SCORE_PROMPT,
    JD_MATCHER_PROMPT
)

client = Groq(api_key=settings.GROQ_API_KEY)

def clean_json(text: str) -> str:
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    return text.strip()


def generate_resume(user_data: dict, target_role: str, target_company: str = "", industry: str = "Technology") -> dict:
    prompt = GENERATE_RESUME_PROMPT.format(
        user_data=json.dumps(user_data, indent=2),
        target_role=target_role,
        target_company=target_company or "any company",
        industry=industry or "Technology",
    )
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=3000,
    )
    return json.loads(clean_json(response.choices[0].message.content))


def score_resume(resume_text: str, job_description: str) -> dict:
    prompt = ATS_SCORE_PROMPT.format(
        resume_text=resume_text,
        job_description=job_description
    )
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=1500,
    )
    return json.loads(clean_json(response.choices[0].message.content))


def match_jd(resume_text: str, jd_text: str) -> dict:
    prompt = JD_MATCHER_PROMPT.format(
        resume_text=resume_text,
        jd_text=jd_text
    )
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=1500,
    )
    return json.loads(clean_json(response.choices[0].message.content))