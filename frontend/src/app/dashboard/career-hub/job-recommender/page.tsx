'use client'
import { useState, useEffect } from 'react'
import { analyticsApi } from '@/lib/api'

interface JobRecommendation {
  title: string
  company_type: string
  match_score: number
  salary_range: string
  required_skills: string[]
  your_matching_skills: string[]
  missing_skills: string[]
  why_good_fit: string
  job_boards: string[]
  color: string
}

const COLORS = ['#00f0c8', '#9b7bff', '#ff7c4d', '#39e87a', '#ffd84d', '#4d9fff']

export default function JobRecommenderPage() {
  const [skills, setSkills] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [jobs, setJobs] = useState<JobRecommendation[]>([])
  const [selected, setSelected] = useState<JobRecommendation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preferences, setPreferences] = useState({
    location: '',
    work_mode: 'remote' as 'remote' | 'hybrid' | 'onsite',
    experience: 'mid' as 'junior' | 'mid' | 'senior',
    industry: '',
  })

  useEffect(() => {
    async function load() {
      try {
        const data = await analyticsApi.getSkills()
        setSkills(data)
      } catch (e) { console.error(e) }
      finally { setFetching(false) }
    }
    load()
  }, [])

  async function handleRecommend() {
    if (skills.length === 0) return
    setLoading(true)
    setError(null)
    setJobs([])
    setSelected(null)

    try {
      const res = await fetch('/api/job-recommender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills, preferences }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      const withColors = data.jobs.map((j: JobRecommendation, i: number) => ({
        ...j, color: COLORS[i % COLORS.length]
      }))
      setJobs(withColors)
      setSelected(withColors[0])
    } catch (e: any) {
      setError('Failed to get recommendations: ' + e?.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors'
  const levelColor = (l: number) => l >= 80 ? '#39e87a' : l >= 60 ? '#00f0c8' : l >= 40 ? '#ffd84d' : '#ff7c4d'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🔍</span>
          <h1 className="text-2xl font-bold text-white">Job Recommender</h1>
        </div>
        <p className="text-[#4a6680] text-sm ml-12">AI analyzes your skills and recommends the most relevant jobs for you</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* LEFT — Skills + Preferences */}
        <div className="space-y-4">
          {/* Skills */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
            <div className="text-xs font-bold text-white mb-3">
              Your Skills
              <span className="text-[#4a6680] font-normal ml-2">{fetching ? 'Loading...' : `${skills.length} tracked`}</span>
            </div>
            {fetching ? (
              <div className="text-xs text-[#4a6680]">Loading...</div>
            ) : skills.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-xs text-[#4a6680]">No skills tracked yet</div>
                <div className="text-[10px] text-[#4a6680] mt-1">Go to Analytics → Skills to add skills</div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {skills.map(s => (
                  <div key={s.id} className="text-[10px] px-2 py-1 rounded-lg border font-medium"
                    style={{
                      background: `${levelColor(s.level)}15`,
                      borderColor: `${levelColor(s.level)}44`,
                      color: levelColor(s.level),
                    }}>
                    {s.skill_name} {s.level}%
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preferences */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-white mb-1">Preferences</div>
            <div>
              <label className="text-xs text-[#7a96b0] block mb-1.5">Location</label>
              <input className={inputCls} placeholder="e.g. Dhaka, Remote, USA"
                value={preferences.location}
                onChange={e => setPreferences(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-[#7a96b0] block mb-1.5">Work Mode</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['remote', 'hybrid', 'onsite'] as const).map(mode => (
                  <button key={mode} onClick={() => setPreferences(p => ({ ...p, work_mode: mode }))}
                    className={`py-2 rounded-lg text-[10px] font-bold border transition-all capitalize ${
                      preferences.work_mode === mode
                        ? 'bg-[#00f0c8] text-black border-[#00f0c8]'
                        : 'bg-[#111620] border-[#1e2838] text-[#7a96b0] hover:border-[#263040]'
                    }`}>
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[#7a96b0] block mb-1.5">Experience Level</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['junior', 'mid', 'senior'] as const).map(exp => (
                  <button key={exp} onClick={() => setPreferences(p => ({ ...p, experience: exp }))}
                    className={`py-2 rounded-lg text-[10px] font-bold border transition-all capitalize ${
                      preferences.experience === exp
                        ? 'bg-[#9b7bff] text-white border-[#9b7bff]'
                        : 'bg-[#111620] border-[#1e2838] text-[#7a96b0] hover:border-[#263040]'
                    }`}>
                    {exp}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[#7a96b0] block mb-1.5">Industry (optional)</label>
              <input className={inputCls} placeholder="e.g. Fintech, Healthcare, SaaS"
                value={preferences.industry}
                onChange={e => setPreferences(p => ({ ...p, industry: e.target.value }))} />
            </div>
          </div>

          {error && (
            <div className="bg-[#ff5c9c11] border border-[#ff5c9c44] rounded-xl p-3 text-sm text-[#ff5c9c]">
              ❌ {error}
            </div>
          )}

          <button onClick={handleRecommend}
            disabled={loading || skills.length === 0 || fetching}
            className="w-full bg-[#00f0c8] text-black font-bold py-3 rounded-xl text-sm hover:brightness-110 transition-all disabled:opacity-40">
            {loading ? '🔍 Finding jobs...' : '🔍 Find My Jobs'}
          </button>
        </div>

        {/* MIDDLE — Job List */}
        <div className="space-y-3">
          {loading && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3 animate-pulse">🔍</div>
              <div className="text-white font-bold mb-1">Finding best jobs...</div>
              <div className="text-xs text-[#4a6680]">AI is matching your skills to roles</div>
            </div>
          )}

          {!loading && jobs.length === 0 && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-white font-bold mb-1">No recommendations yet</div>
              <div className="text-xs text-[#4a6680]">Click "Find My Jobs" to get started</div>
            </div>
          )}

          {jobs.map((job, i) => (
            <div key={i} onClick={() => setSelected(job)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selected?.title === job.title
                  ? 'border-[#00f0c8] bg-[#00f0c808]'
                  : 'border-[#1e2838] bg-[#0c1018] hover:border-[#263040]'
              }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{job.title}</div>
                  <div className="text-xs text-[#4a6680] mt-0.5">{job.company_type}</div>
                </div>
                <div className="text-sm font-bold ml-2 flex-shrink-0" style={{ color: job.color }}>
                  {job.match_score}%
                </div>
              </div>
              <div className="h-1.5 bg-[#1e2838] rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${job.match_score}%`, background: job.color }} />
              </div>
              <div className="text-[10px] text-[#4a6680]">{job.salary_range}</div>
            </div>
          ))}
        </div>

        {/* RIGHT — Job Detail */}
        <div>
          {selected ? (
            <div className="space-y-4">
              {/* Title */}
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-base font-bold text-white">{selected.title}</h2>
                    <div className="text-xs text-[#4a6680] mt-0.5">{selected.company_type}</div>
                    <div className="text-xs text-[#4a6680] mt-0.5">{selected.salary_range}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold" style={{ color: selected.color }}>{selected.match_score}%</div>
                    <div className="text-[10px] text-[#4a6680]">match</div>
                  </div>
                </div>
                <div className="h-2 bg-[#1e2838] rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full" style={{ width: `${selected.match_score}%`, background: selected.color }} />
                </div>
                <p className="text-xs text-[#7a96b0] leading-relaxed">{selected.why_good_fit}</p>
              </div>

              {/* Skills Match */}
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                <div className="text-xs font-bold text-[#39e87a] mb-2">✅ Your Matching Skills</div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selected.your_matching_skills.map((s, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-[#39e87a15] border border-[#39e87a33] text-[#39e87a]">{s}</span>
                  ))}
                </div>
                <div className="text-xs font-bold text-[#ff7c4d] mb-2">📚 Skills to Learn</div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.missing_skills.map((s, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-[#ff7c4d15] border border-[#ff7c4d33] text-[#ff7c4d]">{s}</span>
                  ))}
                </div>
              </div>

              {/* Where to Apply */}
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                <div className="text-xs font-bold text-white mb-3">🌐 Where to Apply</div>
                <div className="space-y-2">
                  {selected.job_boards.map((board, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[#7a96b0] py-1.5 border-b border-[#1e2838] last:border-0">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: selected.color }} />
                      {board}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">👆</div>
              <div className="text-white font-bold mb-1">Select a job</div>
              <div className="text-xs text-[#4a6680]">Click a recommendation to see details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}