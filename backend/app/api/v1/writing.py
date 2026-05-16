from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.security import verify_token
from app.core.config import settings
from groq import Groq

router = APIRouter()
client = Groq(api_key=settings.GROQ_API_KEY)


def ask_groq(prompt: str, max_tokens: int = 1000) -> str:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content.strip()


class CoverLetterRequest(BaseModel):
    candidate_info: str
    target_role: str
    target_company: Optional[str] = ""
    job_description: Optional[str] = ""


class SOPRequest(BaseModel):
    candidate_info: str
    purpose: str
    target: Optional[str] = ""
    program: Optional[str] = ""


class BioRequest(BaseModel):
    candidate_info: str
    platform: str = "LinkedIn"
    style: str = "LinkedIn"
    word_limit: int = 150


class ColdEmailRequest(BaseModel):
    sender_info: str
    target_person: str
    target_company: str
    goal: str


class ThankYouEmailRequest(BaseModel):
    candidate_info: str
    interviewer_name: str
    company: str
    role: str
    topics: Optional[str] = ""
    date: Optional[str] = "today"


class SalaryNegotiationRequest(BaseModel):
    candidate_info: str
    current_offer: str
    target_salary: str
    role: str
    company: str
    justification: Optional[str] = ""
    format_type: str = "email"


class JDTranslatorRequest(BaseModel):
    input_text: str
    task: str = "translate to Bengali"
    target_language: str = "Bengali"


class NetworkingMessageRequest(BaseModel):
    sender_info: str
    target_person: str
    platform: str = "LinkedIn"
    context: str
    goal: str
    message_type: str = "connection_request"


@router.post("/cover-letter")
async def generate_cover_letter(
    req: CoverLetterRequest,
    user_id: str = Depends(verify_token)
):
    prompt = f"""
You are an expert cover letter writer.
Write a compelling cover letter. Output ONLY the cover letter text.

Candidate: {req.candidate_info}
Target Role: {req.target_role}
Company: {req.target_company or 'the company'}
Job Description: {req.job_description or 'not provided'}

Rules:
- 3 paragraphs: Hook, Value, Call to action
- Under 300 words
- Strong opening, no generic phrases
"""
    try:
        result = ask_groq(prompt, 800)
        return {"result": result, "type": "cover_letter"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sop")
async def generate_sop(
    req: SOPRequest,
    user_id: str = Depends(verify_token)
):
    prompt = f"""
You are an expert SOP writer.
Write a Statement of Purpose. Output ONLY the letter text.

Candidate: {req.candidate_info}
Purpose: {req.purpose}
Institution: {req.target or 'the institution'}
Program: {req.program or 'the program'}

Rules:
- 4 paragraphs: Background, Motivation, Goals, Why this institution
- 400-500 words
"""
    try:
        result = ask_groq(prompt, 1000)
        return {"result": result, "type": "sop"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bio")
async def generate_bio(
    req: BioRequest,
    user_id: str = Depends(verify_token)
):
    prompt = f"""
You are a professional bio writer.
Write a {req.style} style bio for {req.platform}. Output ONLY the bio text.

Candidate: {req.candidate_info}
Word limit: {req.word_limit} words
"""
    try:
        result = ask_groq(prompt, 500)
        return {"result": result, "type": "bio"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cold-email")
async def generate_cold_email(
    req: ColdEmailRequest,
    user_id: str = Depends(verify_token)
):
    prompt = f"""
You are an expert at writing cold emails that get responses.
Write a cold email. Output subject line and body.

Sender: {req.sender_info}
Target: {req.target_person} at {req.target_company}
Goal: {req.goal}

Format:
Subject: [subject]

[body]

Rules: Under 150 words, value-first, one clear ask.
"""
    try:
        result = ask_groq(prompt, 600)
        return {"result": result, "type": "cold_email"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/thank-you-email")
async def generate_thank_you(
    req: ThankYouEmailRequest,
    user_id: str = Depends(verify_token)
):
    prompt = f"""
Write a post-interview thank you email. Output subject and body only.

Candidate: {req.candidate_info}
Interviewer: {req.interviewer_name}
Company: {req.company}
Role: {req.role}
Topics discussed: {req.topics or 'general interview'}

Rules: Under 150 words, reference a specific moment, reinforce one qualification.
"""
    try:
        result = ask_groq(prompt, 500)
        return {"result": result, "type": "thank_you_email"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/salary-negotiation")
async def generate_salary_negotiation(
    req: SalaryNegotiationRequest,
    user_id: str = Depends(verify_token)
):
    prompt = f"""
Write a salary negotiation {req.format_type}. Output ONLY the text.

Candidate: {req.candidate_info}
Current offer: {req.current_offer}
Target: {req.target_salary}
Role: {req.role} at {req.company}
Justification: {req.justification or 'market rate and experience'}

Rules: Confident, collaborative, grateful tone. Use market data framing.
"""
    try:
        result = ask_groq(prompt, 700)
        return {"result": result, "type": "salary_negotiation"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jd-translator")
async def translate_jd(
    req: JDTranslatorRequest,
    user_id: str = Depends(verify_token)
):
    prompt = f"""
Task: {req.task}
Target language: {req.target_language}

Input:
{req.input_text}

Rules:
- Keep technical terms in English
- Professional tone
- Output ONLY the translated text
"""
    try:
        result = ask_groq(prompt, 1500)
        return {"result": result, "type": "jd_translation"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/networking-message")
async def generate_networking_message(
    req: NetworkingMessageRequest,
    user_id: str = Depends(verify_token)
):
    prompt = f"""
Write a {req.message_type} message for {req.platform}. Output ONLY the message.

Sender: {req.sender_info}
Target: {req.target_person}
Context: {req.context}
Goal: {req.goal}

Rules: Personalized, warm but professional, one clear ask.
"""
    try:
        result = ask_groq(prompt, 500)
        return {"result": result, "type": "networking_message"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
class ReferralRequest(BaseModel):
    sender_info: str
    target_person: str
    target_company: str
    target_role: str
    relationship: str = "professional connection"
    platform: str = "LinkedIn"

class NOCRequest(BaseModel):
    employee_info: str
    company: str
    duration: str
    role: str
    purpose: str
    document_type: str = "NOC"

class FreelanceProfileRequest(BaseModel):
    platform: str
    freelancer_info: str
    skills: str
    target_clients: str = "businesses"

class MentorFinderRequest(BaseModel):
    mentee_info: str
    mentor_type: str
    goals: str
    platform: str = "LinkedIn"

class RecommendationLetterRequest(BaseModel):
    person_info: str
    recommender_info: str
    purpose: str
    strengths: str
    letter_type: str = "recommendation letter"


@router.post("/referral-request")
async def generate_referral(
    req: ReferralRequest,
    user_id: str = Depends(verify_token)
):
    from app.prompts.writing_prompts import REFERRAL_REQUEST_PROMPT
    prompt = REFERRAL_REQUEST_PROMPT.format(
        sender_info=req.sender_info,
        target_person=req.target_person,
        target_company=req.target_company,
        target_role=req.target_role,
        relationship=req.relationship,
        platform=req.platform,
    )
    try:
        result = ask_groq(prompt, 600)
        return {"result": result, "type": "referral_request"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/noc")
async def generate_noc(
    req: NOCRequest,
    user_id: str = Depends(verify_token)
):
    from app.prompts.writing_prompts import NOC_PROMPT
    prompt = NOC_PROMPT.format(
        document_type=req.document_type,
        employee_info=req.employee_info,
        company=req.company,
        duration=req.duration,
        role=req.role,
        purpose=req.purpose,
    )
    try:
        result = ask_groq(prompt, 800)
        return {"result": result, "type": "noc"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/freelance-profile")
async def optimize_freelance(
    req: FreelanceProfileRequest,
    user_id: str = Depends(verify_token)
):
    from app.prompts.writing_prompts import FREELANCE_PROFILE_PROMPT
    prompt = FREELANCE_PROFILE_PROMPT.format(
        platform=req.platform,
        freelancer_info=req.freelancer_info,
        skills=req.skills,
        target_clients=req.target_clients,
    )
    try:
        result = ask_groq(prompt, 1000)
        return {"result": result, "type": "freelance_profile"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mentor-finder")
async def mentor_finder(
    req: MentorFinderRequest,
    user_id: str = Depends(verify_token)
):
    from app.prompts.writing_prompts import MENTOR_FINDER_PROMPT
    prompt = MENTOR_FINDER_PROMPT.format(
        mentee_info=req.mentee_info,
        mentor_type=req.mentor_type,
        goals=req.goals,
        platform=req.platform,
    )
    try:
        result = ask_groq(prompt, 800)
        return {"result": result, "type": "mentor_finder"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommendation-letter")
async def recommendation_letter(
    req: RecommendationLetterRequest,
    user_id: str = Depends(verify_token)
):
    from app.prompts.writing_prompts import RECOMMENDATION_LETTER_PROMPT
    prompt = RECOMMENDATION_LETTER_PROMPT.format(
        letter_type=req.letter_type,
        person_info=req.person_info,
        recommender_info=req.recommender_info,
        purpose=req.purpose,
        strengths=req.strengths,
    )
    try:
        result = ask_groq(prompt, 1000)
        return {"result": result, "type": "recommendation_letter"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))