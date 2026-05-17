'use client'
import { useState } from 'react'
import { interviewApi } from '@/lib/api'

async function getAuthHeadersHelper() {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  }
}

export default function SkillsPage() {
  const [targetRole, setTargetRole] = useState('')
  const [currentSkills, setCurrentSkills] = useState('')
  const [requiredSkills, setRequiredSkills] = useState<string[]>([])
  const [quizResult, setQuizResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)

  const inputCls =
    'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors'
  const labelCls = 'text-[#7a96b0] text-xs font-medium block mb-1.5'

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setAnalyzed(false)
    setRequiredSkills([])
    setQuizResult(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL
      const headers = await getAuthHeadersHelper()

      // Step 1: AI দিয়ে required skills আনো
      const skillsRes = await fetch(`${API_URL}/api/v1/interview/role-skills`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ role: targetRole }),
      })
      const skillsData = await skillsRes.json()
      setRequiredSkills(skillsData.skills || [])

      // Step 2: Skill gap quiz
      const quizData = await interviewApi.skillGapQuiz(targetRole, currentSkills, 5)
      setQuizResult(quizData)

      setAnalyzed(true)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const knownSkills = currentSkills
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  const matched = requiredSkills.filter((s) =>
    knownSkills.some(
      (k) => s.toLowerCase().includes(k) || k.includes(s.toLowerCase())
    )
  )
  const missing = requiredSkills.filter(
    (s) =>
      !knownSkills.some(
        (k) => s.toLowerCase().includes(k) || k.includes(s.toLowerCase())
      )
  )
  const matchPct =
    requiredSkills.length > 0
      ? Math.round((matched.length / requiredSkills.length) * 100)
      : 0

  const quickRoles = [
    'LLM Engineer',
    'ML Engineer',
    'Data Scientist',
    'DevOps Engineer',
    'Frontend Developer',
    'Product Manager',
    'Cybersecurity Engineer',
    'Cloud Architect',
    'Blockchain Developer',
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Skill Gap Analyzer</h1>
        <p className="text-[#4a6680] text-sm mt-1">
          Any role · AI-powered · Personalized 30-day roadmap
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* LEFT — Form */}
        <div className="space-y-4">
          <form
            onSubmit={handleAnalyze}
            className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5"
          >
            <div className="text-sm font-bold text-white mb-4">Your Profile</div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Target Role *</label>
                <input
                  className={inputCls}
                  placeholder="e.g. LLM Engineer, DevOps, Product Manager..."
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  required
                />
                <div className="text-[10px] text-[#4a6680] mt-1">
                  Any role — AI will analyze it
                </div>
              </div>
              <div>
                <label className={labelCls}>Your Current Skills *</label>
                <textarea
                  className={inputCls + ' resize-none'}
                  rows={5}
                  placeholder="Python, LangChain, FastAPI, Docker, React..."
                  value={currentSkills}
                  onChange={(e) => setCurrentSkills(e.target.value)}
                  required
                />
                <div className="text-[10px] text-[#4a6680] mt-1">
                  Comma separated
                </div>
              </div>
              <button
                type="submit"
                disabled={
                  loading || !currentSkills.trim() || !targetRole.trim()
                }
                className="w-full bg-[#00f0c8] text-black font-bold py-3 rounded-lg text-sm disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⚡</span> AI Analyzing...
                  </>
                ) : (
                  '🧬 Analyze Skill Gap'
                )}
              </button>
            </div>
          </form>

          {/* Quick role buttons */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
            <div className="text-xs text-[#4a6680] uppercase tracking-wide mb-3">
              Quick Roles
            </div>
            <div className="flex flex-wrap gap-2">
              {quickRoles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTargetRole(r)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                    targetRole === r
                      ? 'bg-[#00f0c8]/10 border-[#00f0c8]/30 text-[#00f0c8]'
                      : 'bg-[#111620] border-[#1e2838] text-[#4a6680] hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Results */}
        <div className="col-span-2 space-y-4">
          {/* Empty state */}
          {!analyzed && !loading && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-10 text-center">
              <div className="text-5xl mb-4">🧬</div>
              <div className="text-white font-bold text-lg mb-2">
                Enter any role to analyze
              </div>
              <p className="text-[#4a6680] text-sm">
                AI will identify required skills, your gaps, and create a
                personalized learning roadmap
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-10 text-center">
              <div className="text-4xl mb-4 animate-bounce">⚡</div>
              <div className="text-white font-bold mb-2">
                AI is analyzing your profile...
              </div>
              <p className="text-[#4a6680] text-sm">
                Getting required skills for {targetRole}
              </p>
            </div>
          )}

          {/* Results */}
          {analyzed && (
            <>
              {/* Overall Score */}
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-bold text-white">
                      Skill Match — {targetRole}
                    </div>
                    <div className="text-xs text-[#4a6680] mt-0.5">
                      {matched.length} of {requiredSkills.length} required
                      skills
                    </div>
                  </div>
                  <div
                    className="text-4xl font-bold"
                    style={{
                      color:
                        matchPct >= 70
                          ? '#39e87a'
                          : matchPct >= 50
                          ? '#ffd84d'
                          : '#ff7c4d',
                      fontFamily: 'monospace',
                    }}
                  >
                    {matchPct}%
                  </div>
                </div>

                <div className="h-3 bg-[#1e2838] rounded-full overflow-hidden mb-5">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${matchPct}%`,
                      background:
                        matchPct >= 70
                          ? 'linear-gradient(90deg,#39e87a,#00f0c8)'
                          : matchPct >= 50
                          ? 'linear-gradient(90deg,#ffd84d,#ff7c4d)'
                          : 'linear-gradient(90deg,#ff7c4d,#ff5c9c)',
                    }}
                  />
                </div>

                <div className="space-y-2.5">
                  {requiredSkills.map((skill) => {
                    const has = knownSkills.some(
                      (k) =>
                        skill.toLowerCase().includes(k) ||
                        k.includes(skill.toLowerCase())
                    )
                    return (
                      <div key={skill} className="flex items-center gap-3">
                        <div className="w-36 text-xs text-white flex-shrink-0 truncate">
                          {skill}
                        </div>
                        <div className="flex-1 h-2 bg-[#1e2838] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: has ? '100%' : '0%',
                              background: has ? '#39e87a' : '#ff7c4d',
                            }}
                          />
                        </div>
                        <div
                          className="text-xs w-16 text-right flex-shrink-0"
                          style={{ color: has ? '#39e87a' : '#ff7c4d' }}
                        >
                          {has ? '✓ Have' : '✗ Gap'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Matched vs Missing */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                  <div className="text-sm font-bold text-[#39e87a] mb-3">
                    ✅ You Have ({matched.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {matched.length > 0 ? (
                      matched.map((s) => (
                        <span
                          key={s}
                          className="text-xs bg-[#39e87a]/10 border border-[#39e87a]/20 text-[#39e87a] px-2 py-1 rounded-lg"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <div className="text-xs text-[#4a6680]">
                        No matching skills found
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                  <div className="text-sm font-bold text-[#ff7c4d] mb-3">
                    ❌ Need to Learn ({missing.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {missing.length > 0 ? (
                      missing.map((s) => (
                        <span
                          key={s}
                          className="text-xs bg-[#ff7c4d]/10 border border-[#ff7c4d]/20 text-[#ff7c4d] px-2 py-1 rounded-lg"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <div className="text-xs text-[#39e87a]">
                        You have all required skills! 🎉
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 30-Day Roadmap */}
              {missing.length > 0 && (
                <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                  <div className="text-sm font-bold text-white mb-4">
                    🗺️ 30-Day Learning Roadmap
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div
                      className="border border-[#00f0c8]/15 rounded-xl p-4"
                      style={{ background: 'rgba(0,240,200,0.03)' }}
                    >
                      <div className="text-xs font-bold text-[#00f0c8] uppercase tracking-wide mb-3">
                        Week 1–2
                      </div>
                      {missing
                        .slice(0, Math.ceil(missing.length / 3))
                        .map((s) => (
                          <div
                            key={s}
                            className="text-xs text-[#7a96b0] mb-2 flex items-center gap-1"
                          >
                            <span className="text-[#00f0c8]">→</span> {s}
                          </div>
                        ))}
                    </div>
                    <div
                      className="border border-[#9b7bff]/15 rounded-xl p-4"
                      style={{ background: 'rgba(155,123,255,0.03)' }}
                    >
                      <div className="text-xs font-bold text-[#9b7bff] uppercase tracking-wide mb-3">
                        Week 3
                      </div>
                      {missing
                        .slice(
                          Math.ceil(missing.length / 3),
                          Math.ceil((missing.length * 2) / 3)
                        )
                        .map((s) => (
                          <div
                            key={s}
                            className="text-xs text-[#7a96b0] mb-2 flex items-center gap-1"
                          >
                            <span className="text-[#9b7bff]">→</span> {s}
                          </div>
                        ))}
                    </div>
                    <div
                      className="border border-[#ff7c4d]/15 rounded-xl p-4"
                      style={{ background: 'rgba(255,124,77,0.03)' }}
                    >
                      <div className="text-xs font-bold text-[#ff7c4d] uppercase tracking-wide mb-3">
                        Week 4
                      </div>
                      {missing
                        .slice(Math.ceil((missing.length * 2) / 3))
                        .map((s) => (
                          <div
                            key={s}
                            className="text-xs text-[#7a96b0] mb-2 flex items-center gap-1"
                          >
                            <span className="text-[#ff7c4d]">→</span> {s}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Diagnostic Questions */}
              {quizResult?.questions?.length > 0 && (
                <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                  <div className="text-sm font-bold text-white mb-4">
                    🧩 Diagnostic Questions
                  </div>
                  <div className="space-y-2">
                    {quizResult.questions.map((q: any, i: number) => (
                      <div
                        key={i}
                        className="bg-[#111620] border border-[#1e2838] rounded-lg p-3 flex items-start gap-3"
                      >
                        <span className="text-xs text-[#4a6680] flex-shrink-0 mt-0.5">
                          Q{i + 1}
                        </span>
                        <div className="flex-1">
                          <div className="text-xs text-white mb-1">
                            {q.question}
                          </div>
                          {q.resource && (
                            <div className="text-[10px] text-[#00f0c8]">
                              📚 {q.resource}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] bg-[#9b7bff]/10 border border-[#9b7bff]/20 text-[#9b7bff] px-2 py-0.5 rounded flex-shrink-0">
                          {q.skill_tested}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}