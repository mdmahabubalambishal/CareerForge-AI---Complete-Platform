import json
import re
from groq import Groq
from app.core.config import settings
from app.prompts.writing_prompts import (
    COVER_LETTER_PROMPT,
    SOP_PROMPT,
    BIO_PROMPT,
    COLD_EMAIL_PROMPT,
    THANK_YOU_EMAIL_PROMPT,
    SALARY_NEGOTIATION_PROMPT,
    JD_TRANSLATOR_PROMPT,
)

client = Groq(api_key=settings.GROQ_API_KEY)


def _call_groq(prompt: str, max_tokens: int = 1500) -> str:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content.strip()


def generate_cover_letter(
    candidate_info: dict,
    job_title: str,
    company: str,
    job_description: str = ""
) -> str:
    prompt = COVER_LETTER_PROMPT.format(
        candidate_info=json.dumps(candidate_info, indent=2),
        job_title=job_title,
        company=company,
        job_description=job_description or "Not provided",
    )
    return _call_groq(prompt)


def generate_sop(
    candidate_info: dict,
    target: str,
    institution: str,
    purpose_type: str = "job"
) -> str:
    prompt = SOP_PROMPT.format(
        candidate_info=json.dumps(candidate_info, indent=2),
        target=target,
        institution=institution,
        purpose_type=purpose_type,
    )
    return _call_groq(prompt, max_tokens=2000)


def generate_bio(
    candidate_info: dict,
    platform: str = "LinkedIn",
    length: str = "medium",
    tone: str = "professional"
) -> str:
    prompt = BIO_PROMPT.format(
        candidate_info=json.dumps(candidate_info, indent=2),
        platform=platform,
        length=length,
        tone=tone,
    )
    return _call_groq(prompt, max_tokens=500)


def generate_cold_email(
    sender_info: dict,
    target_name: str,
    target_company: str,
    target_role: str,
    purpose: str,
    tone: str = "professional"
) -> str:
    prompt = COLD_EMAIL_PROMPT.format(
        sender_info=json.dumps(sender_info, indent=2),
        target_name=target_name,
        target_company=target_company,
        target_role=target_role,
        purpose=purpose,
        tone=tone,
    )
    return _call_groq(prompt)


def generate_thank_you_email(
    candidate_info: dict,
    interviewer_name: str,
    company: str,
    role: str,
    topics: str = ""
) -> str:
    prompt = THANK_YOU_EMAIL_PROMPT.format(
        candidate_info=json.dumps(candidate_info, indent=2),
        interviewer_name=interviewer_name,
        company=company,
        role=role,
        topics=topics or "general discussion about the role",
    )
    return _call_groq(prompt)


def generate_salary_negotiation(
    candidate_info: dict,
    current_offer: str,
    target_salary: str,
    company: str,
    role: str,
    market_data: str = ""
) -> str:
    prompt = SALARY_NEGOTIATION_PROMPT.format(
        candidate_info=json.dumps(candidate_info, indent=2),
        current_offer=current_offer,
        target_salary=target_salary,
        company=company,
        role=role,
        market_data=market_data or "Market average for similar roles",
    )
    return _call_groq(prompt)


def translate_jd(
    jd_text: str,
    task: str = "translate",
    source_lang: str = "English",
    target_lang: str = "Bengali"
) -> str:
    prompt = JD_TRANSLATOR_PROMPT.format(
        jd_text=jd_text,
        task=task,
        source_lang=source_lang,
        target_lang=target_lang,
    )
    return _call_groq(prompt, max_tokens=2000)