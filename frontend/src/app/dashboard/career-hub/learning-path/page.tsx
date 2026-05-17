'use client'
import { useState, useEffect } from 'react'
import { analyticsApi } from '@/lib/api'

interface Course {
  title: string
  provider: string
  level: string
  duration: string
  why_recommended: string
  skills_covered: string[]
  url_hint: string
  priority: 'must_have' | 'recommended' | 'nice_to_have'
  free: boolean
}

interface LearningPath {
  target_role: string
  summary: string
  estimated_time: string
  courses: Course[]
  skill_gaps: string[]
  next_milestone: string
}

const PRIORITY_COLORS = {
  must_have: '#ff5c9c',
  recommended: '#ffd84d',
  nice_to_have: '#39e87a',
}

const PRIORITY_LABELS = {
  must_have: 'Must Have',
  recommended: 'Recommended',
  nice_to_have: 'Nice to Have',
}

export default function LearningPathPage() {
  const [skills, setSkills] = useState<any[]>([])
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [path, setPath] = useState<LearningPath | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [targetRole, setTargetRole] = useState('')
  const [filter, setFilter] = useState<'all' | 'must_have' | 'recommended' | 'nice_to_have' | 'free'>('all')
  const [completed, setCompleted] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('completed_courses') || '[]') } catch { return [] }
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

  useEffect(() => {
    localStorage.setItem('completed_courses', JSON.stringify(completed))
  }, [completed])

  async function handleGenerate() {
    if (!targetRole.trim()) return
    setLoading(true)
    setError(null)
    setPath(null)

    try {
      const res = await fetch('/api/learning-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skills: skills.map(s => ({ name: s.skill_name, level: s.level })),
          targetRole,
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setPath(data.path)
    } catch (e: any) {
      setError('Failed to generate: ' + e?.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleCompleted(title: string) {
    setCompleted(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    )
  }

  const filteredCourses = path?.courses.filter(c => {
    if (filter === 'all') return true
    if (filter === 'free') return c.free
    return c.priority === filter
  }) || []

  const completedCount = path?.courses.filter(c => completed.includes(c.title)).length || 0
  const totalCourses = path?.courses.length || 0
  const progressPct = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0

  const inputCls = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#ffd84d] transition-colors'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🎓</span>
          <h1 className="text-2xl font-bold text-white">Learning Path</h1>
        </div>
        <p className="text-[#4a6680] text-sm ml-12">AI recommends courses and certifications based on your skills and target role</p>
      </div>

      {/* Input */}
      <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5 mb-6">
        <div className="grid grid-cols-3 gap-4 items-end">
          <div className="col-span-2">
            <label className="text-xs font-bold text-white block mb-2">
              Target Role *
              <span className="text-[#4a6680] font-normal ml-2">What role do you want to land?</span>
            </label>
            <input className={inputCls}
              placeholder="e.g. AI Engineer, Full Stack Developer, Data Scientist..."
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()} />
          </div>
          <button onClick={handleGenerate}
            disabled={loading || !targetRole.trim() || fetching}
            className="w-full bg-[#ffd84d] text-black font-bold py-2.5 rounded-xl text-sm hover:brightness-110 transition-all disabled:opacity-40">
            {loading ? '⚡ Generating...' : '🎓 Generate Path'}
          </button>
        </div>

        {/* Current Skills Preview */}
        {skills.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#1e2838]">
            <div className="text-xs text-[#4a6680] mb-2">Your current skills ({skills.length}):</div>
            <div className="flex flex-wrap gap-1.5">
              {skills.slice(0, 10).map(s => (
                <span key={s.id} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e2838] text-[#7a96b0]">
                  {s.skill_name} {s.level}%
                </span>
              ))}
              {skills.length > 10 && <span className="text-[10px] text-[#4a6680]">+{skills.length - 10} more</span>}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-[#ff5c9c11] border border-[#ff5c9c44] rounded-xl p-3 text-sm text-[#ff5c9c] mb-4">
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4 animate-pulse">🎓</div>
          <div className="text-white font-bold mb-2">Building your learning path...</div>
          <div className="text-xs text-[#4a6680]">AI is analyzing your skills and finding the best courses</div>
        </div>
      )}

      {/* Results */}
      {!loading && path && (
        <div className="space-y-5">
          {/* Path Summary */}
          <div className="bg-gradient-to-br from-[#ffd84d]/10 to-[#ff7c4d]/10 border border-[#ffd84d]/20 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-white">{path.target_role}</h2>
                <div className="text-xs text-[#ffd84d] mt-0.5">⏱ {path.estimated_time}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#ffd84d]">{progressPct}%</div>
                <div className="text-[10px] text-[#4a6680]">{completedCount}/{totalCourses} done</div>
              </div>
            </div>
            <div className="h-2 bg-[#1e2838] rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full bg-[#ffd84d] transition-all duration-700"
                style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-sm text-[#7a96b0] leading-relaxed mb-3">{path.summary}</p>
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-3">
              <div className="text-xs font-bold text-[#ffd84d] mb-1">🎯 Next Milestone</div>
              <p className="text-xs text-[#7a96b0]">{path.next_milestone}</p>
            </div>
          </div>

          {/* Skill Gaps */}
          {path.skill_gaps.length > 0 && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
              <div className="text-xs font-bold text-[#ff5c9c] mb-3">⚡ Key Skill Gaps to Fill</div>
              <div className="flex flex-wrap gap-2">
                {path.skill_gaps.map((gap, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-[#ff5c9c15] border border-[#ff5c9c33] text-[#ff5c9c]">
                    {gap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'all', label: `All (${path.courses.length})` },
              { id: 'must_have', label: '🔴 Must Have' },
              { id: 'recommended', label: '🟡 Recommended' },
              { id: 'nice_to_have', label: '🟢 Nice to Have' },
              { id: 'free', label: '🆓 Free Only' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id as any)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  filter === f.id
                    ? 'bg-[#ffd84d] text-black border-[#ffd84d]'
                    : 'bg-[#0c1018] border-[#1e2838] text-[#7a96b0] hover:border-[#263040]'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Course List */}
          <div className="space-y-3">
            {filteredCourses.map((course, i) => {
              const isDone = completed.includes(course.title)
              return (
                <div key={i}
                  className={`bg-[#0c1018] border rounded-xl p-4 transition-all ${
                    isDone ? 'border-[#39e87a44] opacity-70' : 'border-[#1e2838] hover:border-[#263040]'
                  }`}>
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button onClick={() => toggleCompleted(course.title)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                        isDone ? 'bg-[#39e87a] border-[#39e87a]' : 'border-[#1e2838] hover:border-[#39e87a]'
                      }`}>
                      {isDone && <span className="text-black text-xs font-bold">✓</span>}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div>
                          <div className={`text-sm font-bold ${isDone ? 'line-through text-[#4a6680]' : 'text-white'}`}>
                            {course.title}
                          </div>
                          <div className="text-xs text-[#4a6680] mt-0.5">
                            {course.provider} · {course.level} · {course.duration}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {course.free && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#39e87a22] border border-[#39e87a44] text-[#39e87a] font-bold">FREE</span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ background: `${PRIORITY_COLORS[course.priority]}22`, color: PRIORITY_COLORS[course.priority], border: `1px solid ${PRIORITY_COLORS[course.priority]}44` }}>
                            {PRIORITY_LABELS[course.priority]}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[#7a96b0] leading-relaxed mb-2">{course.why_recommended}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1.5">
                          {course.skills_covered.map((skill, si) => (
                            <span key={si} className="text-[10px] px-2 py-0.5 rounded-full bg-[#ffd84d15] border border-[#ffd84d33] text-[#ffd84d]">
                              {skill}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-[#4a6680] ml-3 flex-shrink-0">{course.url_hint}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !path && (
        <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-16 text-center">
          <div className="text-5xl mb-4">🎓</div>
          <div className="text-white font-bold text-lg mb-2">Build your learning path</div>
          <p className="text-[#4a6680] text-sm">Enter your target role and AI will recommend the best courses to get there</p>
        </div>
      )}
    </div>
  )
}