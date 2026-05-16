import json
import re
from groq import Groq
from app.core.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)


def generate_tailored_application(
    job: dict,
    user_profile: dict,
) -> dict:
    """
    Job এর জন্য tailored resume summary + cover letter generate করো
    """

    # Step 1: Resume tailoring
    tailor_prompt = f"""
You are an expert resume tailoring specialist.

Tailor this resume summary for the specific job. Output ONLY valid JSON.

User Profile:
{json.dumps(user_profile, indent=2)}

Target Job:
Company: {job.get('company')}
Role: {job.get('role')}
Description: {job.get('description')}
Required Skills: {job.get('required_skills', [])}

Return:
{{
  "tailored_summary": "3-sentence tailored professional summary",
  "key_matches": ["matched skill 1", "matched skill 2"],
  "missing_skills": ["gap 1", "gap 2"],
  "match_score": 85,
  "recommendation": "apply / consider / skip"
}}
"""
    tailor_response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": tailor_prompt}],
        temperature=0.3,
        max_tokens=800,
    )
    raw = tailor_response.choices[0].message.content
    raw = re.sub(r'```json\s*', '', raw)
    raw = re.sub(r'```\s*', '', raw)
    tailored = json.loads(raw.strip())

    # Step 2: Cover letter
    cover_prompt = f"""
Write a compelling cover letter for this job application. Output ONLY the cover letter text.

Applicant: {user_profile.get('name', 'Candidate')}
Target: {job.get('role')} at {job.get('company')}
Key Skills: {', '.join(tailored.get('key_matches', []))}
Job Description: {job.get('description')}

Rules:
- 3 paragraphs: Hook, Value, CTA
- Under 250 words
- Specific to the company and role
"""
    cover_response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": cover_prompt}],
        temperature=0.5,
        max_tokens=600,
    )
    cover_letter = cover_response.choices[0].message.content.strip()

    return {
        "tailored_summary": tailored.get("tailored_summary", ""),
        "key_matches": tailored.get("key_matches", []),
        "missing_skills": tailored.get("missing_skills", []),
        "match_score": tailored.get("match_score", 0),
        "recommendation": tailored.get("recommendation", "consider"),
        "cover_letter": cover_letter,
    }