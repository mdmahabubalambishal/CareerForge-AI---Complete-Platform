// app/api/generate-template/route.ts
import { NextRequest, NextResponse } from 'next/server'

const TYPE_LABELS: Record<string, string> = {
  cover_letter: 'Cover Letter',
  follow_up: 'Follow-up Email',
  cold_email: 'Cold Email',
  thank_you: 'Thank You Email',
  custom: 'Custom Template',
}

export async function POST(req: NextRequest) {
  try {
    const { type, role, company, tone } = await req.json()

    if (!role) {
      return NextResponse.json({ error: 'Target role is required.' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set in .env.local' }, { status: 500 })
    }

    const companyLine = company ? `for ${company}` : 'for a target company'
    const templateType = TYPE_LABELS[type] || 'Template'

    const prompt = `Write a ${tone} ${templateType} for a ${role} position ${companyLine}.

Requirements:
- Use [brackets] for placeholders that the user should fill in
- Be specific and compelling, not generic
- Tone: ${tone}
- Length: appropriate for the template type
- Include all necessary sections for a ${templateType}
- Make it ready to use with minimal editing

Return ONLY the template text, no explanations, no markdown formatting.`

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
            generationConfig: { temperature: 0.8 }
          }),
        }
      )
      data = await res.json()
      console.log(`[Template Gen] Attempt ${attempt} — status:`, res.status)
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
      return NextResponse.json({ error: 'Empty response from AI. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ content })

  } catch (err: any) {
    console.error('[Template Gen] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}