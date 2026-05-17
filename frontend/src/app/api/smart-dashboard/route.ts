// app/api/smart-dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { stats, skills, recentJobs } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set.' }, { status: 500 })
    }

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

    const prompt = `You are an expert career coach. Today is ${today}. Analyze this job seeker's data and provide a personalized daily briefing.

Career Stats:
- Total Applications: ${stats.totalApps}
- Applied This Week: ${stats.weeklyApps}
- Response Rate: ${stats.responseRate}%
- Best ATS Score: ${stats.bestATS}%
- Currently Interviewing: ${stats.interviewing}
- Offers: ${stats.offers}

Skills: ${skills.map((s: any) => `${s.name} (${s.level}%)`).join(', ') || 'None tracked'}

Recent Applications: ${recentJobs.map((j: any) => `${j.company} - ${j.role} (${j.status})`).join(', ') || 'None'}

Respond ONLY with a valid JSON object (no markdown, no backticks):
{
  "greeting": "<personalized good morning/afternoon greeting based on their progress>",
  "motivation": "<2-3 sentence personalized motivational message based on their specific data>",
  "focus_for_today": "<1-2 sentence specific focus area for today based on their data>",
  "weekly_goal": "<specific measurable weekly goal based on their current progress>",
  "daily_tips": [
    {
      "category": "<tip category e.g. Applications, Networking, Skills>",
      "tip": "<specific actionable tip based on their data>",
      "action": "<one specific action to take today>",
      "priority": "<high|medium|low>",
      "icon": "<relevant emoji>"
    }
  ],
  "insights": [
    {
      "title": "<insight title>",
      "description": "<specific insight based on their data>",
      "type": "<warning|success|info|action>"
    }
  ]
}

Provide exactly 4 daily_tips and 4 insights. Be very specific to their data, not generic.`

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
            generationConfig: { temperature: 0.8 }
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
      return NextResponse.json({ error: 'Could not parse AI response.' }, { status: 500 })
    }

    const dashboard = JSON.parse(jsonMatch[0])
    return NextResponse.json({ dashboard })

  } catch (err: any) {
    console.error('[Smart Dashboard] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}