// app/api/linkedin-generator/route.ts
import { NextRequest, NextResponse } from 'next/server'

const TYPE_PROMPTS: Record<string, string> = {
  job_search: 'a job search update post sharing the journey, challenges, and progress',
  achievement: 'a celebratory achievement post highlighting a recent win or milestone',
  skill_learned: 'a post about a new skill or technology recently learned',
  interview_experience: 'a post sharing insights and lessons from interview experiences',
  weekly_reflection: 'a weekly reflection post summarizing learnings and progress',
  career_tip: 'a helpful career tip post based on personal experience',
}

export async function POST(req: NextRequest) {
  try {
    const { postType, tone, customContext, stats, skills } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set in .env.local' }, { status: 500 })
    }

    const typeDesc = TYPE_PROMPTS[postType] || 'a career-related post'
    const skillList = skills?.length > 0 ? skills.join(', ') : 'various technical skills'
    const statsText = stats ? `Total applications: ${stats.totalApps}, This week: ${stats.weeklyApps}, Response rate: ${stats.responseRate}%, Best ATS score: ${stats.bestATS}%` : ''
    const contextText = customContext ? `Additional context: ${customContext}` : ''

    const prompt = `Write ${typeDesc} for LinkedIn.

Tone: ${tone}
${statsText ? `Career stats: ${statsText}` : ''}
${skillList ? `Skills: ${skillList}` : ''}
${contextText}

Requirements:
- Write in first person
- Tone must be ${tone}
- Length: 150-300 words (optimal for LinkedIn engagement)
- Use line breaks for readability
- Include 3-5 relevant hashtags at the end
- Make it authentic and engaging, not corporate-sounding
- No emojis overload — use sparingly and naturally
- Do NOT use generic phrases like "I am excited to share"
- Start with a hook that grabs attention

Return ONLY the post text, no explanations.`

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
            generationConfig: { temperature: 0.9 }
          }),
        }
      )
      data = await res.json()
      console.log(`[LinkedIn Gen] Attempt ${attempt} — status:`, res.status)
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
      const errMsg = data?.error?.message || `Gemini API error (status ${res!.status})`
      return NextResponse.json({ error: errMsg }, { status: res!.status })
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!content) {
      return NextResponse.json({ error: 'Empty response. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ content })

  } catch (err: any) {
    console.error('[LinkedIn Gen] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}