import json
import re
from groq import Groq
from tavily import TavilyClient
from app.core.config import settings

groq_client = Groq(api_key=settings.GROQ_API_KEY)


def scrape_jobs_with_ai(
    role: str,
    location: str,
    skills: str,
    count: int = 10
) -> list[dict]:
    """Tavily দিয়ে real job listings search করো"""

    tavily = TavilyClient(api_key=settings.TAVILY_API_KEY)

    # Multiple searches করো different sources থেকে
    queries = [
        f"{role} jobs {location} site:linkedin.com/jobs",
        f"{role} remote jobs hiring 2025",
        f"{role} job opening {location} apply now",
    ]

    all_results = []
    for query in queries[:2]:
        try:
            results = tavily.search(
                query=query,
                search_depth="basic",
                max_results=5,
                include_raw_content=False,
            )
            all_results.extend(results.get("results", []))
        except Exception as e:
            print(f"Tavily search error: {e}")
            continue

    # AI দিয়ে results parse করো structured format এ
    if all_results:
        parse_prompt = f"""
Parse these job search results into structured job listings.
Output ONLY a valid JSON array.

Search Results:
{json.dumps([{
    'title': r.get('title', ''),
    'url': r.get('url', ''),
    'content': r.get('content', '')[:300]
} for r in all_results[:8]], indent=2)}

Target Role: {role}
Target Location: {location}

Return array of jobs:
[
  {{
    "company": "extracted company name",
    "role": "exact job title",
    "location": "{location}",
    "salary": "salary if mentioned or N/A",
    "job_url": "actual URL from results",
    "description": "2-3 sentence description",
    "required_skills": ["skill1", "skill2"],
    "job_type": "Full-time/Remote/Contract",
    "posted": "posting date if available",
    "source": "LinkedIn/Indeed/Company"
  }}
]

Extract real data from the results. If info not available use reasonable defaults.
Return maximum {count} jobs.
"""
        try:
            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": parse_prompt}],
                temperature=0.2,
                max_tokens=2000,
            )
            raw = response.choices[0].message.content
            raw = re.sub(r'```json\s*', '', raw)
            raw = re.sub(r'```\s*', '', raw)
            jobs = json.loads(raw.strip())
            if jobs and len(jobs) > 0:
                return jobs[:count]
        except Exception as e:
            print(f"Parse error: {e}")

    # Fallback: AI generated যদি Tavily কাজ না করে
    print("Falling back to AI generated jobs")
    return _generate_ai_jobs(role, location, skills, count)


def _generate_ai_jobs(role: str, location: str, skills: str, count: int) -> list[dict]:
    """Fallback: AI দিয়ে realistic jobs generate করো"""
    prompt = f"""
Generate {count} realistic job listings for:
Role: {role}, Location: {location}, Skills: {skills}

Output ONLY valid JSON array:
[
  {{
    "company": "Real Company Name",
    "role": "{role}",
    "location": "{location}",
    "salary": "$X - $Y",
    "job_url": "https://linkedin.com/jobs/view/example",
    "description": "2-3 sentence description",
    "required_skills": ["skill1", "skill2"],
    "job_type": "Full-time",
    "posted": "1 day ago",
    "source": "AI Generated"
  }}
]
"""
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=2000,
    )
    raw = response.choices[0].message.content
    raw = re.sub(r'```json\s*', '', raw)
    raw = re.sub(r'```\s*', '', raw)
    return json.loads(raw.strip())


def calculate_match_score(job: dict, user_skills: str) -> int:
    """Job এর সাথে user skills match করো"""

    user_skill_list = [s.strip().lower() for s in user_skills.split(',')]
    required = job.get('required_skills', [])
    role = job.get('role', '').lower()
    description = job.get('description', '').lower()

    # Direct skill match
    if required:
        required_lower = [s.lower() for s in required]
        matched = sum(1 for s in user_skill_list if any(s in r or r in s for r in required_lower))
        skill_score = int((matched / len(required_lower)) * 100) if required_lower else 50
    else:
        # Description থেকে match করো
        matched = sum(1 for s in user_skill_list if s in description or s in role)
        skill_score = min(90, 40 + matched * 10)

    return max(30, min(95, skill_score))