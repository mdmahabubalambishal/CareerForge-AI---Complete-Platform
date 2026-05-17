// app/api/career-path/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { skills, targetRole } = await req.json()

    if (!skills || skills.length === 0) {
      return NextResponse.json({ error: 'No skills provided.' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set in .env.local' }, { status: 500 })
    }

    const skillList = skills.map((s: any) => `${s.skill_name} (${s.level}%)`).join(', ')
    const targetHint = targetRole ? `The user is interested in: ${targetRole}.` : ''

    const prompt = `You are a career advisor. A candidate has these skills: ${skillList}. ${targetHint}

Suggest 4 best-fit career paths for this person. Respond ONLY with a valid JSON array (no markdown, no backticks, no extra text).

Respond with this exact structure:
[
  {
    "title": "<Job Title>",
    "match": <number 0-100 based on skill overlap>,
    "salary_range": "<e.g. $60,000 - $90,000/year>",
    "description": "<2-3 sentence description of this role and why it fits>",
    "matched_skills": ["<skill from their list that matches>", ...],
    "missing_skills": ["<important skill they don't have yet>", ...],
    "roadmap": [
      "<Step 1 to get this role>",
      "<Step 2>",
      "<Step 3>",
      "<Step 4>"
    ]
  }
]

Order by match score descending. Be specific and realistic.`

    // Retry logic
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
      console.log(`[Career Path] Attempt ${attempt} — status:`, res.status)

      if (res.ok) break

      const isOverloaded = data?.error?.message?.includes('high demand') ||
        data?.error?.message?.includes('overloaded') ||
        res.status === 503 || res.status === 429

      if (isOverloaded && attempt < 3) {
        console.log(`[Career Path] Overloaded, retrying in ${attempt * 2}s...`)
        await new Promise(r => setTimeout(r, attempt * 2000))
        continue
      }
      break
    }

    if (!res!.ok) {
      const errMsg = data?.error?.message || `Gemini API error (status ${res!.status})`
      return NextResponse.json({ error: errMsg }, { status: res!.status })
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('[Career Path] Raw response:', rawText.slice(0, 200))

    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse AI response. Please try again.' }, { status: 500 })
    }

    const paths = JSON.parse(jsonMatch[0])
    return NextResponse.json({ paths })

  } catch (err: any) {
    console.error('[Career Path] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}