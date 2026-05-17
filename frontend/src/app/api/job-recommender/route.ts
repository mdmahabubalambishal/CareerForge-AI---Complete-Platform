// app/api/job-recommender/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { skills, preferences } = await req.json()

    if (!skills || skills.length === 0) {
      return NextResponse.json({ error: 'No skills provided.' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set.' }, { status: 500 })
    }

    const skillList = skills.map((s: any) => `${s.skill_name} (${s.level}%)`).join(', ')
    const prefText = `
Work mode: ${preferences.work_mode}
Experience level: ${preferences.experience}
${preferences.location ? `Location preference: ${preferences.location}` : ''}
${preferences.industry ? `Industry preference: ${preferences.industry}` : ''}`.trim()

    const prompt = `You are a career advisor. Based on this candidate's skills and preferences, recommend 6 specific job roles.

Candidate skills: ${skillList}
${prefText}

Respond ONLY with a valid JSON array (no markdown, no backticks):
[
  {
    "title": "<Specific Job Title>",
    "company_type": "<e.g. Startup, Enterprise, Agency, Remote-first>",
    "match_score": <number 0-100>,
    "salary_range": "<realistic salary range>",
    "required_skills": ["<key skill for this role>", ...],
    "your_matching_skills": ["<skills from candidate that match>", ...],
    "missing_skills": ["<important skills they lack>", ...],
    "why_good_fit": "<2-3 sentences explaining why this role suits them>",
    "job_boards": ["<specific job board or platform to find this role>", ...]
  }
]

Order by match_score descending. Be specific and realistic about salaries and job boards.`

    let res: Response | null = null
    let data: any = null

    for (let attempt = 1; attempt <= 3; attempt++) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 }
          }),
        }
      )
      data = await res.json()
      if (res.ok) break

      const isOverloaded = data?.error?.message?.includes('high demand') ||
        data?.error?.message?.includes('overloaded') ||
        res.status === 503 || res.status === 429

      if (isOverloaded && attempt < 3) {
        await new Promise(r => setTimeout(r, attempt * 2000))
        continue
      }
      break
    }

    if (!res!.ok) {
      return NextResponse.json({ error: data?.error?.message || 'Gemini API error' }, { status: res!.status })
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse AI response. Please try again.' }, { status: 500 })
    }

    const jobs = JSON.parse(jsonMatch[0])
    return NextResponse.json({ jobs })

  } catch (err: any) {
    console.error('[Job Recommender] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}