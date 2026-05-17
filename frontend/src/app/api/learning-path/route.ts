// app/api/learning-path/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { skills, targetRole } = await req.json()

    if (!targetRole) {
      return NextResponse.json({ error: 'Target role is required.' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set.' }, { status: 500 })
    }

    const skillList = skills?.length > 0
      ? skills.map((s: any) => `${s.name} (${s.level}%)`).join(', ')
      : 'No skills tracked yet'

    const prompt = `You are a career learning advisor. Create a personalized learning path for someone who wants to become a "${targetRole}".

Current skills: ${skillList}

Respond ONLY with a valid JSON object (no markdown, no backticks):
{
  "target_role": "${targetRole}",
  "summary": "<2-3 sentence overview of the learning path>",
  "estimated_time": "<realistic time estimate e.g. 3-6 months>",
  "next_milestone": "<specific first milestone to achieve>",
  "skill_gaps": ["<key skill they need>", ...],
  "courses": [
    {
      "title": "<specific course name>",
      "provider": "<e.g. Coursera, Udemy, YouTube, freeCodeCamp>",
      "level": "<Beginner|Intermediate|Advanced>",
      "duration": "<e.g. 10 hours, 4 weeks>",
      "why_recommended": "<specific reason based on their skills>",
      "skills_covered": ["<skill 1>", "<skill 2>"],
      "url_hint": "<search on platform e.g. 'Search on Coursera'>",
      "priority": "<must_have|recommended|nice_to_have>",
      "free": <true|false>
    }
  ]
}

Provide exactly 8 courses. Mix free and paid options. Be specific with real course names that actually exist. Order by priority (must_have first).`

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
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse AI response. Please try again.' }, { status: 500 })
    }

    const path = JSON.parse(jsonMatch[0])
    return NextResponse.json({ path })

  } catch (err: any) {
    console.error('[Learning Path] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}