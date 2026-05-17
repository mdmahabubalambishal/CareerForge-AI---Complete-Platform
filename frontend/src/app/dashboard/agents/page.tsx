'use client'
import { useState, useEffect } from 'react'
import { agentsApi } from '@/lib/api'

type Tab = 'scraper' | 'bulk' | 'results' | 'history'

export default function AgentsPage() {
  const [tab, setTab] = useState<Tab>('scraper')
  const [scrapedJobs, setScrapedJobs] = useState<any[]>([])
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [application, setApplication] = useState<any>(null)
  const [bulkResults, setBulkResults] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Scraper form
  const [role, setRole] = useState('LLM Engineer')
  const [location, setLocation] = useState('Remote')
  const [skills, setSkills] = useState('Python, LangChain, FastAPI, RAG')
  const [count, setCount] = useState(8)

  // User profile
  const [userName, setUserName] = useState('Mahabub Alam Bishal')
  const [userSkills, setUserSkills] = useState('Python, LangChain, FastAPI, RAG, Groq, Docker')
  const [userExp, setUserExp] = useState('AI Engineer with 2 years experience building LLM apps')

  // Bulk apply
  const [minScore, setMinScore] = useState(70)
  const [maxApps, setMaxApps] = useState(3)

  useEffect(() => {
    fetchScrapedJobs()
    fetchHistory()
  }, [])

  async function fetchScrapedJobs() {
    try {
      const data = await agentsApi.getScrapedJobs()
      setScrapedJobs(data)
    } catch (e) { console.error(e) }
  }

  async function fetchHistory() {
    try {
      const data = await agentsApi.getHistory()
      setHistory(data)
    } catch (e) { console.error(e) }
  }

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await agentsApi.scrapeJobs(role, location, skills, count)
      setScrapedJobs(data.jobs)
      setTab('results')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAutoApply(job: any) {
    setLoading(true)
    setSelectedJob(job)
    setApplication(null)
    try {
      const profile = { name: userName, skills: userSkills, experience: userExp }
      const data = await agentsApi.autoApply(job.id, profile)
      setApplication(data.application)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleBulkApply(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setBulkResults(null)
    try {
      const profile = { name: userName, skills: userSkills, experience: userExp }
      const data = await agentsApi.bulkApply({
        role, location, skills,
        user_profile: profile,
        min_match_score: minScore,
        max_applications: maxApps,
      })
      setBulkResults(data)
      await fetchScrapedJobs()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleClearJobs() {
    await agentsApi.clearScrapedJobs()
    setScrapedJobs([])
    setSelectedJob(null)
    setApplication(null)
  }

  const inputCls = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors'
  const labelCls = 'text-[#7a96b0] text-xs font-medium block mb-1.5'

  const scoreColor = (s: number) => s >= 80 ? '#39e87a' : s >= 60 ? '#00f0c8' : s >= 40 ? '#ffd84d' : '#ff7c4d'
  const recColor = (r: string) => r === 'apply' ? '#39e87a' : r === 'consider' ? '#ffd84d' : '#ff5c9c'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Agents</h1>
          <p className="text-[#4a6680] text-sm mt-1">
            Autonomous job hunting — find, match, and apply with AI
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-[#39e87a]/10 border border-[#39e87a]/20 text-[#39e87a] text-xs px-3 py-1.5 rounded-full font-bold">
            ● Agent Online
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#0c1018] border border-[#1e2838] rounded-xl p-1 flex-wrap">
        {[
          { id: 'scraper', label: '🤖 Job Scraper' },
          { id: 'bulk', label: '⚡ Bulk Apply' },
          { id: 'results', label: `📋 Results ${scrapedJobs.length > 0 ? `(${scrapedJobs.length})` : ''}` },
          { id: 'history', label: '📜 History' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-[#00f0c8] text-black' : 'text-[#7a96b0] hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* JOB SCRAPER */}
      {tab === 'scraper' && (
        <div className="grid grid-cols-3 gap-5">
          <div className="space-y-4">
            {/* Search Config */}
            <form onSubmit={handleScrape} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
              <div className="text-sm font-bold text-white mb-4">🤖 Job Search Config</div>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Target Role *</label>
                  <input className={inputCls} value={role} onChange={e => setRole(e.target.value)} placeholder="LLM Engineer" required />
                </div>
                <div>
                  <label className={labelCls}>Location</label>
                  <input className={inputCls} value={location} onChange={e => setLocation(e.target.value)} placeholder="Remote / USA / Bangladesh" />
                </div>
                <div>
                  <label className={labelCls}>Your Skills</label>
                  <textarea className={inputCls + ' resize-none'} rows={2} value={skills} onChange={e => setSkills(e.target.value)} placeholder="Python, LangChain, FastAPI..." />
                </div>
                <div>
                  <label className={labelCls}>Number of Jobs: {count}</label>
                  <input type="range" min="3" max="15" value={count}
                    onChange={e => setCount(parseInt(e.target.value))}
                    className="w-full accent-[#00f0c8]" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-[#00f0c8] text-black font-bold py-3 rounded-lg text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                  {loading ? <><span className="animate-spin">🤖</span> Agent Running...</> : '🤖 Start Job Scraper'}
                </button>
              </div>
            </form>

            {/* User Profile */}
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
              <div className="text-sm font-bold text-white mb-4">👤 Your Profile (for matching)</div>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Your Name</label>
                  <input className={inputCls} value={userName} onChange={e => setUserName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Your Skills</label>
                  <input className={inputCls} value={userSkills} onChange={e => setUserSkills(e.target.value)} placeholder="Python, LangChain..." />
                </div>
                <div>
                  <label className={labelCls}>Experience Summary</label>
                  <textarea className={inputCls + ' resize-none'} rows={2} value={userExp} onChange={e => setUserExp(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="col-span-2">
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6">
              <div className="text-sm font-bold text-white mb-5">How the Job Scraper Agent Works</div>
              <div className="space-y-4">
                {[
                  { step: '01', icon: '🔍', title: 'Search', desc: 'Agent searches for jobs matching your role, location, and skills using AI', color: '#00f0c8' },
                  { step: '02', icon: '📊', title: 'Match Score', desc: 'Each job gets a match score (0-100%) based on your skills vs requirements', color: '#9b7bff' },
                  { step: '03', icon: '📋', title: 'Results', desc: 'Jobs sorted by match score — highest first. Click any job to auto-apply', color: '#ff7c4d' },
                  { step: '04', icon: '✉️', title: 'Auto-Apply', desc: 'One click generates tailored resume summary + cover letter for that job', color: '#39e87a' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: s.color + '20', color: s.color }}>
                      {s.step}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white mb-1">{s.icon} {s.title}</div>
                      <div className="text-xs text-[#7a96b0]">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {scrapedJobs.length > 0 && (
                <div className="mt-5 bg-[#39e87a]/05 border border-[#39e87a]/20 rounded-xl p-4">
                  <div className="text-sm font-bold text-[#39e87a] mb-1">
                    ✅ {scrapedJobs.length} jobs found!
                  </div>
                  <div className="text-xs text-[#7a96b0]">
                    Go to Results tab to view and apply →
                  </div>
                  <button
                    onClick={() => setTab('results')}
                    className="mt-2 text-xs text-[#00f0c8] hover:underline"
                  >
                    View Results →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BULK APPLY */}
      {tab === 'bulk' && (
        <div className="grid grid-cols-3 gap-5">
          <div>
            <form onSubmit={handleBulkApply} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
              <div className="text-sm font-bold text-white mb-4">⚡ Bulk Apply Config</div>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Target Role *</label>
                  <input className={inputCls} value={role} onChange={e => setRole(e.target.value)} placeholder="LLM Engineer" required />
                </div>
                <div>
                  <label className={labelCls}>Location</label>
                  <input className={inputCls} value={location} onChange={e => setLocation(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Your Skills</label>
                  <textarea className={inputCls + ' resize-none'} rows={2} value={skills} onChange={e => setSkills(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Min Match Score: {minScore}%</label>
                  <input type="range" min="50" max="95" value={minScore}
                    onChange={e => setMinScore(parseInt(e.target.value))}
                    className="w-full accent-[#9b7bff]" />
                </div>
                <div>
                  <label className={labelCls}>Max Applications: {maxApps}</label>
                  <input type="range" min="1" max="10" value={maxApps}
                    onChange={e => setMaxApps(parseInt(e.target.value))}
                    className="w-full accent-[#9b7bff]" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-[#9b7bff] text-white font-bold py-3 rounded-lg text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                  {loading ? <><span className="animate-spin">⚡</span> Agent Working...</> : '⚡ Start Bulk Apply Agent'}
                </button>
              </div>
            </form>
          </div>

          <div className="col-span-2">
            {!bulkResults && !loading && (
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-8 text-center h-full flex items-center justify-center">
                <div>
                  <div className="text-5xl mb-4">⚡</div>
                  <div className="text-white font-bold text-lg mb-2">Bulk Apply Agent</div>
                  <p className="text-[#4a6680] text-sm max-w-sm mx-auto">
                    Configure the agent on the left. It will find jobs, score them, and generate tailored applications for the best matches automatically.
                  </p>
                </div>
              </div>
            )}

            {loading && (
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-8 text-center">
                <div className="text-4xl mb-4 animate-spin">⚡</div>
                <div className="text-white font-bold mb-2">Agent is working...</div>
                <div className="space-y-2 text-sm text-[#4a6680]">
                  <div>🔍 Searching for {role} jobs...</div>
                  <div>📊 Calculating match scores...</div>
                  <div>✉️ Generating cover letters...</div>
                </div>
              </div>
            )}

            {bulkResults && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-[#00f0c8]">{bulkResults.total_found}</div>
                    <div className="text-xs text-[#4a6680] mt-1">Jobs Found</div>
                  </div>
                  <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-[#39e87a]">{bulkResults.total_applied}</div>
                    <div className="text-xs text-[#4a6680] mt-1">Applications Generated</div>
                  </div>
                  <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-[#9b7bff]">{minScore}%+</div>
                    <div className="text-xs text-[#4a6680] mt-1">Match Threshold</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {bulkResults.applications.map((app: any, i: number) => (
                    <div key={i} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-sm font-bold text-white">{app.job.role}</div>
                          <div className="text-xs text-[#4a6680]">{app.job.company} · {app.job.location}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: scoreColor(app.job.match_score) }}>
                            {app.job.match_score}%
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded font-bold"
                            style={{ background: recColor(app.application.recommendation) + '20', color: recColor(app.application.recommendation) }}>
                            {app.application.recommendation}
                          </span>
                        </div>
                      </div>
                      <div className="bg-[#111620] border border-[#1e2838] rounded-lg p-3 text-xs text-[#7a96b0] leading-relaxed">
                        <div className="text-[#00f0c8] font-bold mb-1">Cover Letter Preview:</div>
                        {app.application.cover_letter.slice(0, 200)}...
                      </div>
                      <div className="flex gap-2 mt-2">
                        <a
                          href={app.job.job_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-[#00f0c8] text-black font-bold px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
                        >
                          {"Apply Now"}
                        </a>
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(app.application.cover_letter)
                            alert('Cover letter copied!')
                          }}
                          className="text-xs bg-[#111620] border border-[#1e2838] text-[#7a96b0] px-3 py-1.5 rounded-lg hover:text-white"
                        >
                          📋 Copy Cover Letter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULTS */}
      {tab === 'results' && (
        <div>
          {scrapedJobs.length === 0 ? (
            <div className="text-center py-16 bg-[#0c1018] border border-[#1e2838] rounded-xl">
              <div className="text-5xl mb-4">🤖</div>
              <div className="text-white font-bold text-lg mb-2">No jobs scraped yet</div>
              <p className="text-[#4a6680] text-sm mb-6">Go to Job Scraper tab and run the agent</p>
              <button onClick={() => setTab('scraper')} className="bg-[#00f0c8] text-black font-bold px-6 py-3 rounded-lg">
                🤖 Start Agent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {/* Job List */}
              <div className="col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-white">{scrapedJobs.length} jobs found</div>
                  <button onClick={handleClearJobs} className="text-xs text-[#4a6680] hover:text-red-400">Clear all</button>
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {scrapedJobs.map((job, i) => (
                    <div
                      key={job.id || i}
                      onClick={() => { setSelectedJob(job); setApplication(null) }}
                      className={`bg-[#0c1018] border rounded-xl p-3 cursor-pointer transition-all ${
                        selectedJob?.id === job.id
                          ? 'border-[#00f0c8]'
                          : 'border-[#1e2838] hover:border-[#263040]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="text-xs text-[#4a6680]">{job.company}</div>
                        <span className="text-xs font-bold" style={{ color: scoreColor(job.match_score) }}>
                          {job.match_score}%
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white mb-1">{job.role}</div>
                      <div className="text-xs text-[#4a6680]">{job.location}</div>
                      {job.salary && <div className="text-xs text-[#39e87a] mt-1">{job.salary}</div>}
                      {job.applied && <div className="text-[10px] text-[#9b7bff] mt-1">✓ Applied</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Job Detail + Application */}
              <div className="col-span-2 space-y-4">
                {selectedJob ? (
                  <>
                    <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-base font-bold text-white">{selectedJob.role}</div>
                          <div className="text-sm text-[#4a6680]">{selectedJob.company} · {selectedJob.location}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold" style={{ color: scoreColor(selectedJob.match_score) }}>
                            {selectedJob.match_score}%
                          </div>
                          <div className="text-xs text-[#4a6680]">match</div>
                        </div>
                      </div>
                      {selectedJob.salary && (
                        <div className="text-sm font-bold text-[#39e87a] mb-2">{selectedJob.salary}</div>
                      )}
                      <p className="text-sm text-[#7a96b0] leading-relaxed mb-4">{selectedJob.description}</p>
                      {selectedJob.job_url && (
                        <a href={selectedJob.job_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[#00f0c8] hover:underline">
                          View Job Posting →
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => handleAutoApply(selectedJob)}
                      disabled={loading || selectedJob.applied}
                      className="w-full bg-[#9b7bff] text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <><span className="animate-spin">⚡</span> Generating Application...</>
                      ) : selectedJob.applied ? (
                        '✓ Already Applied'
                      ) : (
                        '⚡ Auto-Generate Application'
                      )}
                    </button>

                    {application && (
                      <div className="space-y-3">
                        {/* Match Analysis */}
                        <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-bold text-white">Match Analysis</div>
                            <span className="text-sm font-bold px-3 py-1 rounded-full"
                              style={{ background: recColor(application.recommendation) + '20', color: recColor(application.recommendation) }}>
                              {application.recommendation?.toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-[#39e87a] font-bold mb-2">✅ Your Matches</div>
                              <div className="flex flex-wrap gap-1">
                                {application.key_matches?.map((s: string) => (
                                  <span key={s} className="text-[10px] bg-[#39e87a]/10 border border-[#39e87a]/20 text-[#39e87a] px-2 py-0.5 rounded">{s}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-[#ff7c4d] font-bold mb-2">⚠️ Skill Gaps</div>
                              <div className="flex flex-wrap gap-1">
                                {application.missing_skills?.map((s: string) => (
                                  <span key={s} className="text-[10px] bg-[#ff7c4d]/10 border border-[#ff7c4d]/20 text-[#ff7c4d] px-2 py-0.5 rounded">{s}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Tailored Summary */}
                        <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                          <div className="text-xs font-bold text-[#00f0c8] uppercase tracking-wide mb-2">Tailored Resume Summary</div>
                          <p className="text-sm text-[#c8d8e8] leading-relaxed">{application.tailored_summary}</p>
                        </div>

                        {/* Cover Letter */}
                        <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-[#9b7bff] uppercase tracking-wide">Cover Letter</div>
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(application.cover_letter)
                                setCopied(true)
                                setTimeout(() => setCopied(false), 2000)
                              }}
                              className="text-xs text-[#4a6680] hover:text-white"
                            >
                              {copied ? '✅ Copied!' : '📋 Copy'}
                            </button>
                          </div>
                          <div className="text-sm text-[#c8d8e8] leading-relaxed whitespace-pre-wrap font-mono text-xs bg-[#111620] border border-[#1e2838] rounded-lg p-3">
                            {application.cover_letter}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-8 text-center h-64 flex items-center justify-center">
                    <div>
                      <div className="text-4xl mb-3">👈</div>
                      <div className="text-white font-bold mb-2">Select a job</div>
                      <div className="text-[#4a6680] text-sm">Click any job to view details and auto-apply</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      {tab === 'history' && (
        <div className="max-w-3xl">
          {history.length === 0 ? (
            <div className="text-center py-16 bg-[#0c1018] border border-[#1e2838] rounded-xl">
              <div className="text-5xl mb-4">📜</div>
              <div className="text-white font-bold mb-2">No agent history yet</div>
              <p className="text-[#4a6680] text-sm">Run the Job Scraper to see history here</p>
            </div>
          ) : (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#1e2838] text-sm font-bold text-white">Agent Run History</div>
              {history.map((h, i) => (
                <div key={h.id} className={`p-4 flex items-center gap-4 ${i < history.length - 1 ? 'border-b border-[#1e2838]' : ''}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${h.status === 'completed' ? 'bg-[#39e87a]' : h.status === 'running' ? 'bg-[#ffd84d]' : 'bg-[#ff5c9c]'}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white capitalize">{h.agent_type.replace('_', ' ')}</div>
                    <div className="text-xs text-[#4a6680]">{new Date(h.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold" style={{ color: h.status === 'completed' ? '#39e87a' : '#ffd84d' }}>
                      {h.status}
                    </div>
                    {h.output_data?.jobs_found && (
                      <div className="text-xs text-[#4a6680]">{h.output_data.jobs_found} jobs</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
