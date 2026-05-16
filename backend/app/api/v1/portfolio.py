from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from app.core.security import verify_token
from app.db.supabase_client import supabase
from app.core.config import settings
from groq import Groq
import re, random, string

router = APIRouter()
client = Groq(api_key=settings.GROQ_API_KEY)


# ── Request Models ─────────────────────────────────────────────────────────────
class PortfolioGenerateRequest(BaseModel):
    resume_id: Optional[str] = None
    manual_data: Optional[dict] = None
    theme: str = "dark"
    photo_url: Optional[str] = None

class PortfolioUpdateRequest(BaseModel):
    data: dict
    theme: str = "dark"
    photo_url: Optional[str] = None

class PortfolioSettingsRequest(BaseModel):
    is_public: Optional[bool] = None
    custom_domain: Optional[str] = None
    slug: Optional[str] = None


# ── Slug helpers ───────────────────────────────────────────────────────────────
def generate_slug(name: str) -> str:
    """নাম থেকে URL-safe slug তৈরি করো"""
    slug = re.sub(r'[^a-z0-9\s-]', '', name.lower())
    slug = re.sub(r'\s+', '-', slug.strip())
    slug = re.sub(r'-+', '-', slug)
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"{slug}-{suffix}" if slug else suffix


# ── Theme Palettes ─────────────────────────────────────────────────────────────
THEMES = {
    "dark": {
        "bg": "#080b10", "bg2": "#0d1117", "surface": "#111820",
        "surface2": "#161e28", "border": "#1e2d3d",
        "accent": "#38bdf8", "accent2": "#818cf8", "green": "#34d399",
        "text": "#e2eaf4", "muted": "#4d6880", "muted2": "#8ba3ba",
        "grad_start": "#38bdf8", "grad_end": "#818cf8",
    },
    "light": {
        "bg": "#f0f4f8", "bg2": "#ffffff", "surface": "#ffffff",
        "surface2": "#f8fafc", "border": "#dde6ef",
        "accent": "#0ea5e9", "accent2": "#6366f1", "green": "#059669",
        "text": "#0f172a", "muted": "#94a3b8", "muted2": "#64748b",
        "grad_start": "#0ea5e9", "grad_end": "#6366f1",
    },
    "midnight": {
        "bg": "#06040f", "bg2": "#0d0a1a", "surface": "#130f24",
        "surface2": "#1a1530", "border": "#2d2550",
        "accent": "#a78bfa", "accent2": "#f472b6", "green": "#34d399",
        "text": "#ede9fe", "muted": "#6b5fa0", "muted2": "#9d8fc4",
        "grad_start": "#a78bfa", "grad_end": "#f472b6",
    },
    "ocean": {
        "bg": "#020d14", "bg2": "#041624", "surface": "#071e2e",
        "surface2": "#0a2540", "border": "#0e3356",
        "accent": "#06b6d4", "accent2": "#0ea5e9", "green": "#34d399",
        "text": "#e0f7fa", "muted": "#164e63", "muted2": "#4ea8be",
        "grad_start": "#06b6d4", "grad_end": "#6366f1",
    },
    "forest": {
        "bg": "#030a04", "bg2": "#071008", "surface": "#0c1a0e",
        "surface2": "#102214", "border": "#1a3620",
        "accent": "#4ade80", "accent2": "#86efac", "green": "#34d399",
        "text": "#dcfce7", "muted": "#14532d", "muted2": "#4ade80",
        "grad_start": "#4ade80", "grad_end": "#06b6d4",
    },
    "sunset": {
        "bg": "#0f0605", "bg2": "#1a0b08", "surface": "#220f0a",
        "surface2": "#2d1510", "border": "#4a1f15",
        "accent": "#fb923c", "accent2": "#f43f5e", "green": "#34d399",
        "text": "#fff7ed", "muted": "#7c2d12", "muted2": "#c2714f",
        "grad_start": "#fb923c", "grad_end": "#f43f5e",
    },
    "rose": {
        "bg": "#0f0509", "bg2": "#1a0810", "surface": "#220c16",
        "surface2": "#2d101d", "border": "#4a1828",
        "accent": "#fb7185", "accent2": "#e879f9", "green": "#34d399",
        "text": "#fff1f2", "muted": "#881337", "muted2": "#c45c77",
        "grad_start": "#fb7185", "grad_end": "#e879f9",
    },
}


# ── HTML Generator ─────────────────────────────────────────────────────────────
def generate_portfolio_html(data: dict, theme: str = "dark", photo_url: Optional[str] = None) -> str:
    t = THEMES.get(theme, THEMES["dark"])
    bg, bg2, surface, surface2 = t["bg"], t["bg2"], t["surface"], t["surface2"]
    border = t["border"]
    accent, accent2, green = t["accent"], t["accent2"], t["green"]
    text, muted, muted2 = t["text"], t["muted"], t["muted2"]
    grad_start, grad_end = t["grad_start"], t["grad_end"]

    personal    = data.get("personal", {})
    skills      = data.get("skills", {})
    projects    = data.get("projects", [])
    experience  = data.get("experience", [])
    education   = data.get("education", [])
    testimonials = data.get("testimonials", [])
    summary     = data.get("summary", "")
    title       = personal.get("title", "Software Engineer")

    tech_skills = skills.get("technical", [])
    tool_skills = skills.get("tools", [])
    soft_skills = skills.get("soft", [])

    name         = personal.get("full_name", "Portfolio")
    first_name   = name.split()[0] if name else "Portfolio"
    email        = personal.get("email", "")
    phone        = personal.get("phone", "")
    location     = personal.get("location", "")
    linkedin     = personal.get("linkedin", "")
    github       = personal.get("github", "")
    portfolio_url = personal.get("portfolio", "")

    # Photo
    if photo_url:
        photo_html = f'<img src="{photo_url}" alt="{name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
    else:
        initials = "".join(p[0].upper() for p in name.split()[:2]) if name else "?"
        photo_html = f'<span style="font-size:48px;font-weight:800;color:{accent};">{initials}</span>'

    def badge(s, color, bg_color):
        return f'<span style="background:{bg_color};color:{color};border:1px solid {color}30;padding:6px 16px;border-radius:100px;font-size:12px;font-weight:600;letter-spacing:0.5px;">{s}</span>'

    tech_badges = " ".join(badge(s, accent, f"{accent}15") for s in tech_skills)
    tool_badges = " ".join(badge(s, accent2, f"{accent2}15") for s in tool_skills)
    soft_badges = " ".join(badge(s, green, f"{green}15") for s in soft_skills)

    skills_section = ""
    if tech_skills or tool_skills or soft_skills:
        skills_section = f"""
        <section id="skills" class="section">
          <div class="container">
            <div class="section-header">
              <span class="section-tag">Expertise</span>
              <h2 class="section-title">Skills & Technologies</h2>
            </div>
            <div class="skills-wrapper">
              {f'<div class="skill-group"><h4 class="skill-group-title" style="color:{accent};">Technical Skills</h4><div class="badges-row">{tech_badges}</div></div>' if tech_skills else ''}
              {f'<div class="skill-group"><h4 class="skill-group-title" style="color:{accent2};">Tools & Platforms</h4><div class="badges-row">{tool_badges}</div></div>' if tool_skills else ''}
              {f'<div class="skill-group"><h4 class="skill-group-title" style="color:{green};">Soft Skills</h4><div class="badges-row">{soft_badges}</div></div>' if soft_skills else ''}
            </div>
          </div>
        </section>"""

    projects_html = ""
    for i, proj in enumerate(projects):
        tech_tags = " ".join(f'<span style="background:{accent}12;color:{accent};padding:3px 12px;border-radius:100px;font-size:11px;font-weight:700;">{t2}</span>' for t2 in proj.get("tech_stack", []))
        link = proj.get("link", ""); gh = proj.get("github", "")
        links = ""
        if link: links += f'<a href="{link}" target="_blank" class="proj-btn" style="color:{accent};border-color:{accent}30;">Live Demo ↗</a>'
        if gh:   links += f'<a href="{gh}"   target="_blank" class="proj-btn" style="color:{muted2};border-color:{border};">GitHub ↗</a>'
        img = proj.get("image", "")
        img_html = f'<div class="proj-img"><img src="{img}" alt="{proj.get("name","")}" style="width:100%;height:100%;object-fit:cover;"></div>' if img else f'<div class="proj-img proj-img-placeholder"><span style="font-size:40px;font-weight:900;color:{border};">{str(i+1).zfill(2)}</span></div>'
        projects_html += f"""
        <div class="proj-card">
          {img_html}
          <div class="proj-body">
            <div class="proj-tags">{tech_tags}</div>
            <h3 class="proj-name">{proj.get('name','')}</h3>
            <p class="proj-desc">{proj.get('description','')}</p>
            <div class="proj-links">{links}</div>
          </div>
        </div>"""

    projects_section = f"""
        <section id="projects" class="section section-alt">
          <div class="container">
            <div class="section-header"><span class="section-tag">Work</span><h2 class="section-title">Featured Projects</h2></div>
            <div class="projects-grid">{projects_html}</div>
          </div>
        </section>""" if projects else ""

    experience_html = ""
    for i, exp in enumerate(experience):
        bullets = "".join(f'<li class="exp-bullet">{b}</li>' for b in exp.get("bullets", []))
        connector = '<div class="timeline-connector"></div>' if i < len(experience) - 1 else ""
        experience_html += f"""
        <div class="timeline-item">
          <div class="timeline-dot" style="background:{accent};box-shadow:0 0 0 4px {accent}20;"></div>
          {connector}
          <div class="timeline-card">
            <div class="timeline-header">
              <div><h3 class="exp-title">{exp.get('title','')}</h3><p class="exp-company" style="color:{accent};">{exp.get('company','')} {f'· {exp.get("location","")}' if exp.get('location') else ''}</p></div>
              <span class="exp-date">{exp.get('start_date','')} – {exp.get('end_date','Present')}</span>
            </div>
            {f'<ul class="exp-bullets">{bullets}</ul>' if bullets else ''}
          </div>
        </div>"""

    experience_section = f"""
        <section id="experience" class="section">
          <div class="container">
            <div class="section-header"><span class="section-tag">Career</span><h2 class="section-title">Work Experience</h2></div>
            <div class="timeline">{experience_html}</div>
          </div>
        </section>""" if experience else ""

    education_html = ""
    for edu in education:
        education_html += f"""
        <div class="edu-card">
          <div class="edu-icon" style="background:{accent2}15;color:{accent2};">🎓</div>
          <div class="edu-body">
            <h3 class="edu-degree">{edu.get('degree','')} {f'in {edu.get("field","")}' if edu.get('field') else ''}</h3>
            <p class="edu-school" style="color:{accent2};">{edu.get('institution','')}</p>
            <p class="edu-year">{edu.get('start_year','')} {f'– {edu.get("end_year","")}' if edu.get('end_year') else ''}</p>
            {f'<p class="edu-grade">GPA: {edu.get("gpa")}</p>' if edu.get('gpa') else ''}
          </div>
        </div>"""

    education_section = f"""
        <section id="education" class="section section-alt">
          <div class="container">
            <div class="section-header"><span class="section-tag">Background</span><h2 class="section-title">Education</h2></div>
            <div class="edu-grid">{education_html}</div>
          </div>
        </section>""" if education else ""

    testimonials_html = ""
    for t2 in testimonials:
        testimonials_html += f"""
        <div class="testimonial-card">
          <div class="testimonial-quote" style="color:{accent};">❝</div>
          <p class="testimonial-text">{t2.get('text','')}</p>
          <div class="testimonial-author">
            <div class="testimonial-avatar" style="background:{accent}20;color:{accent};">{t2.get('name','?')[0].upper()}</div>
            <div><p class="testimonial-name">{t2.get('name','')}</p><p class="testimonial-role">{t2.get('role','')} {f'at {t2.get("company","")}' if t2.get('company') else ''}</p></div>
          </div>
        </div>"""

    testimonials_section = f"""
        <section id="testimonials" class="section">
          <div class="container">
            <div class="section-header"><span class="section-tag">Testimonials</span><h2 class="section-title">What People Say</h2></div>
            <div class="testimonials-grid">{testimonials_html}</div>
          </div>
        </section>""" if testimonials else ""

    contact_links = ""
    if email:    contact_links += f'<a href="mailto:{email}" class="contact-card"><span class="contact-icon">📧</span><div><p class="contact-label">Email</p><p class="contact-val">{email}</p></div></a>'
    if phone:    contact_links += f'<a href="tel:{phone}" class="contact-card"><span class="contact-icon">📱</span><div><p class="contact-label">Phone</p><p class="contact-val">{phone}</p></div></a>'
    if location: contact_links += f'<div class="contact-card"><span class="contact-icon">📍</span><div><p class="contact-label">Location</p><p class="contact-val">{location}</p></div></div>'
    if linkedin: contact_links += f'<a href="{linkedin}" target="_blank" class="contact-card"><span class="contact-icon">🔗</span><div><p class="contact-label">LinkedIn</p><p class="contact-val">Connect</p></div></a>'
    if github:   contact_links += f'<a href="{github}" target="_blank" class="contact-card"><span class="contact-icon">🐙</span><div><p class="contact-label">GitHub</p><p class="contact-val">Follow</p></div></a>'

    social_nav = ""
    if github:   social_nav += f'<a href="{github}" target="_blank" class="nav-social">GH</a>'
    if linkedin: social_nav += f'<a href="{linkedin}" target="_blank" class="nav-social">LI</a>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{name} — Portfolio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet">
<style>
:root {{
  --bg:{bg};--bg2:{bg2};--surface:{surface};--sf2:{surface2};
  --border:{border};--accent:{accent};--accent2:{accent2};--green:{green};
  --text:{text};--muted:{muted};--muted2:{muted2};
  --grad:linear-gradient(135deg,{grad_start},{grad_end});
}}
*,*::before,*::after{{margin:0;padding:0;box-sizing:border-box;}}
html{{scroll-behavior:smooth;}}
body{{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;font-weight:300;line-height:1.7;-webkit-font-smoothing:antialiased;}}
a{{color:inherit;text-decoration:none;}}
::-webkit-scrollbar{{width:4px;}}..::-webkit-scrollbar-track{{background:var(--bg);}}..::-webkit-scrollbar-thumb{{background:var(--border);border-radius:2px;}}
nav{{position:fixed;top:0;left:0;right:0;z-index:100;background:{bg}e0;backdrop-filter:blur(24px);border-bottom:1px solid var(--border);height:64px;display:flex;align-items:center;}}
.nav-inner{{max-width:1100px;margin:0 auto;padding:0 32px;width:100%;display:flex;justify-content:space-between;align-items:center;}}
.nav-logo{{font-family:'Syne',sans-serif;font-weight:800;font-size:20px;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}}
.nav-links{{display:flex;gap:32px;align-items:center;}}
.nav-links a{{font-size:13px;font-weight:400;color:var(--muted2);transition:color .2s;}}
.nav-links a:hover{{color:var(--accent);}}
.nav-social{{font-size:11px;font-weight:700;color:var(--muted);border:1px solid var(--border);padding:4px 10px;border-radius:6px;transition:all .2s;letter-spacing:1px;}}
.nav-social:hover{{color:var(--accent);border-color:var(--accent);}}
.hero{{min-height:100vh;display:flex;align-items:center;padding:100px 32px 80px;position:relative;overflow:hidden;}}
.hero-bg{{position:absolute;inset:0;z-index:0;background:radial-gradient(ellipse 80% 60% at 60% 40%,{accent}08 0%,transparent 70%),radial-gradient(ellipse 50% 50% at 20% 80%,{accent2}06 0%,transparent 60%);}}
.hero-grid{{position:absolute;inset:0;z-index:0;background-image:linear-gradient({border}40 1px,transparent 1px),linear-gradient(90deg,{border}40 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 0%,transparent 100%);}}
.hero-inner{{max-width:1100px;margin:0 auto;width:100%;display:grid;grid-template-columns:1fr auto;gap:80px;align-items:center;position:relative;z-index:1;}}
.hero-badge{{display:inline-flex;align-items:center;gap:8px;background:{accent}12;border:1px solid {accent}30;padding:6px 16px;border-radius:100px;margin-bottom:24px;font-size:12px;font-weight:500;color:var(--accent);letter-spacing:0.5px;}}
.hero-badge::before{{content:'';width:6px;height:6px;border-radius:50%;background:var(--accent);animation:pulse 2s infinite;}}
@keyframes pulse{{0%,100%{{opacity:1;transform:scale(1);}}50%{{opacity:0.5;transform:scale(1.3);}}}}
.hero-title{{font-family:'Syne',sans-serif;font-size:clamp(40px,5vw,72px);font-weight:800;line-height:1.05;letter-spacing:-2px;margin-bottom:20px;}}
.hero-title .grad-text{{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}}
.hero-subtitle{{font-size:18px;color:var(--muted2);font-weight:400;margin-bottom:12px;}}
.hero-summary{{font-size:16px;color:var(--muted);max-width:520px;line-height:1.8;margin-bottom:40px;}}
.hero-cta{{display:flex;gap:12px;flex-wrap:wrap;}}
.btn-primary{{background:var(--grad);color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:500;transition:opacity .2s,transform .2s;border:none;cursor:pointer;}}
.btn-primary:hover{{opacity:0.88;transform:translateY(-1px);}}
.btn-ghost{{background:transparent;color:var(--text);padding:12px 28px;border-radius:10px;border:1px solid var(--border);font-size:14px;font-weight:400;transition:border-color .2s,color .2s,transform .2s;}}
.btn-ghost:hover{{border-color:var(--accent);color:var(--accent);transform:translateY(-1px);}}
.hero-photo-wrap{{width:220px;height:220px;flex-shrink:0;position:relative;}}
.hero-photo{{width:220px;height:220px;border-radius:50%;background:var(--surface);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;z-index:1;}}
.hero-photo-ring{{position:absolute;inset:-12px;border-radius:50%;border:1px dashed {accent}40;animation:spin 20s linear infinite;}}
.hero-photo-ring2{{position:absolute;inset:-24px;border-radius:50%;border:1px dashed {accent2}25;animation:spin 30s linear infinite reverse;}}
@keyframes spin{{to{{transform:rotate(360deg);}}}}
.hero-stats{{display:flex;gap:40px;margin-top:48px;padding-top:40px;border-top:1px solid var(--border);}}
.stat-num{{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--text);}}
.stat-num span{{color:var(--accent);}}
.stat-label{{font-size:12px;color:var(--muted);letter-spacing:0.5px;margin-top:2px;}}
.section{{padding:100px 32px;}}
.section-alt{{background:var(--bg2);}}
.container{{max-width:1100px;margin:0 auto;}}
.section-header{{margin-bottom:56px;}}
.section-tag{{font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--accent);display:block;margin-bottom:10px;}}
.section-title{{font-family:'Syne',sans-serif;font-size:clamp(28px,3vw,44px);font-weight:800;letter-spacing:-1.5px;color:var(--text);}}
.about-grid{{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;}}
.about-text{{font-size:16px;color:var(--muted2);line-height:1.9;}}
.about-cards{{display:grid;grid-template-columns:1fr 1fr;gap:16px;}}
.about-card{{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;transition:border-color .2s;}}
.about-card:hover{{border-color:var(--accent);}}
.about-card-icon{{font-size:24px;margin-bottom:10px;}}
.about-card-title{{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;margin-bottom:4px;}}
.about-card-text{{font-size:12px;color:var(--muted);line-height:1.6;}}
.skills-wrapper{{display:flex;flex-direction:column;gap:32px;}}
.skill-group-title{{font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;}}
.badges-row{{display:flex;flex-wrap:wrap;gap:8px;}}
.projects-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;}}
.proj-card{{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;transition:transform .3s,border-color .3s,box-shadow .3s;}}
.proj-card:hover{{transform:translateY(-4px);border-color:{accent}50;box-shadow:0 20px 60px {accent}10;}}
.proj-img{{height:180px;overflow:hidden;border-bottom:1px solid var(--border);}}
.proj-img img{{transition:transform .4s;width:100%;height:100%;object-fit:cover;}}
.proj-card:hover .proj-img img{{transform:scale(1.04);}}
.proj-img-placeholder{{display:flex;align-items:center;justify-content:center;background:var(--sf2);height:180px;}}
.proj-body{{padding:24px;}}
.proj-tags{{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;}}
.proj-name{{font-family:'Syne',sans-serif;font-size:18px;font-weight:700;margin-bottom:10px;letter-spacing:-0.3px;}}
.proj-desc{{font-size:13px;color:var(--muted2);line-height:1.7;margin-bottom:18px;}}
.proj-links{{display:flex;gap:10px;}}
.proj-btn{{font-size:12px;font-weight:600;padding:6px 16px;border-radius:8px;border:1px solid;transition:opacity .2s;}}
.proj-btn:hover{{opacity:0.7;}}
.timeline{{position:relative;padding-left:32px;}}
.timeline-item{{position:relative;padding-bottom:40px;}}
.timeline-item:last-child{{padding-bottom:0;}}
.timeline-dot{{position:absolute;left:-39px;top:6px;width:14px;height:14px;border-radius:50%;}}
.timeline-connector{{position:absolute;left:-33px;top:20px;width:2px;bottom:0;background:linear-gradient(to bottom,var(--accent),{border});}}
.timeline-card{{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;transition:border-color .2s;}}
.timeline-card:hover{{border-color:{accent}40;}}
.timeline-header{{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap;gap:8px;}}
.exp-title{{font-family:'Syne',sans-serif;font-size:16px;font-weight:700;}}
.exp-company{{font-size:13px;margin-top:2px;}}
.exp-date{{font-size:12px;color:var(--muted);background:var(--sf2);padding:4px 12px;border-radius:100px;border:1px solid var(--border);white-space:nowrap;}}
.exp-bullets{{padding-left:18px;}}
.exp-bullet{{font-size:13px;color:var(--muted2);margin-bottom:6px;line-height:1.6;}}
.edu-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;}}
.edu-card{{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;display:flex;gap:16px;align-items:flex-start;transition:border-color .2s;}}
.edu-card:hover{{border-color:{accent2}50;}}
.edu-icon{{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}}
.edu-degree{{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;margin-bottom:4px;}}
.edu-school{{font-size:13px;margin-bottom:4px;}}
.edu-year{{font-size:12px;color:var(--muted);}}
.edu-grade{{font-size:12px;color:var(--green);margin-top:4px;}}
.testimonials-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;}}
.testimonial-card{{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;transition:border-color .2s,transform .2s;}}
.testimonial-card:hover{{border-color:{accent}40;transform:translateY(-2px);}}
.testimonial-quote{{font-size:40px;line-height:1;margin-bottom:12px;opacity:0.6;}}
.testimonial-text{{font-size:14px;color:var(--muted2);line-height:1.8;font-style:italic;margin-bottom:20px;}}
.testimonial-author{{display:flex;gap:12px;align-items:center;}}
.testimonial-avatar{{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0;}}
.testimonial-name{{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;}}
.testimonial-role{{font-size:12px;color:var(--muted);}}
.contact-wrapper{{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;}}
.contact-intro{{font-size:16px;color:var(--muted2);line-height:1.8;margin-bottom:32px;}}
.contact-cards{{display:flex;flex-direction:column;gap:12px;}}
.contact-card{{display:flex;gap:16px;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 20px;transition:border-color .2s;}}
.contact-card:hover{{border-color:var(--accent);}}
.contact-icon{{font-size:20px;}}
.contact-label{{font-size:11px;color:var(--muted);letter-spacing:0.5px;margin-bottom:2px;}}
.contact-val{{font-size:14px;font-weight:500;}}
.contact-form{{display:flex;flex-direction:column;gap:16px;}}
.form-group{{display:flex;flex-direction:column;gap:6px;}}
.form-label{{font-size:12px;font-weight:500;color:var(--muted2);letter-spacing:0.3px;}}
.form-input,.form-textarea{{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 16px;font-size:14px;color:var(--text);font-family:'DM Sans',sans-serif;transition:border-color .2s;outline:none;resize:none;}}
.form-input:focus,.form-textarea:focus{{border-color:var(--accent);}}
.form-textarea{{min-height:120px;}}
.form-submit{{background:var(--grad);color:#fff;padding:14px 32px;border-radius:10px;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity .2s,transform .2s;}}
.form-submit:hover{{opacity:0.88;transform:translateY(-1px);}}
footer{{border-top:1px solid var(--border);padding:32px;text-align:center;}}
footer p{{font-size:13px;color:var(--muted);}}
footer span{{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:600;}}
@media(max-width:768px){{
  .hero-inner{{grid-template-columns:1fr;text-align:center;}}
  .hero-photo-wrap{{display:none;}}
  .hero-cta{{justify-content:center;}}
  .hero-stats{{justify-content:center;gap:24px;}}
  .about-grid{{grid-template-columns:1fr;gap:40px;}}
  .contact-wrapper{{grid-template-columns:1fr;gap:40px;}}
  .nav-links .nav-link-hide{{display:none;}}
  .section{{padding:60px 20px;}}
}}
</style>
</head>
<body>
<nav>
  <div class="nav-inner">
    <div class="nav-logo">{first_name}.</div>
    <div class="nav-links">
      <a href="#about" class="nav-link-hide">About</a>
      <a href="#skills" class="nav-link-hide">Skills</a>
      <a href="#projects" class="nav-link-hide">Projects</a>
      <a href="#experience" class="nav-link-hide">Experience</a>
      <a href="#contact" class="nav-link-hide">Contact</a>
      {social_nav}
    </div>
  </div>
</nav>

<div class="hero">
  <div class="hero-bg"></div>
  <div class="hero-grid"></div>
  <div class="hero-inner">
    <div>
      <div class="hero-badge">Available for opportunities</div>
      <h1 class="hero-title">Hi, I'm<br><span class="grad-text">{name}</span></h1>
      <p class="hero-subtitle">{title}</p>
      <p class="hero-summary">{summary or "Passionate about building exceptional digital experiences with clean code and thoughtful design."}</p>
      <div class="hero-cta">
        {f'<a href="mailto:{email}" class="btn-primary">Get In Touch</a>' if email else ''}
        {f'<a href="{github}" target="_blank" class="btn-ghost">View GitHub</a>' if github else ''}
        {f'<a href="{linkedin}" target="_blank" class="btn-ghost">LinkedIn</a>' if linkedin else ''}
      </div>
      {f'''<div class="hero-stats">
        <div><div class="stat-num">{len(experience)}<span>+</span></div><div class="stat-label">EXPERIENCES</div></div>
        <div><div class="stat-num">{len(projects)}<span>+</span></div><div class="stat-label">PROJECTS</div></div>
        <div><div class="stat-num">{len(tech_skills)+len(tool_skills)}<span>+</span></div><div class="stat-label">SKILLS</div></div>
      </div>''' if experience or projects else ''}
    </div>
    <div class="hero-photo-wrap">
      <div class="hero-photo-ring2"></div>
      <div class="hero-photo-ring"></div>
      <div class="hero-photo">{photo_html}</div>
    </div>
  </div>
</div>

<section id="about" class="section section-alt">
  <div class="container">
    <div class="section-header"><span class="section-tag">About Me</span><h2 class="section-title">Who I Am</h2></div>
    <div class="about-grid">
      <p class="about-text">{summary or "I'm a passionate developer who loves building things that make a difference."}</p>
      <div class="about-cards">
        <div class="about-card"><div class="about-card-icon">💡</div><div class="about-card-title">Problem Solver</div><div class="about-card-text">Turning complex challenges into elegant solutions</div></div>
        <div class="about-card"><div class="about-card-icon">🚀</div><div class="about-card-title">Fast Learner</div><div class="about-card-text">Always keeping up with the latest technologies</div></div>
        <div class="about-card"><div class="about-card-icon">🎯</div><div class="about-card-title">Detail Focused</div><div class="about-card-text">Pixel-perfect execution with clean code</div></div>
        <div class="about-card"><div class="about-card-icon">🤝</div><div class="about-card-title">Team Player</div><div class="about-card-text">Collaborative mindset, clear communication</div></div>
      </div>
    </div>
  </div>
</section>

{skills_section}
{projects_section}
{experience_section}
{education_section}
{testimonials_section}

<section id="contact" class="section">
  <div class="container">
    <div class="section-header"><span class="section-tag">Contact</span><h2 class="section-title">Let's Work Together</h2></div>
    <div class="contact-wrapper">
      <div>
        <p class="contact-intro">I'm always open to discussing new opportunities, interesting projects, or just having a great conversation about tech.</p>
        <div class="contact-cards">{contact_links}</div>
      </div>
      <form class="contact-form" onsubmit="handleContact(event)">
        <div class="form-group"><label class="form-label">YOUR NAME</label><input type="text" class="form-input" placeholder="John Doe" required></div>
        <div class="form-group"><label class="form-label">EMAIL ADDRESS</label><input type="email" class="form-input" placeholder="john@example.com" required></div>
        <div class="form-group"><label class="form-label">MESSAGE</label><textarea class="form-textarea" placeholder="Tell me about your project..." required></textarea></div>
        <button type="submit" class="form-submit">Send Message →</button>
      </form>
    </div>
  </div>
</section>

<footer><p>Designed & Built by <span>{name}</span> · Powered by CareerForge AI</p></footer>

<script>
function handleContact(e) {{
  e.preventDefault();
  const btn = e.target.querySelector('.form-submit');
  btn.textContent = 'Message Sent! ✓';
  btn.style.background = '{green}';
  setTimeout(() => {{ btn.textContent = 'Send Message →'; btn.style.background = ''; e.target.reset(); }}, 3000);
}}
const obs = new IntersectionObserver((entries) => {{
  entries.forEach(entry => {{
    if (entry.isIntersecting) {{
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      entry.target.style.transition = 'opacity .6s ease, transform .6s ease';
    }}
  }});
}}, {{ threshold: 0.1 }});
document.querySelectorAll('.timeline-card,.proj-card,.edu-card,.testimonial-card,.about-card,.contact-card').forEach(el => {{
  el.style.opacity = '0'; el.style.transform = 'translateY(16px)'; obs.observe(el);
}});
</script>
</body>
</html>"""


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/generate")
async def generate_portfolio(req: PortfolioGenerateRequest, user_id: str = Depends(verify_token)):
    data = {}
    if req.resume_id:
        result = supabase.table("resumes").select("content,title").eq("id", req.resume_id).eq("user_id", user_id).single().execute()
        if result.data:
            data = result.data["content"]
    if req.manual_data:
        data.update(req.manual_data)
    if not data:
        raise HTTPException(status_code=400, detail="No data provided")

    html = generate_portfolio_html(data, req.theme, req.photo_url)

    existing = supabase.table("portfolios").select("id,slug").eq("user_id", user_id).execute()

    name = data.get("personal", {}).get("full_name", "portfolio")

    if existing.data:
        portfolio_id = existing.data[0]["id"]
        slug = existing.data[0].get("slug") or generate_slug(name)
        supabase.table("portfolios").update({
            "html": html, "data": data, "theme": req.theme,
            "photo_url": req.photo_url, "slug": slug
        }).eq("user_id", user_id).execute()
    else:
        slug = generate_slug(name)
        result = supabase.table("portfolios").insert({
            "user_id": user_id, "html": html, "data": data,
            "theme": req.theme, "photo_url": req.photo_url,
            "slug": slug, "is_public": False, "views": 0
        }).execute()
        portfolio_id = result.data[0]["id"]

    return {"html": html, "portfolio_id": portfolio_id, "slug": slug}


@router.get("/")
async def get_portfolio(user_id: str = Depends(verify_token)):
    result = supabase.table("portfolios").select("*").eq("user_id", user_id).execute()
    if not result.data:
        return None
    return result.data[0]


@router.put("/")
async def update_portfolio(req: PortfolioUpdateRequest, user_id: str = Depends(verify_token)):
    html = generate_portfolio_html(req.data, req.theme, req.photo_url)
    supabase.table("portfolios").update({
        "html": html, "data": req.data, "theme": req.theme, "photo_url": req.photo_url
    }).eq("user_id", user_id).execute()
    return {"html": html}


@router.patch("/settings")
async def update_settings(req: PortfolioSettingsRequest, user_id: str = Depends(verify_token)):
    """Public URL, custom domain, slug update করো"""
    update_data = {}
    if req.is_public is not None:
        update_data["is_public"] = req.is_public
    if req.custom_domain is not None:
        update_data["custom_domain"] = req.custom_domain.strip().lower()
    if req.slug is not None:
        clean = re.sub(r'[^a-z0-9-]', '', req.slug.lower().replace(' ', '-'))
        if not clean:
            raise HTTPException(status_code=400, detail="Invalid slug")
        update_data["slug"] = clean

    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")

    supabase.table("portfolios").update(update_data).eq("user_id", user_id).execute()
    return {"success": True, **update_data}


@router.get("/public/{slug}")
async def get_public_portfolio(slug: str, request: Request):
    """Public portfolio — no auth দরকার নেই, view count বাড়াও"""
    result = supabase.table("portfolios").select("*").eq("slug", slug).eq("is_public", True).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    portfolio = result.data[0]

    # View count বাড়াও (background তে)
    supabase.table("portfolios").update({
        "views": (portfolio.get("views") or 0) + 1,
        "last_viewed": "now()"
    }).eq("id", portfolio["id"]).execute()

    # HTML সরাসরি return করো
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=portfolio["html"])


@router.get("/analytics")
async def get_analytics(user_id: str = Depends(verify_token)):
    """Portfolio analytics — views, last_viewed, etc."""
    result = supabase.table("portfolios").select("views,last_viewed,slug,is_public,custom_domain").eq("user_id", user_id).execute()
    if not result.data:
        return {"views": 0, "last_viewed": None, "slug": None, "is_public": False}
    return result.data[0]