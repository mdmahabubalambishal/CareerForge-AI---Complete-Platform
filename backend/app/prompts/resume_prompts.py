GENERATE_RESUME_PROMPT = """
You are an expert ATS-optimized resume writer with 15+ years of experience.

Create a professional resume. Output ONLY valid JSON, no markdown, no explanation.

User Data:
{user_data}

Target Role: {target_role}
Target Company: {target_company}
Industry: {industry}

Return this exact JSON structure (use empty array/string if data not provided):
{{
  "personal": {{
    "full_name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "portfolio": ""
  }},
  "summary": "",
  "experience": [
    {{
      "title": "",
      "company": "",
      "location": "",
      "start_date": "",
      "end_date": "",
      "bullets": ["", ""]
    }}
  ],
  "education": [
    {{
      "degree": "",
      "institution": "",
      "year": "",
      "gpa": ""
    }}
  ],
  "skills": {{
    "technical": [],
    "tools": [],
    "soft": []
  }},
  "projects": [
    {{
      "name": "",
      "description": "",
      "tech_stack": [],
      "link": ""
    }}
  ],
  "certifications": [],
  "languages": [
    {{
      "language": "",
      "proficiency": ""
    }}
  ],
  "awards": [],
  "publications": [],
  "volunteer": [
    {{
      "role": "",
      "organization": "",
      "duration": "",
      "description": ""
    }}
  ],
  "references": []
}}

Rules:
- Use strong action verbs
- Quantify achievements with numbers
- Include keywords relevant to {target_role} in {industry}
- Only include sections that have data
- Make bullets achievement-focused
- ATS optimized for {industry} industry
"""
ATS_SCORE_PROMPT = """
You are an expert ATS (Applicant Tracking System) analyzer.

Analyze the following resume against the job description. Output ONLY valid JSON.

Resume:
{resume_text}

Job Description:
{job_description}

Return this exact JSON:
{{
  "overall_score": 85,
  "breakdown": {{
    "keyword_match": 80,
    "formatting": 90,
    "experience_relevance": 85,
    "skills_match": 80
  }},
  "matched_keywords": ["python", "fastapi"],
  "missing_keywords": ["kubernetes", "cuda"],
  "suggestions": [
    {{
      "section": "skills",
      "issue": "Missing Kubernetes",
      "fix": "Add Kubernetes to your skills section",
      "impact": "+5%"
    }}
  ],
  "grade": "A",
  "summary": "Strong match. Add 2-3 missing keywords to improve score."
}}

Score 0-100. Be accurate and strict.
"""

JD_MATCHER_PROMPT = """
You are a resume-to-job-description matching expert.

Compare this resume against the job description. Output ONLY valid JSON.

Resume:
{resume_text}

Job Description:
{jd_text}

Return:
{{
  "match_score": 72,
  "matched": ["Python", "LangChain", "FastAPI"],
  "missing": ["CUDA", "JAX", "Kubernetes"],
  "partial": ["TensorFlow"],
  "rewrite_suggestions": [
    {{
      "original": "Worked on ML models",
      "improved": "Developed and deployed 3 production ML models using PyTorch, reducing inference latency by 40%",
      "section": "experience"
    }}
  ],
  "overall_feedback": "Good match. Focus on adding infrastructure and GPU programming keywords."
}}
"""