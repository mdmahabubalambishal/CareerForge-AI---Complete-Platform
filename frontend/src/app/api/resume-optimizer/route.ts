// app/api/resume-optimizer/route.ts
import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

export async function POST(req: NextRequest) {
  try {
    const { resumeBase64, fileName, jdText } = await req.json()

    if (!resumeBase64 || !jdText) {
      return NextResponse.json({ error: 'Resume and job description are required.' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set in .env.local' }, { status: 500 })
    }

    const fileBuffer = Buffer.from(resumeBase64, 'base64')
    const lowerName = fileName?.toLowerCase() || ''
    const isPDF = lowerName.endsWith('.pdf')
    const isDOCX = lowerName.endsWith('.docx')

    const PROMPT = `You are an expert ATS optimization specialist. Analyze this resume against the job description and provide detailed optimization suggestions.

Job Description:
---
${jdText.slice(0, 2000)}
---

Respond ONLY with a valid JSON object (no markdown, no backticks):
{
  "ats_score_before": <number 0-100, current ATS score>,
  "ats_score_after": <number 0-100, projected score after optimization>,
  "missing_keywords": ["<keyword from JD not in resume>", ...],
  "keyword_suggestions": ["<specific keyword to add>", ...],
  "weak_sections": [
    {
      "section": "<section name e.g. Work Experience>",
      "issue": "<specific problem>",
      "fix": "<specific actionable fix>"
    }
  ],
  "optimized_summary": "<rewritten professional summary optimized for this JD with relevant keywords>",
  "formatting_tips": ["<specific formatting tip>", ...],
  "overall_verdict": "<2-3 sentence overall assessment and main recommendation>"
}

Be specific and actionable. Base the score on actual keyword matches and ATS compatibility.`

    let requestBody: any

    if (isPDF) {
      requestBody = {
        contents: [{
          parts: [
            { inline_data: { mime_type: 'application/pdf', data: resumeBase64 } },
            { text: PROMPT }
          ]
        }],
        generationConfig: { temperature: 0.5 }
      }
    } else if (isDOCX) {
      const { value: resumeText } = await mammoth.extractRawText({ buffer: fileBuffer })
      if (!resumeText || resumeText.trim().length < 50) {
        return NextResponse.json({ error: 'Could not extract text from DOCX.' }, { status: 400 })
      }
      requestBody = {
        contents: [{
          parts: [{ text: `Resume:\n---\n${resumeText.slice(0, 3000)}\n---\n\n${PROMPT}` }]
        }],
        generationConfig: { temperature: 0.5 }
      }
    } else {
      const resumeText = fileBuffer.toString('utf-8')
      requestBody = {
        contents: [{
          parts: [{ text: `Resume:\n---\n${resumeText.slice(0, 3000)}\n---\n\n${PROMPT}` }]
        }],
        generationConfig: { temperature: 0.5 }
      }
    }

    // Retry logic
    let res: Response | null = null
    let data: any = null

    for (let attempt = 1; attempt <= 3; attempt++) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )
      data = await res.json()
      console.log(`[Resume Optimizer] Attempt ${attempt} — status:`, res.status)
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

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('[Resume Optimizer] Raw:', rawText.slice(0, 200))

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse AI response. Please try again.' }, { status: 500 })
    }

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json({ result })

  } catch (err: any) {
    console.error('[Resume Optimizer] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}