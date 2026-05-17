// app/api/ai-coach/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set.' }, { status: 500 })
    }

    const systemContext = `You are an expert AI Career Coach with deep knowledge of job searching, resume writing, interview preparation, salary negotiation, and career development.

You have access to this user's career data:
- Skills: ${context.skills || 'Not tracked yet'}
- Total Applications: ${context.totalApps}
- Response Rate: ${context.responseRate}%
- Best ATS Score: ${context.bestATS}%

Guidelines:
- Be conversational, warm, and encouraging
- Give specific, actionable advice based on their data
- Reference their actual skills and stats when relevant
- Keep responses concise but thorough (200-400 words max)
- Use bullet points and structure when helpful
- Be honest about challenges but always solution-focused
- You can respond in Bengali if the user writes in Bengali`

    // Build conversation history for Gemini
    const conversationParts = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }))

    // Add system context to first user message
    if (conversationParts.length > 0 && conversationParts[0].role === 'user') {
      conversationParts[0].parts[0].text = `${systemContext}\n\nUser: ${conversationParts[0].parts[0].text}`
    }

    let res: Response | null = null
    let data: any = null

    for (let attempt = 1; attempt <= 3; attempt++) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: conversationParts,
            generationConfig: { temperature: 0.8, maxOutputTokens: 4096 }
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

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response. Please try again.'
    return NextResponse.json({ reply })

  } catch (err: any) {
    console.error('[AI Coach] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}