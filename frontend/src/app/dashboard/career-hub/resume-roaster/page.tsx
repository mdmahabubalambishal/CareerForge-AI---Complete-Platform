'use client'
import { useState, useRef } from 'react'

interface RoastResult {
  score: number
  summary: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  verdict: string
}

export default function ResumeRoasterPage() {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RoastResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const inputCls = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#ff7c4d] transition-colors'

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && (dropped.type === 'application/pdf' || dropped.name.endsWith('.txt') || dropped.name.endsWith('.docx'))) {
      setFile(dropped)
      setResult(null)
      setError(null)
    } else {
      setError('Only PDF, TXT, or DOCX files are supported.')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setResult(null)
      setError(null)
    }
  }

  async function handleRoast() {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = e => {
          const result = e.target?.result as string
          // Remove data:...;base64, prefix
          const base64Data = result.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch('/api/resume-roaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeBase64: base64, fileName: file.name }),
      })

      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data.result)
    } catch (e: any) {
      setError('Failed to analyze resume: ' + e?.message)
    } finally {
      setLoading(false)
    }
  }

  const scoreColor = (s: number) =>
    s >= 80 ? '#39e87a' : s >= 60 ? '#00f0c8' : s >= 40 ? '#ffd84d' : '#ff7c4d'

  const scoreLabel = (s: number) =>
    s >= 80 ? 'Strong' : s >= 60 ? 'Decent' : s >= 40 ? 'Needs Work' : 'Weak'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🔥</span>
          <h1 className="text-2xl font-bold text-white">Resume Roaster</h1>
        </div>
        <p className="text-[#4a6680] text-sm ml-12">Upload your resume and AI will brutally (but helpfully) tell you what's wrong</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragging
                ? 'border-[#ff7c4d] bg-[#ff7c4d10]'
                : file
                ? 'border-[#39e87a] bg-[#39e87a08]'
                : 'border-[#1e2838] bg-[#0c1018] hover:border-[#ff7c4d44] hover:bg-[#ff7c4d05]'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div>
                <div className="text-4xl mb-3">📄</div>
                <div className="text-sm font-bold text-white">{file.name}</div>
                <div className="text-xs text-[#4a6680] mt-1">{(file.size / 1024).toFixed(1)} KB</div>
                <div className="text-xs text-[#39e87a] mt-2">✓ Ready to roast</div>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3">📂</div>
                <div className="text-sm font-bold text-white mb-1">Drop your resume here</div>
                <div className="text-xs text-[#4a6680]">or click to browse</div>
                <div className="text-xs text-[#4a6680] mt-3">PDF, TXT, DOCX supported</div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-[#ff5c9c11] border border-[#ff5c9c44] rounded-xl p-3 text-sm text-[#ff5c9c]">
              ❌ {error}
            </div>
          )}

          <button
            onClick={handleRoast}
            disabled={!file || loading}
            className="w-full bg-[#ff7c4d] text-white font-bold py-3 rounded-xl text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? '🔥 Roasting...' : '🔥 Roast My Resume'}
          </button>

          {/* Tips */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
            <div className="text-xs font-bold text-white mb-3">💡 What gets roasted?</div>
            <div className="space-y-2">
              {[
                'Weak action verbs',
                'Missing quantified achievements',
                'Poor formatting signals',
                'Buzzword overuse',
                'Missing keywords',
                'Length & structure issues',
              ].map((tip, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[#4a6680]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ff7c4d]" />
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Result Section */}
        <div>
          {loading && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center">
              <div className="text-5xl mb-4 animate-bounce">🔥</div>
              <div className="text-white font-bold mb-2">Roasting your resume...</div>
              <div className="text-xs text-[#4a6680]">AI is reading every line</div>
            </div>
          )}

          {!loading && !result && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center">
              <div className="text-5xl mb-4">👀</div>
              <div className="text-white font-bold mb-2">Waiting for your resume</div>
              <div className="text-xs text-[#4a6680]">Upload and roast to see results</div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Score */}
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-white">Resume Score</div>
                  <div className="text-xs px-2 py-1 rounded-lg font-bold" style={{ background: `${scoreColor(result.score)}22`, color: scoreColor(result.score) }}>
                    {scoreLabel(result.score)}
                  </div>
                </div>
                <div className="flex items-end gap-3 mb-3">
                  <div className="text-5xl font-bold" style={{ color: scoreColor(result.score) }}>{result.score}</div>
                  <div className="text-[#4a6680] text-sm mb-1">/100</div>
                </div>
                <div className="h-3 bg-[#1e2838] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${result.score}%`, background: scoreColor(result.score) }}
                  />
                </div>
                <p className="text-xs text-[#7a96b0] mt-3 leading-relaxed">{result.summary}</p>
              </div>

              {/* Verdict */}
              <div className="bg-[#ff7c4d11] border border-[#ff7c4d33] rounded-xl p-4">
                <div className="text-xs font-bold text-[#ff7c4d] mb-1">🔥 The Verdict</div>
                <p className="text-sm text-white leading-relaxed">{result.verdict}</p>
              </div>

              {/* Strengths */}
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                <div className="text-xs font-bold text-[#39e87a] mb-3">✅ Strengths</div>
                <div className="space-y-2">
                  {result.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-[#7a96b0]">
                      <span className="text-[#39e87a] mt-0.5 flex-shrink-0">•</span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                <div className="text-xs font-bold text-[#ff5c9c] mb-3">❌ Weaknesses</div>
                <div className="space-y-2">
                  {result.weaknesses.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-[#7a96b0]">
                      <span className="text-[#ff5c9c] mt-0.5 flex-shrink-0">•</span>
                      {w}
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                <div className="text-xs font-bold text-[#00f0c8] mb-3">💡 How to Fix It</div>
                <div className="space-y-2">
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-[#7a96b0]">
                      <span className="text-[#00f0c8] font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}