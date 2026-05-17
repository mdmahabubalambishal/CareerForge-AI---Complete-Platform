'use client'
import { useState, useEffect } from 'react'
import { analyticsApi, jobsApi } from '@/lib/api'

interface DailyTip {
  category: string
  tip: string
  action: string
  priority: 'high' | 'medium' | 'low'
  icon: string
}

interface SmartInsight {
  title: string
  description: string
  type: 'warning' | 'success' | 'info' | 'action'
}

interface DashboardData {
  greeting: string
  motivation: string
  daily_tips: DailyTip[]
  insights: SmartInsight[]
  focus_for_today: string
  weekly_goal: string
}

const PRIORITY_COLORS = {
  high: '#ff5c9c',
  medium: '#ffd84d',
  low: '#39e87a',
}

const TYPE_COLORS = {
  warning: '#ff7c4d',
  success: '#39e87a',
  info: '#4d9fff',
  action: '#9b7bff',
}

const TYPE_BG = {
  warning: '#ff7c4d15',
  success: '#39e87a15',
  info: '#4d9fff15',
  action: '#9b7bff15',
}

export default function SmartDashboardPage() {
  const [overview, setOverview] = useState<any>(null)
  const [skills, setSkills] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastGenerated, setLastGenerated] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [ov, sk, jb] = await Promise.all([
          analyticsApi.getOverview(),
          analyticsApi.getSkills(),
          jobsApi.listApplications(),
        ])
        setOverview(ov)
        setSkills(sk)
        setJobs(jb)
      } catch (e) { console.error(e) }
      finally { setFetching(false) }
    }
    load()

    // Load cached dashboard
    const cached = localStorage.getItem('smart_dashboard')
    const cachedTime = localStorage.getItem('smart_dashboard_time')
    if (cached && cachedTime) {
      const hoursSince = (Date.now() - parseInt(cachedTime)) / 3600000
      if (hoursSince < 24) {
        setDashboard(JSON.parse(cached))
        setLastGenerated(new Date(parseInt(cachedTime)).toLocaleString())
      }
    }
  }, [])

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/smart-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats: {
            totalApps: overview?.applications?.total || 0,
            weeklyApps: overview?.applications?.weekly || 0,
            responseRate: overview?.applications?.response_rate || 0,
            bestATS: overview?.resumes?.best?.ats_score || 0,
            interviewing: overview?.applications?.by_status?.interviewing || 0,
            offers: overview?.applications?.by_status?.offer || 0,
          },
          skills: skills.map(s => ({ name: s.skill_name, level: s.level })),
          recentJobs: jobs.slice(0, 5).map(j => ({ company: j.company, role: j.role, status: j.status })),
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setDashboard(data.dashboard)
      localStorage.setItem('smart_dashboard', JSON.stringify(data.dashboard))
      localStorage.setItem('smart_dashboard_time', Date.now().toString())
      setLastGenerated(new Date().toLocaleString())
    } catch (e: any) {
      setError('Failed to generate: ' + e?.message)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">📊</span>
            <h1 className="text-2xl font-bold text-white">Smart Dashboard</h1>
          </div>
          <p className="text-[#4a6680] text-sm ml-12">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          {lastGenerated && (
            <span className="text-xs text-[#4a6680]">Last updated: {lastGenerated}</span>
          )}
          <button onClick={handleGenerate} disabled={loading || fetching}
            className="bg-[#39e87a] text-black font-bold px-4 py-2 rounded-lg text-sm hover:brightness-110 transition-all disabled:opacity-40">
            {loading ? '⚡ Generating...' : '✨ Generate Daily Tips'}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {overview && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total Apps', value: overview.applications?.total || 0, color: '#00f0c8' },
            { label: 'This Week', value: overview.applications?.weekly || 0, color: '#9b7bff' },
            { label: 'Response Rate', value: `${overview.applications?.response_rate || 0}%`, color: '#ff7c4d' },
            { label: 'Interviewing', value: overview.applications?.by_status?.interviewing || 0, color: '#39e87a' },
            { label: 'Skills', value: skills.length, color: '#ffd84d' },
          ].map((s, i) => (
            <div key={i} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-3 text-center relative overflow-hidden">
              <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: s.color }} />
              <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-[#4a6680] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-[#ff5c9c11] border border-[#ff5c9c44] rounded-xl p-3 text-sm text-[#ff5c9c] mb-4">
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-12 text-center mb-6">
          <div className="text-5xl mb-4 animate-pulse">🧠</div>
          <div className="text-white font-bold mb-2">AI is analyzing your career data...</div>
          <div className="text-xs text-[#4a6680]">Generating personalized tips for today</div>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && dashboard && (
        <div className="space-y-5">
          {/* Greeting & Motivation */}
          <div className="bg-gradient-to-br from-[#00f0c8]/10 to-[#9b7bff]/10 border border-[#00f0c8]/20 rounded-2xl p-6">
            <div className="text-lg font-bold text-white mb-2">{dashboard.greeting} 👋</div>
            <p className="text-sm text-[#7a96b0] leading-relaxed mb-4">{dashboard.motivation}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-3">
                <div className="text-xs font-bold text-[#00f0c8] mb-1">🎯 Today's Focus</div>
                <p className="text-xs text-[#7a96b0] leading-relaxed">{dashboard.focus_for_today}</p>
              </div>
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-3">
                <div className="text-xs font-bold text-[#9b7bff] mb-1">📅 Weekly Goal</div>
                <p className="text-xs text-[#7a96b0] leading-relaxed">{dashboard.weekly_goal}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Daily Tips */}
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
              <div className="text-sm font-bold text-white mb-4">💡 Today's Action Items</div>
              <div className="space-y-3">
                {dashboard.daily_tips.map((tip, i) => (
                  <div key={i} className="bg-[#111620] border border-[#1e2838] rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{tip.icon}</span>
                        <span className="text-xs font-bold text-white">{tip.category}</span>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${PRIORITY_COLORS[tip.priority]}22`, color: PRIORITY_COLORS[tip.priority] }}>
                        {tip.priority}
                      </span>
                    </div>
                    <p className="text-xs text-[#7a96b0] leading-relaxed mb-1.5">{tip.tip}</p>
                    <div className="text-[10px] font-bold" style={{ color: PRIORITY_COLORS[tip.priority] }}>
                      → {tip.action}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Insights */}
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
              <div className="text-sm font-bold text-white mb-4">🔍 Smart Insights</div>
              <div className="space-y-3">
                {dashboard.insights.map((insight, i) => (
                  <div key={i} className="rounded-xl p-3 border"
                    style={{ background: TYPE_BG[insight.type], borderColor: `${TYPE_COLORS[insight.type]}33` }}>
                    <div className="text-xs font-bold mb-1" style={{ color: TYPE_COLORS[insight.type] }}>
                      {insight.type === 'warning' ? '⚠️' : insight.type === 'success' ? '✅' : insight.type === 'action' ? '🎯' : 'ℹ️'} {insight.title}
                    </div>
                    <p className="text-xs text-[#7a96b0] leading-relaxed">{insight.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !dashboard && (
        <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-16 text-center">
          <div className="text-5xl mb-4">📊</div>
          <div className="text-white font-bold text-lg mb-2">Get your daily AI briefing</div>
          <p className="text-[#4a6680] text-sm mb-6">
            AI analyzes your career data and gives you personalized tips every day
          </p>
          <button onClick={handleGenerate} disabled={loading || fetching}
            className="bg-[#39e87a] text-black font-bold px-6 py-3 rounded-lg text-sm disabled:opacity-40">
            ✨ Generate Daily Tips
          </button>
        </div>
      )}
    </div>
  )
}