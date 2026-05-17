// app/api/industry-news/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { skills, industry } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set.' }, { status: 500 })
    }

    const skillList = skills?.length > 0 ? skills.join(', ') : 'general technology'
    const targetIndustry = industry || 'Technology/Software Development'
    const today = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const prompt = `You are a tech industry analyst. Generate a curated news briefing for ${today} for someone working in ${targetIndustry} with these skills: ${skillList}.

Create realistic, plausible news articles based on actual trends in the industry as of your knowledge. Make them specific and believable.

Respond ONLY with a valid JSON object (no markdown, no backticks):
{
  "industry": "${targetIndustry}",
  "generated_at": "${new Date().toISOString()}",
  "weekly_trend": "<2-3 sentence summary of the biggest trend this week in their field>",
  "hot_skills": ["<in-demand skill>", "<in-demand skill>", "<in-demand skill>", "<in-demand skill>", "<in-demand skill>"],
  "articles": [
    {
      "title": "<realistic news headline>",
      "summary": "<2-3 sentence article summary>",
      "category": "<AI/ML|Industry Trend|Career Insight|Technology|Job Market|Skill Update>",
      "relevance": "<High|Medium>",
      "source": "<realistic source e.g. TechCrunch, Wired, The Verge>",
      "why_relevant": "<specific reason why this matters to someone with their skills>",
      "key_takeaway": "<one specific action or insight they should take>",
      "tags": ["<tag1>", "<tag2>", "<tag3>"]
    }
  ]
}

Generate exactly 8 articles. Mix different categories. Make them specific to their skills and industry. Be realistic and informative.`

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
      return NextResponse.json({ error: 'Could not parse AI response. Please try again.' }, { status: 500 })
    }

    const news = JSON.parse(jsonMatch[0])
    return NextResponse.json({ news })

  } catch (err: any) {
    console.error('[Industry News] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}