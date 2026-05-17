'use client'
import { useState, useEffect } from 'react'
import { analyticsApi } from '@/lib/api'

interface CareerPath {
  title: string
  match: number
  salary_range: string
  description: string
  matched_skills: string[]
  missing_skills: string[]
  roadmap: string[]
  color: string
}

const COLORS = ['#00f0c8', '#9b7bff', '#ff7c4d', '#39e87a', '#ffd84d']

export default function CareerPathPage() {
  const [skills, setSkills] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [paths, setPaths] = useState<CareerPath[]>([])
  const [selected, setSelected] = useState<CareerPath | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [targetRole, setTargetRole] = useState('')

  useEffect(() => {
    async function loadSkills() {
      try {
        const data = await analyticsApi.getSkills()
        setSkills(data)
      } catch (e) { console.error(e) }
      finally { setFetching(false) }
    }
    loadSkills()
  }, [])

  async function handleSuggest() {
    if (skills.length === 0) return
    setLoading(true)
    setError(null)
    setPaths([])
    setSelected(null)

    try {
      const res = await fetch('/api/career-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills, targetRole }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      const withColors = data.paths.map((p: CareerPath, i: number) => ({
        ...p, color: COLORS[i % COLORS.length]
      }))
      setPaths(withColors)
      setSelected(withColors[0])
    } catch (e: any) {
      setError('Failed to get suggestions: ' + e?.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🧭</span>
          <h1 className="text-2xl font-bold text-white">Career Path Suggester</h1>
        </div>
        <p className="text-[#4a6680] text-sm ml-12">AI analyzes your skills and suggests the best career paths for you</p>
      </div>

      {/* Skills + Input */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
          <div className="text-sm font-bold text-white mb-3">
            Your Skills
            <span className="text-xs text-[#4a6680] font-normal ml-2">
              {fetching ? 'Loading...' : `${skills.length} tracked`}
            </span>
          </div>

          {fetching ? (
            <div className="text-xs text-[#4a6680]">Loading skills...</div>
          ) : skills.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">📈</div>
              <div className="text-sm text-white font-bold mb-1">No skills tracked yet</div>
              <p className="text-xs text-[#4a6680]">Go to Analytics → Skill Progress to add skills first</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map(s => (
                <div key={s.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium"
                  style={{
                    background: `${s.level >= 80 ? '#39e87a' : s.level >= 60 ? '#00f0c8' : s.level >= 40 ? '#ffd84d' : '#ff7c4d'}15`,
                    borderColor: `${s.level >= 80 ? '#39e87a' : s.level >= 60 ? '#00f0c8' : s.level >= 40 ? '#ffd84d' : '#ff7c4d'}44`,
                    color: s.level >= 80 ? '#39e87a' : s.level >= 60 ? '#00f0c8' : s.level >= 40 ? '#ffd84d' : '#ff7c4d',
                  }}>
                  {s.skill_name}
                  <span className="opacity-60">{s.level}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-[#7a96b0] block mb-1.5">Target Role (optional)</label>
            <input
              className={inputCls}
              placeholder="e.g. Data Scientist, CTO..."
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
            />
            <p className="text-[10px] text-[#4a6680] mt-1.5">Leave blank for unbiased suggestions</p>
          </div>

          <button
            onClick={handleSuggest}
            disabled={loading || skills.length === 0 || fetching}
            className="w-full bg-[#00f0c8] text-black font-bold py-3 rounded-xl text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-auto"
          >
            {loading ? '🧭 Analyzing...' : '🧭 Suggest Paths'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#ff5c9c11] border border-[#ff5c9c44] rounded-xl p-3 text-sm text-[#ff5c9c] mb-6">
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4 animate-pulse">🧭</div>
          <div className="text-white font-bold mb-2">Analyzing your skills...</div>
          <div className="text-xs text-[#4a6680]">AI is mapping your potential career paths</div>
        </div>
      )}

      {/* Results */}
      {!loading && paths.length > 0 && (
        <div className="grid grid-cols-3 gap-6">
          {/* Path List */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#4a6680] uppercase tracking-wide mb-4">Suggested Paths</div>
            {paths.map((p, i) => (
              <div
                key={i}
                onClick={() => setSelected(p)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selected?.title === p.title
                    ? 'border-[#00f0c8] bg-[#00f0c808]'
                    : 'border-[#1e2838] bg-[#0c1018] hover:border-[#263040]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold text-white">{p.title}</div>
                  <div className="text-xs font-bold" style={{ color: p.color }}>{p.match}%</div>
                </div>
                {/* Match bar */}
                <div className="h-1.5 bg-[#1e2838] rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${p.match}%`, background: p.color }} />
                </div>
                <div className="text-[10px] text-[#4a6680]">{p.salary_range}</div>
              </div>
            ))}
          </div>

          {/* Path Detail */}
          {selected && (
            <div className="col-span-2 space-y-4">
              {/* Title & Match */}
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">{selected.title}</h2>
                    <div className="text-xs text-[#4a6680] mt-0.5">{selected.salary_range}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold" style={{ color: selected.color }}>{selected.match}%</div>
                    <div className="text-[10px] text-[#4a6680]">skill match</div>
                  </div>
                </div>
                <div className="h-2.5 bg-[#1e2838] rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${selected.match}%`, background: selected.color }} />
                </div>
                <p className="text-sm text-[#7a96b0] leading-relaxed">{selected.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Matched Skills */}
                <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                  <div className="text-xs font-bold text-[#39e87a] mb-3">✅ You already have</div>
                  <div className="flex flex-wrap gap-2">
                    {selected.matched_skills.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-lg bg-[#39e87a15] border border-[#39e87a33] text-[#39e87a]">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Missing Skills */}
                <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                  <div className="text-xs font-bold text-[#ff7c4d] mb-3">📚 You need to learn</div>
                  <div className="flex flex-wrap gap-2">
                    {selected.missing_skills.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-lg bg-[#ff7c4d15] border border-[#ff7c4d33] text-[#ff7c4d]">{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Roadmap */}
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                <div className="text-xs font-bold text-white mb-4">🗺️ Roadmap to get there</div>
                <div className="space-y-3">
                  {selected.roadmap.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ background: `${selected.color}22`, color: selected.color, border: `1px solid ${selected.color}44` }}>
                        {i + 1}
                      </div>
                      <div className="text-sm text-[#7a96b0] leading-relaxed">{step}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && paths.length === 0 && !error && (
        <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">🧭</div>
          <div className="text-white font-bold text-lg mb-2">Discover your career paths</div>
          <p className="text-[#4a6680] text-sm">
            {skills.length === 0
              ? 'Add skills in Analytics → Skill Progress first'
              : 'Click "Suggest Paths" to see AI-powered career recommendations'}
          </p>
        </div>
      )}
    </div>
  )
}