from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.security import verify_token
from app.core.config import settings
from groq import Groq
import json
import re

router = APIRouter()
client = Groq(api_key=settings.GROQ_API_KEY)


def ask_groq(prompt: str, max_tokens: int = 1500, json_mode: bool = False) -> str:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content.strip()


def clean_json(text: str) -> str:
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    return text.strip()


# ── Models ────────────────────────────────────────────────────────────────────

class CompanyQuestionsRequest(BaseModel):
    company: str
    role: str
    round_type: str = "technical"
    count: int = 5

class QuizRequest(BaseModel):
    role: str
    topic: str
    difficulty: str = "medium"
    count: int = 5

class CompanyResearchRequest(BaseModel):
    company: str
    role: Optional[str] = ""

class SkillGapQuizRequest(BaseModel):
    role: str
    current_skills: str
    count: int = 5

class EvaluateAnswerRequest(BaseModel):
    question: str
    answer: str
    role: str
    company: Optional[str] = ""


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/company-questions")
async def company_questions(
    req: CompanyQuestionsRequest,
    user_id: str = Depends(verify_token)
):
    prompt = f"""
You are an expert interview coach with knowledge of {req.company}'s interview process.

Generate {req.count} {req.round_type} interview questions for {req.role} at {req.company}.
Output ONLY valid JSON array.

Return:
[
  {{
    "question": "question text",
    "type": "technical/behavioral/system_design",
    "difficulty": "easy/medium/hard",
    "hint": "key points to cover",
    "sample_answer": "brief ideal answer"
  }}
]

Focus on real questions asked at {req.company}. Be specific to their tech stack and culture.
"""
    try:
        raw = ask_groq(prompt, 2000)
        data = json.loads(clean_json(raw))
        return {"questions": data, "company": req.company, "role": req.role}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quiz/generate")
async def generate_quiz(
    req: QuizRequest,
    user_id: str = Depends(verify_token)
):
    prompt = f"""
You are a technical interviewer creating a quiz.

Generate {req.count} {req.difficulty} level multiple choice questions about {req.topic} for a {req.role} role.
Output ONLY valid JSON array.

Return:
[
  {{
    "question": "question text",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correct": "A",
    "explanation": "why this is correct"
  }}
]
"""
    try:
        raw = ask_groq(prompt, 2000)
        data = json.loads(clean_json(raw))
        return {"questions": data, "topic": req.topic, "difficulty": req.difficulty}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/company-research")
async def company_research(
    req: CompanyResearchRequest,
    user_id: str = Depends(verify_token)
):
    prompt = f"""
You are a company research expert helping candidates prepare for interviews.

Research {req.company} for a candidate applying for {req.role or 'a technical role'}.
Output ONLY valid JSON.

Return:
{{
  "overview": "2-3 sentence company overview",
  "founded": "year",
  "size": "company size",
  "tech_stack": ["tech1", "tech2"],
  "culture": ["culture point 1", "culture point 2", "culture point 3"],
  "recent_news": ["news1", "news2"],
  "interview_process": ["step1", "step2", "step3"],
  "tips": ["tip1", "tip2", "tip3"],
  "glassdoor_rating": "4.2/5",
  "known_for": ["thing1", "thing2"]
}}
"""
    try:
        raw = ask_groq(prompt, 1500)
        data = json.loads(clean_json(raw))
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/skill-gap-quiz")
async def skill_gap_quiz(
    req: SkillGapQuizRequest,
    user_id: str = Depends(verify_token)
):
    prompt = f"""
You are a skill assessment expert.

Create a skill gap quiz for someone targeting {req.role} role.
Their current skills: {req.current_skills}

Generate {req.count} diagnostic questions to identify skill gaps.
Output ONLY valid JSON array.

Return:
[
  {{
    "question": "question text",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correct": "A",
    "skill_tested": "skill name",
    "explanation": "explanation",
    "resource": "where to learn this"
  }}
]
"""
    try:
        raw = ask_groq(prompt, 2000)
        data = json.loads(clean_json(raw))
        return {"questions": data, "role": req.role}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate-answer")
async def evaluate_answer(
    req: EvaluateAnswerRequest,
    user_id: str = Depends(verify_token)
):
    prompt = f"""
You are an expert interview evaluator at {req.company or 'a top tech company'}.

Evaluate this interview answer for a {req.role} position.
Output ONLY valid JSON.

Question: {req.question}
Candidate's Answer: {req.answer}

Return:
{{
  "score": 75,
  "grade": "B+",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "ideal_answer": "what a perfect answer would include",
  "follow_up_questions": ["follow up 1", "follow up 2"],
  "feedback": "overall constructive feedback"
}}
"""
    try:
        raw = ask_groq(prompt, 1000)
        data = json.loads(clean_json(raw))
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class RoleSkillsRequest(BaseModel):
    role: str

@router.post("/role-skills")
async def get_role_skills(
    req: RoleSkillsRequest,
    user_id: str = Depends(verify_token)
):
    prompt = f"""List the top 12 most important technical skills for a {req.role} position.
Output ONLY a JSON array. No explanation, no markdown.
Example: ["Python", "Docker", "SQL"]
Return 12 skills for {req.role}:"""
    try:
        raw = ask_groq(prompt, 300)
        skills = json.loads(clean_json(raw))
        return {"skills": skills[:12]}
    except Exception:
        return {"skills": ["Python", "Problem Solving", "Git", "SQL", "APIs", "Testing", "Documentation", "Linux", "Cloud", "Databases", "Communication", "Algorithms"]}