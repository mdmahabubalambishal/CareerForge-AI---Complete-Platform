'use client'
import { useState, useEffect } from 'react'
import { resumeApi } from '@/lib/api'
import ATSScoreRing from './_components/ATSScoreRing'
import ResumeForm from './_components/ResumeForm'
import ResumePreview from './_components/ResumePreview'
import KeywordPanel from './_components/KeywordPanel'
import ScoreHistoryChart from './_components/ScoreHistoryChart'
import ResumeList from './_components/ResumeList'

type Tab = 'list' | 'generate' | 'editor' | 'score' | 'jd'

export default function ResumePage() {
  const [tab, setTab] = useState<Tab>('list')
  const [resumes, setResumes] = useState<any[]>([])
  const [activeResume, setActiveResume] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [atsResult, setAtsResult] = useState<any>(null)
  const [jdResult, setJdResult] = useState<any>(null)
  const [atsHistory, setAtsHistory] = useState<any[]>([])
  const [jobDesc, setJobDesc] = useState('')
  const [jdText, setJdText] = useState('')

  useEffect(() => { fetchResumes() }, [])

  async function fetchResumes() {
    try {
      const data = await resumeApi.list()
      setResumes(data)
    } catch (e) { console.error(e) }
  }

  async function handleGenerate(formData: any) {
    setLoading(true)
    try {
      const result = await resumeApi.generate(formData)
      setActiveResume(result.resume)
      await fetchResumes()
      setTab('editor')
    } catch (e: any) {
      alert('Generation failed: ' + e.message)
    } finally { setLoading(false) }
  }

  async function handleScore() {
    if (!activeResume || !jobDesc.trim()) return
    setLoading(true)
    try {
      const result = await resumeApi.scoreATS(activeResume.id, jobDesc)
      setAtsResult(result)
      setActiveResume({ ...activeResume, ats_score: result.overall_score })
      const history = await resumeApi.atsHistory(activeResume.id)
      setAtsHistory(history)
      setTab('score')
    } catch (e: any) {
      alert('Scoring failed: ' + e.message)
    } finally { setLoading(false) }
  }

  async function handleJDMatch() {
    if (!activeResume || !jdText.trim()) return
    setLoading(true)
    try {
      const result = await resumeApi.matchJD(activeResume.id, jdText)
      setJdResult(result)
      setTab('jd')
    } catch (e: any) {
      alert('JD match failed: ' + e.message)
    } finally { setLoading(false) }
  }

  async function handleExportPDF() {
    if (!activeResume) return
    await resumeApi.exportPDF(activeResume.id, activeResume.title)
  }

  async function handleSelectResume(id: string) {
    const data = await resumeApi.get(id)
    setActiveResume(data)
    const history = await resumeApi.atsHistory(id)
    setAtsHistory(history)
    setTab('editor')
  }

  const tabs = [
    { id: 'list', label: '📋 My Resumes' },
    { id: 'generate', label: '✨ Generate New' },
    { id: 'editor', label: '✏️ Editor', disabled: !activeResume },
    { id: 'score', label: '📊 ATS Score', disabled: !activeResume },
    { id: 'jd', label: '🎯 JD Match', disabled: !activeResume },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Resume Builder</h1>
          <p className="text-[#4a6680] text-sm mt-1">
            AI-powered · ATS optimized · {resumes.length} resume{resumes.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        {activeResume && (
          <button
            onClick={handleExportPDF}
            className="bg-[#00f0c8] text-black text-sm font-bold px-4 py-2 rounded-lg hover:bg-white transition-colors"
          >
            📥 Export PDF
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#0c1018] border border-[#1e2838] rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => !t.disabled && setTab(t.id as Tab)}
            disabled={t.disabled}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-[#00f0c8] text-black'
                : t.disabled
                ? 'text-[#2a3848] cursor-not-allowed'
                : 'text-[#7a96b0] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: LIST */}
      {tab === 'list' && (
        <ResumeList
          resumes={resumes}
          onSelect={handleSelectResume}
          onNew={() => setTab('generate')}
        />
      )}

      {/* TAB: GENERATE */}
      {tab === 'generate' && (
        <ResumeForm onSubmit={handleGenerate} loading={loading} />
      )}

      {/* TAB: EDITOR */}
      {tab === 'editor' && activeResume && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <ResumePreview resume={activeResume.content} />
          </div>
          <div className="space-y-4">
            <ATSScoreRing score={activeResume.ats_score} />
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
              <div className="text-sm font-bold text-white mb-3">Quick ATS Score</div>
              <textarea
                value={jobDesc}
                onChange={e => setJobDesc(e.target.value)}
                placeholder="Paste job description here..."
                rows={4}
                className="w-full bg-[#111620] border border-[#1e2838] rounded-lg p-3 text-sm text-white placeholder-[#4a6680] resize-none focus:outline-none focus:border-[#00f0c8]"
              />
              <button
                onClick={handleScore}
                disabled={loading || !jobDesc.trim()}
                className="w-full mt-2 bg-[#00f0c8] text-black text-sm font-bold py-2 rounded-lg hover:bg-white transition-colors disabled:opacity-40"
              >
                {loading ? 'Scoring...' : '⚡ Score Now'}
              </button>
            </div>
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
              <div className="text-sm font-bold text-white mb-3">JD Match</div>
              <textarea
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                placeholder="Paste job description..."
                rows={3}
                className="w-full bg-[#111620] border border-[#1e2838] rounded-lg p-3 text-sm text-white placeholder-[#4a6680] resize-none focus:outline-none focus:border-[#9b7bff]"
              />
              <button
                onClick={handleJDMatch}
                disabled={loading || !jdText.trim()}
                className="w-full mt-2 bg-[#9b7bff] text-white text-sm font-bold py-2 rounded-lg hover:brightness-110 transition-all disabled:opacity-40"
              >
                {loading ? 'Matching...' : '🎯 Match JD'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ATS SCORE */}
      {tab === 'score' && atsResult && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            {/* Score breakdown */}
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6">
              <div className="text-base font-bold text-white mb-4">Score Breakdown</div>
              {Object.entries(atsResult.breakdown || {}).map(([key, val]: any) => (
                <div key={key} className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#7a96b0] capitalize">{key.replace('_', ' ')}</span>
                    <span className="text-white font-bold">{val}%</span>
                  </div>
                  <div className="h-2 bg-[#1e2838] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${val}%`, background: val >= 80 ? '#00f0c8' : val >= 60 ? '#ffd84d' : '#ff7c4d' }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Suggestions */}
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6">
              <div className="text-base font-bold text-white mb-4">AI Suggestions</div>
              {(atsResult.suggestions || []).map((s: any, i: number) => (
                <div key={i} className="bg-[#111620] border border-[#1e2838] rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-[#00f0c8] uppercase tracking-wide font-bold">{s.section}</span>
                    <span className="text-xs text-[#39e87a] font-bold">{s.impact}</span>
                  </div>
                  <div className="text-sm text-white mb-1">{s.issue}</div>
                  <div className="text-xs text-[#4a6680]">→ {s.fix}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <ATSScoreRing score={atsResult.overall_score} grade={atsResult.grade} />
            <KeywordPanel matched={atsResult.matched_keywords} missing={atsResult.missing_keywords} />
            <ScoreHistoryChart history={atsHistory} />
          </div>
        </div>
      )}

      {/* TAB: JD MATCH */}
      {tab === 'jd' && jdResult && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6">
              <div className="text-base font-bold text-white mb-4">Rewrite Suggestions</div>
              {(jdResult.rewrite_suggestions || []).map((s: any, i: number) => (
                <div key={i} className="mb-4 border border-[#1e2838] rounded-xl overflow-hidden">
                  <div className="bg-red-500/5 border-b border-red-500/10 p-3">
                    <div className="text-xs text-red-400 uppercase tracking-wide mb-1">Before</div>
                    <div className="text-sm text-[#7a96b0]">{s.original}</div>
                  </div>
                  <div className="bg-[#00f0c8]/5 p-3">
                    <div className="text-xs text-[#00f0c8] uppercase tracking-wide mb-1">AI Rewrite</div>
                    <div className="text-sm text-white">{s.improved}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
              <div className="text-sm font-bold text-white mb-2">Overall Feedback</div>
              <p className="text-[#7a96b0] text-sm leading-relaxed">{jdResult.overall_feedback}</p>
            </div>
          </div>
          <div className="space-y-4">
            {/* Match score */}
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5 text-center">
              <div className="text-xs text-[#4a6680] uppercase tracking-wide mb-3">JD Match Score</div>
              <div className="text-5xl font-bold text-[#9b7bff] mb-1" style={{ fontFamily: 'monospace' }}>
                {jdResult.match_score}%
              </div>
              <div className="h-2 bg-[#1e2838] rounded-full mt-3 overflow-hidden">
                <div style={{ width: `${jdResult.match_score}%`, background: '#9b7bff', height: '100%', borderRadius: '100px' }} />
              </div>
            </div>
            <KeywordPanel
              matched={jdResult.matched}
              missing={jdResult.missing}
              partial={jdResult.partial}
            />
          </div>
        </div>
      )}
    </div>
  )
}