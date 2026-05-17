// app/api/resume-roaster/route.ts
import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

const PROMPT = `You are a brutally honest but helpful career coach reviewing a resume. Analyze it and respond ONLY with a valid JSON object (no markdown, no backticks, no extra text).

Respond with this exact JSON structure:
{
  "score": <number 0-100>,
  "summary": "<2-3 sentence overall summary>",
  "verdict": "<1-2 sentence brutal but constructive verdict>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>", "<weakness 4>"],
  "suggestions": ["<actionable fix 1>", "<actionable fix 2>", "<actionable fix 3>", "<actionable fix 4>", "<actionable fix 5>"]
}

Be specific, honest, and actionable. No generic advice.`

export async function POST(req: NextRequest) {
  try {
    const { resumeBase64, fileName } = await req.json()

    if (!resumeBase64) {
      return NextResponse.json({ error: 'No file data received.' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set in .env.local' }, { status: 500 })
    }

    const fileBuffer = Buffer.from(resumeBase64, 'base64')
    const lowerName = fileName?.toLowerCase() || ''
    const isPDF = lowerName.endsWith('.pdf')
    const isDOCX = lowerName.endsWith('.docx')
    const isTXT = lowerName.endsWith('.txt')

    let requestBody: any

    if (isPDF) {
      // PDF — send directly to Gemini
      requestBody = {
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: resumeBase64,
              }
            },
            { text: PROMPT }
          ]
        }],
        generationConfig: { temperature: 0.7 }
      }

    } else if (isDOCX) {
      // DOCX — extract text with mammoth
      const { value: resumeText } = await mammoth.extractRawText({ buffer: fileBuffer })

      if (!resumeText || resumeText.trim().length < 50) {
        return NextResponse.json({ error: 'Could not extract text from DOCX. Make sure the file is not empty or corrupted.' }, { status: 400 })
      }

      console.log('[Resume Roaster] DOCX extracted:', resumeText.slice(0, 100))

      requestBody = {
        contents: [{
          parts: [{
            text: `${PROMPT}\n\nResume:\n---\n${resumeText.slice(0, 4000)}\n---`
          }]
        }],
        generationConfig: { temperature: 0.7 }
      }

    } else if (isTXT) {
      // TXT — decode buffer to string
      const resumeText = fileBuffer.toString('utf-8')

      if (resumeText.trim().length < 50) {
        return NextResponse.json({ error: 'Resume text is too short or unreadable.' }, { status: 400 })
      }

      requestBody = {
        contents: [{
          parts: [{
            text: `${PROMPT}\n\nResume:\n---\n${resumeText.slice(0, 4000)}\n---`
          }]
        }],
        generationConfig: { temperature: 0.7 }
      }

    } else {
      return NextResponse.json({ error: 'Unsupported file type. Please upload PDF, DOCX, or TXT.' }, { status: 400 })
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    )

    const data = await res.json()
    console.log('[Resume Roaster] Gemini status:', res.status)

    if (!res.ok) {
      const errMsg = data?.error?.message || `Gemini API error (status ${res.status})`
      return NextResponse.json({ error: errMsg }, { status: res.status })
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('[Resume Roaster] Raw response:', rawText.slice(0, 200))

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse AI response. Please try again.' }, { status: 500 })
    }

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json({ result })

  } catch (err: any) {
    console.error('[Resume Roaster] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}