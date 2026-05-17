'use client'
import { useState, useEffect } from 'react'
import { jobsApi, analyticsApi } from '@/lib/api'

interface WeekData {
  label: string
  apps: number
  responses: number
  interviews: number
}

export default function InsightsPage() {
  const [overview, setOverview] = useState<any>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [ov, jobList] = await Promise.all([
          analyticsApi.getOverview(),
          jobsApi.listApplications(),
        ])
        setOverview(ov)
        setJobs(jobList)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // ── Weekly comparison ──
  function getWeekRange(weeksAgo: number) {
    const now = new Date()
    const end = new Date(now)
    end.setDate(now.getDate() - weeksAgo * 7)
    const start = new Date(end)
    start.setDate(end.getDate() - 7)
    return { start, end }
  }

  function getWeekData(weeksAgo: number, label: string): WeekData {
    const { start, end } = getWeekRange(weeksAgo)
    const weekJobs = jobs.filter(j => {
      const d = new Date(j.applied_date || j.created_at || '')
      return d >= start && d < end
    })
    return {
      label,
      apps: weekJobs.length,
      responses: weekJobs.filter(j => j.status !== 'applied').length,
      interviews: weekJobs.filter(j => j.status === 'interviewing' || j.status === 'offer').length,
    }
  }

  const thisWeek = getWeekData(0, 'This Week')
  const lastWeek = getWeekData(1, 'Last Week')
  const twoWeeksAgo = getWeekData(2, '2 Weeks Ago')
  const threeWeeksAgo = getWeekData(3, '3 Weeks Ago')
  const weeks = [threeWeeksAgo, twoWeeksAgo, lastWeek, thisWeek]

  function diff(curr: number, prev: number) {
    if (prev === 0) return curr > 0 ? '+100%' : '0%'
    const d = Math.round(((curr - prev) / prev) * 100)
    return d > 0 ? `+${d}%` : `${d}%`
  }
  function diffColor(curr: number, prev: number) {
    if (curr > prev) return '#39e87a'
    if (curr < prev) return '#ff5c9c'
    return '#4a6680'
  }

  // ── Rejection Analysis ──
  const statusCounts = jobs.reduce((acc: any, j) => {
    acc[j.status] = (acc[j.status] || 0) + 1
    return acc
  }, {})

  const total = jobs.length || 1
  const funnelStages = [
    { label: 'Applied', key: 'applied', color: '#4d9fff' },
    { label: 'Screening', key: 'screening', color: '#ffd84d' },
    { label: 'Interviewing', key: 'interviewing', color: '#ff7c4d' },
    { label: 'Offer', key: 'offer', color: '#39e87a' },
    { label: 'Rejected', key: 'rejected', color: '#ff5c9c' },
    { label: 'Ghosted', key: 'ghosted', color: '#9b7bff' },
  ]

  // Drop-off rates
  const applied = statusCounts['applied'] || 0
  const screening = statusCounts['screening'] || 0
  const interviewing = statusCounts['interviewing'] || 0
  const offer = statusCounts['offer'] || 0
  const rejected = statusCounts['rejected'] || 0
  const ghosted = statusCounts['ghosted'] || 0

  const dropOffs = [
    {
      from: 'Applied → Screening',
      rate: applied > 0 ? Math.round((1 - screening / (applied + screening)) * 100) : 0,
      insight: 'Low screening rate may indicate weak resume or cover letter'
    },
    {
      from: 'Screening → Interview',
      rate: screening > 0 ? Math.round((1 - interviewing / (screening + interviewing)) * 100) : 0,
      insight: 'High drop-off here suggests phone screen preparation needed'
    },
    {
      from: 'Interview → Offer',
      rate: interviewing > 0 ? Math.round((1 - offer / (interviewing + offer)) * 100) : 0,
      insight: 'Focus on technical interview skills and culture fit preparation'
    },
  ]

  // Best performing day
  const dayCount: Record<string, number> = {}
  jobs.forEach(j => {
    const d = new Date(j.applied_date || j.created_at || '')
    if (!isNaN(d.getTime())) {
      const day = d.toLocaleDateString('en-US', { weekday: 'long' })
      dayCount[day] = (dayCount[day] || 0) + 1
    }
  })
  const bestDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]

  // Max bar for weekly chart
  const maxApps = Math.max(...weeks.map(w => w.apps), 1)

  const statColors = { '#4d9fff': true, '#ff7c4d': true, '#39e87a': true, '#ff5c9c': true }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">📈</div>
          <div className="text-white font-bold">Loading insights...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📈</span>
          <h1 className="text-2xl font-bold text-white">Insights</h1>
        </div>
        <p className="text-[#4a6680] text-sm ml-12">Weekly comparison and rejection analysis to sharpen your strategy</p>
      </div>

      {/* Weekly Comparison Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Applications',
            curr: thisWeek.apps,
            prev: lastWeek.apps,
            color: '#4d9fff',
            icon: '📤',
          },
          {
            label: 'Responses',
            curr: thisWeek.responses,
            prev: lastWeek.responses,
            color: '#ff7c4d',
            icon: '📬',
          },
          {
            label: 'Interviews',
            curr: thisWeek.interviews,
            prev: lastWeek.interviews,
            color: '#39e87a',
            icon: '🎤',
          },
        ].map((s, i) => (
          <div key={i} className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: s.color }} />
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-[#4a6680] uppercase tracking-wide">{s.label}</div>
              <span>{s.icon}</span>
            </div>
            <div className="text-4xl font-bold mb-1" style={{ color: s.color }}>{s.curr}</div>
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: diffColor(s.curr, s.prev) }}>{diff(s.curr, s.prev)}</span>
              <span className="text-[#4a6680]">vs last week ({s.prev})</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Weekly Bar Chart */}
        <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
          <div className="text-sm font-bold text-white mb-5">📊 4-Week Application Trend</div>
          <div className="space-y-3">
            {weeks.map((w, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#7a96b0]">{w.label}</span>
                  <span className="font-bold text-white">{w.apps} apps</span>
                </div>
                <div className="h-6 bg-[#1e2838] rounded-lg overflow-hidden flex items-center">
                  <div
                    className="h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-2"
                    style={{
                      width: `${(w.apps / maxApps) * 100}%`,
                      background: i === 3 ? '#00f0c8' : '#4d9fff44',
                      minWidth: w.apps > 0 ? '24px' : '0',
                    }}
                  >
                    {w.apps > 0 && <span className="text-[10px] font-bold text-white">{w.apps}</span>}
                  </div>
                </div>
                <div className="flex gap-3 mt-1">
                  <span className="text-[10px] text-[#4a6680]">Responses: <span className="text-[#ff7c4d]">{w.responses}</span></span>
                  <span className="text-[10px] text-[#4a6680]">Interviews: <span className="text-[#39e87a]">{w.interviews}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Application Funnel */}
        <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
          <div className="text-sm font-bold text-white mb-5">🎯 Application Funnel</div>
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-[#4a6680] text-sm">No applications yet</div>
          ) : (
            <div className="space-y-3">
              {funnelStages.map(stage => {
                const count = statusCounts[stage.key] || 0
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={stage.key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#7a96b0] capitalize">{stage.label}</span>
                      <span className="font-bold" style={{ color: stage.color }}>{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-[#1e2838] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: stage.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Drop-off Analysis */}
      <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5 mb-6">
        <div className="text-sm font-bold text-white mb-5">❌ Rejection & Drop-off Analysis</div>
        {jobs.length === 0 ? (
          <div className="text-center py-6 text-[#4a6680] text-sm">Add applications to see drop-off analysis</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {dropOffs.map((d, i) => (
              <div key={i} className="bg-[#111620] border border-[#1e2838] rounded-xl p-4">
                <div className="text-xs font-bold text-white mb-2">{d.from}</div>
                <div className="flex items-end gap-2 mb-3">
                  <div className="text-3xl font-bold" style={{ color: d.rate > 70 ? '#ff5c9c' : d.rate > 40 ? '#ffd84d' : '#39e87a' }}>
                    {d.rate}%
                  </div>
                  <div className="text-xs text-[#4a6680] mb-1">drop-off</div>
                </div>
                <div className="h-1.5 bg-[#1e2838] rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full"
                    style={{
                      width: `${d.rate}%`,
                      background: d.rate > 70 ? '#ff5c9c' : d.rate > 40 ? '#ffd84d' : '#39e87a'
                    }} />
                </div>
                <p className="text-[10px] text-[#4a6680] leading-relaxed">{d.insight}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Extra Stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* Best Day */}
        <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
          <div className="text-xs font-bold text-[#4a6680] uppercase tracking-wide mb-3">📅 Best Apply Day</div>
          {bestDay ? (
            <>
              <div className="text-2xl font-bold text-[#00f0c8]">{bestDay[0]}</div>
              <div className="text-xs text-[#4a6680] mt-1">{bestDay[1]} applications</div>
            </>
          ) : (
            <div className="text-sm text-[#4a6680]">No data yet</div>
          )}
        </div>

        {/* Ghost Rate */}
        <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
          <div className="text-xs font-bold text-[#4a6680] uppercase tracking-wide mb-3">👻 Ghost Rate</div>
          <div className="text-2xl font-bold text-[#9b7bff]">
            {total > 1 ? Math.round((ghosted / total) * 100) : 0}%
          </div>
          <div className="text-xs text-[#4a6680] mt-1">{ghosted} ghosted out of {jobs.length}</div>
        </div>

        {/* Success Rate */}
        <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
          <div className="text-xs font-bold text-[#4a6680] uppercase tracking-wide mb-3">🏆 Offer Rate</div>
          <div className="text-2xl font-bold text-[#39e87a]">
            {total > 1 ? Math.round((offer / total) * 100) : 0}%
          </div>
          <div className="text-xs text-[#4a6680] mt-1">{offer} offer{offer !== 1 ? 's' : ''} out of {jobs.length}</div>
        </div>
      </div>
    </div>
  )
}