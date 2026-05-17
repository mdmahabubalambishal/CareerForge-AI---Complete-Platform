'use client'
import { useState, useRef } from 'react'

interface OptimizeResult {
  ats_score_before: number
  ats_score_after: number
  missing_keywords: string[]
  weak_sections: { section: string; issue: string; fix: string }[]
  optimized_summary: string
  keyword_suggestions: string[]
  formatting_tips: string[]
  overall_verdict: string
}

export default function ResumeOptimizerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [jdText, setJdText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<'analysis' | 'optimized'>('analysis')
  const fileRef = useRef<HTMLInputElement>(null)

  const inputCls = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#9b7bff] transition-colors'

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && (dropped.type === 'application/pdf' || dropped.name.endsWith('.docx') || dropped.name.endsWith('.txt'))) {
      setFile(dropped)
      setResult(null)
      setError(null)
    } else {
      setError('Only PDF, DOCX, or TXT files are supported.')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) { setFile(selected); setResult(null); setError(null) }
  }

  async function handleOptimize() {
    if (!file || !jdText.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = e => resolve((e.target?.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch('/api/resume-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeBase64: base64, fileName: file.name, jdText }),
      })

      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data.result)
      setActiveTab('analysis')
    } catch (e: any) {
      setError('Failed to optimize: ' + e?.message)
    } finally {
      setLoading(false)
    }
  }

  const scoreColor = (s: number) => s >= 80 ? '#39e87a' : s >= 60 ? '#00f0c8' : s >= 40 ? '#ffd84d' : '#ff7c4d'
  const scoreDiff = result ? result.ats_score_after - result.ats_score_before : 0

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📝</span>
          <h1 className="text-2xl font-bold text-white">AI Resume Optimizer</h1>
        </div>
        <p className="text-[#4a6680] text-sm ml-12">Upload your resume + paste a job description — AI will optimize it for maximum ATS score</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* LEFT — Input */}
        <div className="space-y-4">
          {/* Resume Upload */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragging ? 'border-[#9b7bff] bg-[#9b7bff10]'
              : file ? 'border-[#39e87a] bg-[#39e87a08]'
              : 'border-[#1e2838] bg-[#0c1018] hover:border-[#9b7bff44]'
            }`}
          >
            <input ref={fileRef} type="file" accept=".pdf,.txt,.docx" className="hidden" onChange={handleFileChange} />
            {file ? (
              <div>
                <div className="text-3xl mb-2">📄</div>
                <div className="text-sm font-bold text-white">{file.name}</div>
                <div className="text-xs text-[#4a6680] mt-1">{(file.size / 1024).toFixed(1)} KB</div>
                <div className="text-xs text-[#39e87a] mt-2">✓ Ready to optimize</div>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-2">📂</div>
                <div className="text-sm font-bold text-white mb-1">Drop your resume here</div>
                <div className="text-xs text-[#4a6680]">PDF, DOCX, TXT supported</div>
              </div>
            )}
          </div>

          {/* JD Input */}
          <div>
            <label className="text-xs font-bold text-white block mb-2">
              Job Description *
              <span className="text-[#4a6680] font-normal ml-2">Paste the full JD for best results</span>
            </label>
            <textarea
              className={inputCls}
              rows={10}
              placeholder="Paste the job description here...

Example:
We are looking for a Senior React Developer with:
- 3+ years of React experience
- TypeScript proficiency
- Node.js and REST API knowledge
- Docker experience preferred..."
              value={jdText}
              onChange={e => setJdText(e.target.value)}
            />
            <div className="text-[10px] text-[#4a6680] mt-1 text-right">{jdText.length} chars</div>
          </div>

          {error && (
            <div className="bg-[#ff5c9c11] border border-[#ff5c9c44] rounded-xl p-3 text-sm text-[#ff5c9c]">
              ❌ {error}
            </div>
          )}

          <button
            onClick={handleOptimize}
            disabled={!file || !jdText.trim() || loading}
            className="w-full bg-[#9b7bff] text-white font-bold py-3 rounded-xl text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? '⚡ Optimizing...' : '📝 Optimize My Resume'}
          </button>

          {/* Tips */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
            <div className="text-xs font-bold text-white mb-3">💡 What gets optimized?</div>
            <div className="space-y-1.5">
              {[
                'Missing ATS keywords from JD',
                'Weak action verbs',
                'Unquantified achievements',
                'Skills section gaps',
                'Summary/objective alignment',
                'Formatting & structure issues',
              ].map((tip, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[#4a6680]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#9b7bff]" />
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Results */}
        <div>
          {loading && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
              <div className="text-5xl mb-4 animate-pulse">📝</div>
              <div className="text-white font-bold mb-2">Optimizing your resume...</div>
              <div className="text-xs text-[#4a6680]">AI is analyzing every line against the JD</div>
            </div>
          )}

          {!loading && !result && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
              <div className="text-5xl mb-4">🎯</div>
              <div className="text-white font-bold text-lg mb-2">Ready to optimize</div>
              <p className="text-[#4a6680] text-sm">Upload your resume and paste the job description to get started</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Score Comparison */}
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-5">
                <div className="text-sm font-bold text-white mb-4">📊 ATS Score Improvement</div>
                <div className="grid grid-cols-3 gap-4 items-center">
                  {/* Before */}
                  <div className="text-center">
                    <div className="text-xs text-[#4a6680] mb-1">Before</div>
                    <div className="text-4xl font-bold" style={{ color: scoreColor(result.ats_score_before) }}>
                      {result.ats_score_before}%
                    </div>
                    <div className="h-1.5 bg-[#1e2838] rounded-full overflow-hidden mt-2">
                      <div className="h-full rounded-full" style={{ width: `${result.ats_score_before}%`, background: scoreColor(result.ats_score_before) }} />
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="text-center">
                    <div className="text-2xl">→</div>
                    <div className="text-sm font-bold mt-1" style={{ color: scoreDiff > 0 ? '#39e87a' : '#ff5c9c' }}>
                      {scoreDiff > 0 ? '+' : ''}{scoreDiff}%
                    </div>
                  </div>

                  {/* After */}
                  <div className="text-center">
                    <div className="text-xs text-[#4a6680] mb-1">After</div>
                    <div className="text-4xl font-bold" style={{ color: scoreColor(result.ats_score_after) }}>
                      {result.ats_score_after}%
                    </div>
                    <div className="h-1.5 bg-[#1e2838] rounded-full overflow-hidden mt-2">
                      <div className="h-full rounded-full" style={{ width: `${result.ats_score_after}%`, background: scoreColor(result.ats_score_after) }} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-[#111620] rounded-xl">
                  <p className="text-xs text-[#7a96b0] leading-relaxed">{result.overall_verdict}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-[#0c1018] border border-[#1e2838] rounded-xl p-1">
                <button onClick={() => setActiveTab('analysis')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'analysis' ? 'bg-[#9b7bff] text-white' : 'text-[#7a96b0] hover:text-white'}`}>
                  🔍 Analysis
                </button>
                <button onClick={() => setActiveTab('optimized')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'optimized' ? 'bg-[#9b7bff] text-white' : 'text-[#7a96b0] hover:text-white'}`}>
                  ✨ Optimized Summary
                </button>
              </div>

              {/* Analysis Tab */}
              {activeTab === 'analysis' && (
                <div className="space-y-3">
                  {/* Missing Keywords */}
                  <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                    <div className="text-xs font-bold text-[#ff5c9c] mb-3">🔑 Missing Keywords ({result.missing_keywords.length})</div>
                    <div className="flex flex-wrap gap-2">
                      {result.missing_keywords.map((kw, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-[#ff5c9c15] border border-[#ff5c9c33] text-[#ff5c9c]">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Keyword Suggestions */}
                  <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                    <div className="text-xs font-bold text-[#00f0c8] mb-3">💡 Add These Keywords</div>
                    <div className="flex flex-wrap gap-2">
                      {result.keyword_suggestions.map((kw, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-[#00f0c815] border border-[#00f0c833] text-[#00f0c8] cursor-pointer hover:bg-[#00f0c825]"
                          onClick={() => navigator.clipboard.writeText(kw)}
                          title="Click to copy">
                          + {kw}
                        </span>
                      ))}
                    </div>
                    <div className="text-[10px] text-[#4a6680] mt-2">Click to copy</div>
                  </div>

                  {/* Weak Sections */}
                  <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                    <div className="text-xs font-bold text-[#ffd84d] mb-3">⚠️ Weak Sections</div>
                    <div className="space-y-3">
                      {result.weak_sections.map((ws, i) => (
                        <div key={i} className="bg-[#111620] rounded-lg p-3">
                          <div className="text-xs font-bold text-white mb-1">{ws.section}</div>
                          <div className="text-[10px] text-[#ff5c9c] mb-1">Issue: {ws.issue}</div>
                          <div className="text-[10px] text-[#39e87a]">Fix: {ws.fix}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Formatting Tips */}
                  <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                    <div className="text-xs font-bold text-[#9b7bff] mb-3">🎨 Formatting Tips</div>
                    <div className="space-y-2">
                      {result.formatting_tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-[#7a96b0]">
                          <span className="text-[#9b7bff] mt-0.5 flex-shrink-0">{i + 1}.</span>
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Optimized Summary Tab */}
              {activeTab === 'optimized' && (
                <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold text-[#9b7bff]">✨ AI-Optimized Professional Summary</div>
                    <button
                      onClick={() => navigator.clipboard.writeText(result.optimized_summary)}
                      className="text-xs px-3 py-1 rounded-lg bg-[#9b7bff22] border border-[#9b7bff44] text-[#9b7bff] hover:bg-[#9b7bff33]">
                      📋 Copy
                    </button>
                  </div>
                  <div className="bg-[#111620] border border-[#1e2838] rounded-xl p-4">
                    <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{result.optimized_summary}</p>
                  </div>
                  <p className="text-[10px] text-[#4a6680] mt-3">
                    💡 Replace your current summary/objective section with this optimized version
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}