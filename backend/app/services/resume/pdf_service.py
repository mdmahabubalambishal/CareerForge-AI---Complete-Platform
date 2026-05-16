import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer,
    HRFlowable, Table, TableStyle
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


# ── Color Palette ─────────────────────────────────────────────────────────────
PRIMARY     = colors.HexColor('#1a1a2e')   # dark navy — name
ACCENT      = colors.HexColor('#0ea5e9')   # sky blue — section headers
SUBTEXT     = colors.HexColor('#64748b')   # gray — company, dates
BODY        = colors.HexColor('#334155')   # dark slate — body text
LIGHT_LINE  = colors.HexColor('#e2e8f0')   # light gray — dividers
SKILL_BG    = colors.HexColor('#f0f9ff')   # very light blue — skill tags
WHITE       = colors.white
PAGE_BG     = colors.white


# ── Styles ────────────────────────────────────────────────────────────────────
def make_styles():
    return {
        'name': ParagraphStyle(
            'name',
            fontName='Helvetica-Bold',
            fontSize=22,
            textColor=PRIMARY,
            spaceAfter=1*mm,
            leading=26,
        ),
        'role': ParagraphStyle(
            'role',
            fontName='Helvetica',
            fontSize=11,
            textColor=ACCENT,
            spaceAfter=1*mm,
            leading=14,
        ),
        'contact': ParagraphStyle(
            'contact',
            fontName='Helvetica',
            fontSize=8.5,
            textColor=SUBTEXT,
            spaceAfter=1*mm,
            leading=12,
        ),
        'section': ParagraphStyle(
            'section',
            fontName='Helvetica-Bold',
            fontSize=8.5,
            textColor=ACCENT,
            spaceBefore=5*mm,
            spaceAfter=2*mm,
            leading=11,
            letterSpacing=1.5,
        ),
        'job_title': ParagraphStyle(
            'job_title',
            fontName='Helvetica-Bold',
            fontSize=10.5,
            textColor=PRIMARY,
            spaceAfter=0.5*mm,
            leading=14,
        ),
        'company': ParagraphStyle(
            'company',
            fontName='Helvetica',
            fontSize=9,
            textColor=SUBTEXT,
            spaceAfter=1.5*mm,
            leading=12,
        ),
        'bullet': ParagraphStyle(
            'bullet',
            fontName='Helvetica',
            fontSize=9.5,
            textColor=BODY,
            leftIndent=10,
            spaceAfter=1.5*mm,
            leading=13.5,
        ),
        'summary': ParagraphStyle(
            'summary',
            fontName='Helvetica',
            fontSize=9.5,
            textColor=BODY,
            spaceAfter=2*mm,
            leading=14,
        ),
        'skill': ParagraphStyle(
            'skill',
            fontName='Helvetica',
            fontSize=9.5,
            textColor=BODY,
            spaceAfter=1*mm,
            leading=14,
        ),
        'edu_degree': ParagraphStyle(
            'edu_degree',
            fontName='Helvetica-Bold',
            fontSize=10,
            textColor=PRIMARY,
            spaceAfter=0.5*mm,
            leading=13,
        ),
        'edu_inst': ParagraphStyle(
            'edu_inst',
            fontName='Helvetica',
            fontSize=9,
            textColor=SUBTEXT,
            spaceAfter=2*mm,
            leading=12,
        ),
        'proj_name': ParagraphStyle(
            'proj_name',
            fontName='Helvetica-Bold',
            fontSize=10,
            textColor=PRIMARY,
            spaceAfter=0.5*mm,
            leading=13,
        ),
        'proj_tech': ParagraphStyle(
            'proj_tech',
            fontName='Helvetica',
            fontSize=8.5,
            textColor=ACCENT,
            spaceAfter=1*mm,
            leading=11,
        ),
        'proj_desc': ParagraphStyle(
            'proj_desc',
            fontName='Helvetica',
            fontSize=9.5,
            textColor=BODY,
            spaceAfter=2*mm,
            leading=13,
        ),
    }


# ── Section Divider ───────────────────────────────────────────────────────────
def section_divider(title: str, styles: dict):
    """Section title + full-width colored line"""
    elements = []
    elements.append(Spacer(1, 1*mm))
    elements.append(Paragraph(title.upper(), styles['section']))
    elements.append(HRFlowable(
        width="100%",
        thickness=1.5,
        color=ACCENT,
        spaceAfter=3*mm,
    ))
    return elements


# ── Date Row (title left, date right) ────────────────────────────────────────
def title_date_row(left_text: str, right_text: str, styles: dict):
    """Two-column table: job title left, date right"""
    left = Paragraph(left_text, styles['job_title'])
    right = Paragraph(
        f'<font color="#64748b" size="8.5">{right_text}</font>',
        ParagraphStyle('date_right', fontName='Helvetica', fontSize=8.5,
                       textColor=SUBTEXT, alignment=TA_RIGHT, leading=13)
    )
    t = Table([[left, right]], colWidths=['75%', '25%'])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    return t


# ── Main Generator ────────────────────────────────────────────────────────────
def generate_pdf_bytes(resume: dict) -> bytes:
    buffer = io.BytesIO()
    styles = make_styles()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=16*mm,
        leftMargin=16*mm,
        topMargin=14*mm,
        bottomMargin=14*mm,
        title=resume.get("personal", {}).get("full_name", "Resume"),
        author="CareerForge AI",
    )

    story = []
    p = resume.get("personal", {})

    # ── HEADER ────────────────────────────────────────────────────────────────
    # Name
    story.append(Paragraph(p.get("full_name", ""), styles['name']))

    # Contact line 1: email · phone · location
    contact_line1 = []
    if p.get("email"):    contact_line1.append(p["email"])
    if p.get("phone"):    contact_line1.append(p["phone"])
    if p.get("location"): contact_line1.append(p["location"])
    if contact_line1:
        story.append(Paragraph(" &nbsp;·&nbsp; ".join(contact_line1), styles['contact']))

    # Contact line 2: linkedin
    if p.get("linkedin"):
        story.append(Paragraph(p["linkedin"], styles['contact']))

    # Contact line 3: github / portfolio
    links = []
    if p.get("github"):    links.append(p["github"])
    if p.get("portfolio"): links.append(p["portfolio"])
    if links:
        story.append(Paragraph(" &nbsp;·&nbsp; ".join(links), styles['contact']))

    story.append(Spacer(1, 2*mm))

    # Full-width accent line under header
    story.append(HRFlowable(
        width="100%",
        thickness=2,
        color=ACCENT,
        spaceAfter=2*mm,
    ))

    # ── SUMMARY ───────────────────────────────────────────────────────────────
    if resume.get("summary"):
        story += section_divider("Summary", styles)
        story.append(Paragraph(resume["summary"], styles['summary']))

    # ── EXPERIENCE ────────────────────────────────────────────────────────────
    experience = resume.get("experience", [])
    if experience:
        story += section_divider("Experience", styles)
        for exp in experience:
            title    = exp.get("title", "")
            company  = exp.get("company", "")
            location = exp.get("location", "")
            start    = exp.get("start_date", "")
            end      = exp.get("end_date", "Present")
            date_str = f"{start} – {end}" if start else end

            # Title | Date
            story.append(title_date_row(title, date_str, styles))

            # Company · Location
            co_line = " · ".join(filter(None, [company, location]))
            if co_line:
                story.append(Paragraph(co_line, styles['company']))

            # Bullets
            for bullet in exp.get("bullets", []):
                story.append(Paragraph(f"<bullet>•</bullet> {bullet}", styles['bullet']))

            story.append(Spacer(1, 2*mm))

    # ── EDUCATION ─────────────────────────────────────────────────────────────
    education = resume.get("education", [])
    if education:
        story += section_divider("Education", styles)
        for edu in education:
            degree = edu.get("degree", "")
            inst   = edu.get("institution", "")
            year   = edu.get("year", "")
            gpa    = edu.get("gpa", "")

            story.append(title_date_row(degree, year, styles))

            inst_line = inst
            if gpa:
                inst_line += f" &nbsp;·&nbsp; GPA: {gpa}"
            if inst_line:
                story.append(Paragraph(inst_line, styles['edu_inst']))

    # ── PROJECTS ──────────────────────────────────────────────────────────────
    projects = resume.get("projects", [])
    if projects:
        story += section_divider("Projects", styles)
        for proj in projects:
            name  = proj.get("name", "")
            tech  = " · ".join(proj.get("tech_stack", []))
            desc  = proj.get("description", "")
            link  = proj.get("link", "")

            story.append(Paragraph(name, styles['proj_name']))
            if tech:
                story.append(Paragraph(tech, styles['proj_tech']))
            if desc:
                story.append(Paragraph(desc, styles['proj_desc']))
            if link:
                story.append(Paragraph(
                    f'<font color="#0ea5e9">{link}</font>',
                    styles['proj_tech']
                ))
            story.append(Spacer(1, 1.5*mm))

    # ── SKILLS ────────────────────────────────────────────────────────────────
    skills = resume.get("skills", {})
    technical = skills.get("technical", [])
    tools     = skills.get("tools", [])
    soft      = skills.get("soft", [])

    if technical or tools or soft:
        story += section_divider("Skills", styles)

        if technical:
            story.append(Paragraph(
                f'<b>Technical:</b> &nbsp;{", ".join(technical)}',
                styles['skill']
            ))
        if tools:
            story.append(Paragraph(
                f'<b>Tools & Frameworks:</b> &nbsp;{", ".join(tools)}',
                styles['skill']
            ))
        if soft:
            story.append(Paragraph(
                f'<b>Soft Skills:</b> &nbsp;{", ".join(soft)}',
                styles['skill']
            ))

    # ── CERTIFICATIONS ────────────────────────────────────────────────────────
    certs = resume.get("certifications", [])
    if certs:
        story += section_divider("Certifications", styles)
        for cert in certs:
            story.append(Paragraph(f"<bullet>•</bullet> {cert}", styles['bullet']))

    # Languages
    languages = resume.get("languages", [])
    if languages:
        story += section_divider("Languages", styles)
        lang_texts = []
        for lang in languages:
            if isinstance(lang, str):
                lang_texts.append(lang)
            elif isinstance(lang, dict):
                text = lang.get("language", "")
                prof = lang.get("proficiency", "")
                lang_texts.append(f"{text} ({prof})" if prof else text)
        story.append(Paragraph(" · ".join(lang_texts), styles['skill']))

    # Awards
    awards = resume.get("awards", [])
    if awards:
        story += section_divider("Awards & Honors", styles)
        for award in awards:
            story.append(Paragraph(f"<bullet>•</bullet> {award}", styles['bullet']))

    # Publications
    publications = resume.get("publications", [])
    if publications:
        story += section_divider("Publications", styles)
        for pub in publications:
            story.append(Paragraph(f"<bullet>•</bullet> {pub}", styles['bullet']))

    # Volunteer
    volunteer = resume.get("volunteer", [])
    if volunteer:
        story += section_divider("Volunteer Experience", styles)
        for v in volunteer:
            if isinstance(v, str):
                story.append(Paragraph(f"<bullet>•</bullet> {v}", styles['bullet']))
            elif isinstance(v, dict):
                role = v.get("role", "")
                org = v.get("organization", "")
                dur = v.get("duration", "")
                desc = v.get("description", "")
                story.append(title_date_row(role, dur, styles))
                if org:
                    story.append(Paragraph(org, styles['edu_inst']))
                if desc:
                    story.append(Paragraph(desc, styles['bullet']))
                story.append(Spacer(1, 2*mm))

    # References
    references = resume.get("references", [])
    if references:
        story += section_divider("References", styles)
        for ref in references:
            story.append(Paragraph(f"<bullet>•</bullet> {ref}", styles['bullet']))

    # ── BUILD ─────────────────────────────────────────────────────────────────
    doc.build(story)
    buffer.seek(0)
    return buffer.read()