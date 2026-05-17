// app/api/ai-tools/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { type, payload } = await req.json()

    let prompt = ''

    if (type === 'job_match') {
      const { jd, skills } = payload
      const skillList = skills.map((s: any) => `${s.skill_name} (${s.level}%)`).join(', ')
      prompt = `You are a career coach. Candidate skills: ${skillList}.

Job description:
---
${jd}
---

Analyze the match and give:
1. Overall Match Score (0-100%)
2. ✅ Matched Skills (bulleted)
3. ❌ Missing Skills (bulleted)
4. 💡 Quick Tips (2-3 sentences)
Be concise and practical.`
    }

    if (type === 'interview_qa') {
      const { role, skills } = payload
      const skillList = skills.map((s: any) => s.skill_name).join(', ')
      prompt = `Generate 8 realistic interview questions for a "${role}" role.
Candidate skills: ${skillList || 'general software development'}.
For each question give a brief ideal answer hint (1-2 sentences).

Format:
Q1: [question]
💡 Hint: [answer hint]

Make questions practical and role-specific.`
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set in .env.local' }, { status: 500 })
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
      }
    )

    const data = await res.json()

    console.log('[AI Tools] Gemini status:', res.status)
    console.log('[AI Tools] Gemini response:', JSON.stringify(data, null, 2))

    if (!res.ok) {
      const errMsg = data?.error?.message || `Gemini API error (status ${res.status})`
      return NextResponse.json({ error: errMsg }, { status: res.status })
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return NextResponse.json({ error: 'Empty response from Gemini', debug: data }, { status: 500 })
    }

    return NextResponse.json({ result: text })

  } catch (err: any) {
    console.error('[AI Tools] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}