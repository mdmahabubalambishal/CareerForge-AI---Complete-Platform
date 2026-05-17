'use client'
import { useState, useEffect, useRef } from 'react'
import { analyticsApi } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'skills' | 'report' | 'calendar' | 'ai'

interface Reminder {
  id: string; title: string; date: string
  type: 'interview' | 'followup' | 'deadline' | 'other'; done: boolean; note?: string
}
interface Goal { id: string; skill_id: string; target: number; deadline: string }
interface SalaryEntry { id: string; company: string; role: string; min: number; max: number; currency: string }
interface AppNote { id: string; company: string; content: string; date: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const levelColor = (l: number) => l >= 80 ? '#39e87a' : l >= 60 ? '#00f0c8' : l >= 40 ? '#ffd84d' : '#ff7c4d'
const levelLabel = (l: number) => l >= 80 ? 'Expert' : l >= 60 ? 'Advanced' : l >= 40 ? 'Intermediate' : 'Beginner'
const statusColors: Record<string, string> = {
  applied: '#4d9fff', screening: '#ffd84d', interviewing: '#ff7c4d',
  offer: '#39e87a', rejected: '#ff5c9c', withdrawn: '#4a6680', ghosted: '#9b7bff',
}
const reminderColors: Record<string, string> = {
  interview: '#39e87a', followup: '#00f0c8', deadline: '#ff5c9c', other: '#9b7bff',
}

function ls<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div className="text-center py-6 text-[#4a6680] text-sm">No data</div>
  let cum = 0
  const slices = data.map(d => { const s = cum; cum += d.value / total; return { ...d, start: s, end: cum } })
  const pt = (cx: number, cy: number, r: number, a: number) => {
    const rad = (a - 0.25) * 2 * Math.PI
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }
  return (
    <div className="flex items-center gap-6">
      <svg width="110" height="110" viewBox="0 0 110 110">
        {slices.map((s, i) => {
          const p1 = pt(55, 55, 44, s.start), p2 = pt(55, 55, 44, s.end)
          const large = s.end - s.start > 0.5 ? 1 : 0
          return <path key={i} d={`M55,55 L${p1.x},${p1.y} A44,44 0 ${large},1 ${p2.x},${p2.y} Z`}
            fill={s.color} stroke="#0c1018" strokeWidth="2" />
        })}
        <circle cx="55" cy="55" r="26" fill="#0c1018" />
        <text x="55" y="59" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{total}</text>
      </svg>
      <div className="space-y-1.5 flex-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-[#7a96b0] capitalize flex-1">{d.label}</span>
            <span className="font-bold" style={{ color: d.color }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold" style={{ color: d.color }}>{d.value}</span>
          <div className="w-full rounded-t transition-all duration-700"
            style={{ height: `${(d.value / max) * 64}px`, background: d.color, minHeight: d.value > 0 ? '4px' : '0' }} />
          <span className="text-[9px] text-[#4a6680] capitalize truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function Badge({ icon, label, desc, earned }: { icon: string; label: string; desc: string; earned: boolean }) {
  return (
    <div className={`p-3 rounded-xl border text-center transition-all ${earned ? 'border-[#ffd84d] bg-[#ffd84d0f]' : 'border-[#1e2838] bg-[#0c1018] opacity-40 grayscale'}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs font-bold text-white">{label}</div>
      <div className="text-[10px] text-[#4a6680] mt-0.5">{desc}</div>
      {earned && <div className="text-[9px] text-[#ffd84d] mt-1 font-bold">✓ EARNED</div>}
    </div>
  )
}

function Heatmap({ data }: { data: Record<string, number> }) {
  const weeks = 26
  const today = new Date()
  const cells: { date: string; count: number }[] = []
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    const key = d.toISOString().split('T')[0]
    cells.push({ date: key, count: data[key] || 0 })
  }
  const maxCount = Math.max(...cells.map(c => c.count), 1)
  const color = (n: number) => {
    if (n === 0) return '#1e2838'
    const intensity = n / maxCount
    if (intensity < 0.25) return '#00f0c840'
    if (intensity < 0.5) return '#00f0c870'
    if (intensity < 0.75) return '#00f0c8aa'
    return '#00f0c8'
  }
  const chunked: typeof cells[] = []
  for (let i = 0; i < cells.length; i += 7) chunked.push(cells.slice(i, i + 7))
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {chunked.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div key={di} title={`${day.date}: ${day.count} applications`}
                className="w-3 h-3 rounded-sm cursor-pointer hover:opacity-80 transition-all"
                style={{ background: color(day.count) }} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-[#4a6680]">
        <span>Less</span>
        {['#1e2838', '#00f0c840', '#00f0c870', '#00f0c8aa', '#00f0c8'].map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [overview, setOverview] = useState<any>(null)
  const [skills, setSkills] = useState<any[]>([])
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const [newSkill, setNewSkill] = useState('')
  const [newLevel, setNewLevel] = useState(50)
  const [showAddSkill, setShowAddSkill] = useState(false)
  const [skillSearch, setSkillSearch] = useState('')
  const [skillFilter, setSkillFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced' | 'expert'>('all')

  const [goals, setGoals] = useState<Goal[]>(() => ls('skill_goals', []))
  const [showGoalForm, setShowGoalForm] = useState<string | null>(null)
  const [goalTarget, setGoalTarget] = useState(80)
  const [goalDeadline, setGoalDeadline] = useState('')

  const [reminders, setReminders] = useState<Reminder[]>(() => ls('reminders', []))
  const [showAddReminder, setShowAddReminder] = useState(false)
  const [newReminder, setNewReminder] = useState({ title: '', date: '', type: 'interview' as Reminder['type'], note: '' })

  const [notifications, setNotifications] = useState<string[]>([])
  const [showNotifPanel, setShowNotifPanel] = useState(false)

  const [calendarDate, setCalendarDate] = useState(new Date())

  const [salaries, setSalaries] = useState<SalaryEntry[]>(() => ls('salaries', []))
  const [showAddSalary, setShowAddSalary] = useState(false)
  const [newSalary, setNewSalary] = useState({ company: '', role: '', min: 0, max: 0, currency: 'BDT' })

  const [appNotes, setAppNotes] = useState<AppNote[]>(() => ls('app_notes', []))
  const [showAddNote, setShowAddNote] = useState(false)
  const [newNote, setNewNote] = useState({ company: '', content: '' })

  const [dailyTarget, setDailyTarget] = useState<number>(() => ls('daily_target', 3))
  const [showTargetEdit, setShowTargetEdit] = useState(false)

  const [jdText, setJdText] = useState('')
  const [matchResult, setMatchResult] = useState<string | null>(null)
  const [matchLoading, setMatchLoading] = useState(false)
  const [interviewRole, setInterviewRole] = useState('')
  const [qaResult, setQaResult] = useState<string | null>(null)
  const [qaLoading, setQaLoading] = useState(false)

  const inputCls = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors'

  useEffect(() => { fetchOverview(); fetchSkills() }, [])
  useEffect(() => { localStorage.setItem('skill_goals', JSON.stringify(goals)) }, [goals])
  useEffect(() => {
    localStorage.setItem('reminders', JSON.stringify(reminders))
    const today = new Date()
    const upcoming = reminders.filter(r => {
      const diff = (new Date(r.date).getTime() - today.getTime()) / 86400000
      return !r.done && diff >= 0 && diff <= 2
    })
    setNotifications(upcoming.map(r => `⏰ "${r.title}" — ${new Date(r.date).toLocaleDateString()}`))
  }, [reminders])
  useEffect(() => { localStorage.setItem('salaries', JSON.stringify(salaries)) }, [salaries])
  useEffect(() => { localStorage.setItem('app_notes', JSON.stringify(appNotes)) }, [appNotes])
  useEffect(() => { localStorage.setItem('daily_target', JSON.stringify(dailyTarget)) }, [dailyTarget])

  async function fetchOverview() {
    try { const d = await analyticsApi.getOverview(); setOverview(d) } catch (e) { console.error(e) }
  }
  async function fetchSkills() {
    try { const d = await analyticsApi.getSkills(); setSkills(d) } catch (e) { console.error(e) }
  }
  async function handleAddSkill(e: React.FormEvent) {
    e.preventDefault()
    if (!newSkill.trim()) return
    try { await analyticsApi.addSkill(newSkill, newLevel); await fetchSkills(); setNewSkill(''); setNewLevel(50); setShowAddSkill(false) }
    catch (err: any) { alert(err.message) }
  }
  async function handleUpdateLevel(id: string, level: number) {
    try { await analyticsApi.updateSkill(id, level); await fetchSkills() } catch (err: any) { alert(err.message) }
  }
  async function handleDeleteSkill(id: string) {
    try { await analyticsApi.deleteSkill(id); await fetchSkills() } catch (err: any) { alert(err.message) }
  }
  async function handleGenerateReport() {
    setLoading(true)
    try { const d = await analyticsApi.getWeeklyReport(); setReport(d); setTab('report') }
    catch (err: any) { alert(err.message) } finally { setLoading(false) }
  }

  function exportCSV() {
    if (!overview) return
    const rows = [
      ['Metric', 'Value'],
      ['Total Applications', overview.applications.total],
      ['Weekly Applications', overview.applications.weekly],
      ['Response Rate (%)', overview.applications.response_rate],
      ['Best ATS Score (%)', overview.resumes.best?.ats_score || 0],
      [], ['Status', 'Count'],
      ...Object.entries(overview.applications.by_status || {}).map(([k, v]) => [k, v]),
      [], ['Skill', 'Level (%)'],
      ...skills.map(s => [s.skill_name, s.level]),
      [], ['Company', 'Role', 'Min', 'Max', 'Currency'],
      ...salaries.map(s => [s.company, s.role, s.min, s.max, s.currency]),
    ]
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'career_analytics.csv'; a.click()
  }

  function exportPDF() {
    if (!report) return
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Weekly Career Report</title>
  <style>
    @page { margin: 20mm; }
    body { font-family: Arial, sans-serif; color: #111; font-size: 13px; line-height: 1.6; }
    h1 { color: #4f46e5; font-size: 22px; margin-bottom: 4px; }
    .date { color: #6b7280; font-size: 11px; margin-bottom: 20px; }
    h2 { color: #374151; font-size: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-top: 20px; }
    .stats { display: flex; gap: 30px; margin: 12px 0 20px; }
    .stat-val { font-size: 28px; font-weight: bold; color: #4f46e5; }
    .stat-label { font-size: 11px; color: #6b7280; }
    pre { background: #f9fafb; padding: 16px; border-radius: 6px; white-space: pre-wrap; font-size: 12px; line-height: 1.7; }
  </style>
</head>
<body>
  <h1>Weekly Career Report</h1>
  <div class="date">Generated: ${new Date(report.generated_at).toLocaleDateString()}</div>
  <h2>Stats</h2>
  <div class="stats">
    <div><div class="stat-val">${report.stats.weekly_apps}</div><div class="stat-label">This Week</div></div>
    <div><div class="stat-val">${report.stats.total_apps}</div><div class="stat-label">Total Apps</div></div>
    <div><div class="stat-val">${report.stats.best_ats}%</div><div class="stat-label">Best ATS</div></div>
    <div><div class="stat-val">${report.stats.skills_count}</div><div class="stat-label">Skills</div></div>
  </div>
  <h2>AI Analysis</h2>
  <pre>${report.report}</pre>
</body>
</html>`

    const blob = new Blob([htmlContent], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'weekly_report.pdf'
    a.click()
    URL.revokeObjectURL(url)
  }

  function addGoal(skillId: string) {
    if (!goalDeadline) return
    setGoals(prev => [...prev.filter(g => g.skill_id !== skillId), { id: Date.now().toString(), skill_id: skillId, target: goalTarget, deadline: goalDeadline }])
    setShowGoalForm(null); setGoalTarget(80); setGoalDeadline('')
  }
  function removeGoal(skillId: string) { setGoals(prev => prev.filter(g => g.skill_id !== skillId)) }

  function addReminder() {
    if (!newReminder.title || !newReminder.date) return
    setReminders(prev => [...prev, { id: Date.now().toString(), ...newReminder, done: false }])
    setNewReminder({ title: '', date: '', type: 'interview', note: '' }); setShowAddReminder(false)
  }
  function toggleReminder(id: string) { setReminders(prev => prev.map(r => r.id === id ? { ...r, done: !r.done } : r)) }
  function deleteReminder(id: string) { setReminders(prev => prev.filter(r => r.id !== id)) }

  function addSalary() {
    if (!newSalary.company || !newSalary.role) return
    setSalaries(prev => [...prev, { id: Date.now().toString(), ...newSalary }])
    setNewSalary({ company: '', role: '', min: 0, max: 0, currency: 'BDT' }); setShowAddSalary(false)
  }

  function addNote() {
    if (!newNote.company || !newNote.content) return
    setAppNotes(prev => [...prev, { id: Date.now().toString(), ...newNote, date: new Date().toISOString() }])
    setNewNote({ company: '', content: '' }); setShowAddNote(false)
  }

  const heatmapData: Record<string, number> = {}
  if (overview?.applications?.by_date) {
    Object.entries(overview.applications.by_date).forEach(([date, count]) => { heatmapData[date] = count as number })
  }
  const todayKey = new Date().toISOString().split('T')[0]
  const todayCount = heatmapData[todayKey] || 0
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    if ((heatmapData[key] || 0) > 0) streak++; else break
  }

  async function handleJobMatch() {
    if (!jdText.trim() || skills.length === 0) return
    setMatchLoading(true); setMatchResult(null)
    try {
      const res = await fetch('/api/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'job_match', payload: { jd: jdText, skills } })
      })
      const data = await res.json()
      if (data.error) setMatchResult('Error: ' + data.error)
      else setMatchResult(data.result || 'No response')
    } catch (e: any) {
      setMatchResult('Network error: ' + e?.message)
    } finally { setMatchLoading(false) }
  }

  async function handleInterviewQA() {
    if (!interviewRole.trim()) return
    setQaLoading(true); setQaResult(null)
    try {
      const res = await fetch('/api/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'interview_qa', payload: { role: interviewRole, skills } })
      })
      const data = await res.json()
      if (data.error) setQaResult('Error: ' + data.error)
      else setQaResult(data.result || 'No response')
    } catch (e: any) {
      setQaResult('Network error: ' + e?.message)
    } finally { setQaLoading(false) }
  }

  const achievements = [
    { icon: '🚀', label: 'First Step', desc: '1st application', earned: (overview?.applications?.total || 0) >= 1 },
    { icon: '🔥', label: 'On a Roll', desc: '5+ this week', earned: (overview?.applications?.weekly || 0) >= 5 },
    { icon: '💯', label: 'ATS Master', desc: 'Score 90%+', earned: (overview?.resumes?.best?.ats_score || 0) >= 90 },
    { icon: '📬', label: 'Networker', desc: '20% response rate', earned: (overview?.applications?.response_rate || 0) >= 20 },
    { icon: '🎯', label: 'Skill Hunter', desc: '5+ skills tracked', earned: skills.length >= 5 },
    { icon: '🧙', label: 'Expert', desc: 'A skill at 80%+', earned: skills.some(s => s.level >= 80) },
    { icon: '📅', label: 'Consistent', desc: '10+ applications', earned: (overview?.applications?.total || 0) >= 10 },
    { icon: '🏆', label: 'Interview Pro', desc: 'Reached interview', earned: !!(overview?.applications?.by_status?.interviewing > 0) },
    { icon: '🌡️', label: 'Hot Streak', desc: '3 day streak', earned: streak >= 3 },
    { icon: '💰', label: 'Salary Smart', desc: 'Track 3+ salaries', earned: salaries.length >= 3 },
  ]
  const earnedCount = achievements.filter(a => a.earned).length

  function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
  function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay() }
  function remindersOnDay(day: number) {
    const y = calendarDate.getFullYear(), m = calendarDate.getMonth()
    return reminders.filter(r => { const d = new Date(r.date); return d.getFullYear() === y && d.getMonth() === m && d.getDate() === day })
  }

  const filteredSkills = skills.filter(s => {
    const matchSearch = s.skill_name.toLowerCase().includes(skillSearch.toLowerCase())
    const matchFilter = skillFilter === 'all' ||
      (skillFilter === 'beginner' && s.level < 40) ||
      (skillFilter === 'intermediate' && s.level >= 40 && s.level < 60) ||
      (skillFilter === 'advanced' && s.level >= 60 && s.level < 80) ||
      (skillFilter === 'expert' && s.level >= 80)
    return matchSearch && matchFilter
  })

  const avgSalary = salaries.length > 0 ? Math.round(salaries.reduce((s, e) => s + (e.min + e.max) / 2, 0) / salaries.length) : 0
  const maxSalary = salaries.length > 0 ? Math.max(...salaries.map(e => e.max)) : 0
  const pieData = Object.entries(overview?.applications?.by_status || {}).map(([label, value]) => ({ label, value: value as number, color: statusColors[label] || '#4a6680' }))
  const barData = Object.entries(overview?.applications?.by_status || {}).map(([label, value]) => ({ label, value: value as number, color: statusColors[label] || '#4a6680' }))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Career Analytics</h1>
          <p className="text-[#4a6680] text-sm mt-1">Track your progress, identify patterns, grow faster</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="relative bg-[#0c1018] border border-[#1e2838] text-white p-2.5 rounded-lg hover:border-[#263040] transition-all">
              🔔
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#ff5c9c] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifPanel && (
              <div className="absolute right-0 top-12 bg-[#0c1018] border border-[#1e2838] rounded-xl p-3 w-72 z-50 shadow-xl">
                <div className="text-xs font-bold text-white mb-2">Notifications</div>
                {notifications.length === 0
                  ? <div className="text-xs text-[#4a6680] py-2">No upcoming reminders</div>
                  : notifications.map((n, i) => <div key={i} className="text-xs text-[#00f0c8] py-1.5 border-b border-[#1e2838] last:border-0">{n}</div>)}
              </div>
            )}
          </div>
          <button onClick={exportCSV} className="bg-[#0c1018] border border-[#1e2838] text-white font-bold px-4 py-2 rounded-lg text-sm hover:border-[#263040] transition-all">📤 CSV</button>
          <button onClick={handleGenerateReport} disabled={loading}
            className="bg-[#9b7bff] text-white font-bold px-4 py-2 rounded-lg text-sm hover:brightness-110 transition-all disabled:opacity-40">
            {loading ? '⚡ Generating...' : '📅 Weekly Report'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#0c1018] border border-[#1e2838] rounded-xl p-1 w-fit flex-wrap">
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'skills', label: '📈 Skills' },
          { id: 'report', label: '📅 Report' },
          { id: 'calendar', label: '🗓 Calendar' },
          { id: 'ai', label: '🤖 AI Tools' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-[#00f0c8] text-black' : 'text-[#7a96b0] hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ══ */}
      {tab === 'overview' && overview && (
        <div className="space-y-5">
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Total Applications', value: overview.applications.total, sub: `↑ ${overview.applications.weekly} this week`, color: '#00f0c8' },
              { label: 'Response Rate', value: `${overview.applications.response_rate}%`, sub: 'Industry avg: 20%', color: '#9b7bff' },
              { label: 'Best ATS Score', value: `${overview.resumes.best?.ats_score || 0}%`, sub: overview.resumes.best?.title || 'No resume yet', color: '#ff7c4d' },
              { label: "Today's Progress", value: `${todayCount}/${dailyTarget}`, sub: `🔥 ${streak} day streak`, color: todayCount >= dailyTarget ? '#39e87a' : '#ffd84d' },
              { label: 'Achievements', value: `${earnedCount}/${achievements.length}`, sub: 'Keep going!', color: '#ffd84d' },
            ].map((s, i) => (
              <div key={i} className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: s.color }} />
                <div className="text-xs text-[#4a6680] uppercase tracking-wide mb-2">{s.label}</div>
                <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-[#4a6680] mt-1">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Daily Target */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-white">🔥 Daily Apply Target</div>
              <button onClick={() => setShowTargetEdit(!showTargetEdit)} className="text-xs text-[#4a6680] hover:text-white border border-[#1e2838] px-2 py-1 rounded-lg">
                Target: {dailyTarget}/day ✏️
              </button>
            </div>
            {showTargetEdit && (
              <div className="mb-3 flex items-center gap-3">
                <input type="range" min="1" max="20" value={dailyTarget} onChange={e => setDailyTarget(parseInt(e.target.value))} className="flex-1 accent-[#00f0c8]" />
                <span className="text-[#00f0c8] font-bold text-sm w-16">{dailyTarget} apps/day</span>
              </div>
            )}
            <div className="h-3 bg-[#1e2838] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (todayCount / dailyTarget) * 100)}%`, background: todayCount >= dailyTarget ? '#39e87a' : '#00f0c8' }} />
            </div>
            <div className="flex justify-between text-xs mt-1.5">
              <span className="text-[#4a6680]">{todayCount} applied today</span>
              <span className={todayCount >= dailyTarget ? 'text-[#39e87a] font-bold' : 'text-[#4a6680]'}>
                {todayCount >= dailyTarget ? '✅ Goal reached!' : `${dailyTarget - todayCount} more to go`}
              </span>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-3 gap-5">
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
              <div className="text-sm font-bold text-white mb-4">🥧 Applications by Status</div>
              {pieData.length === 0 ? <div className="text-center py-6 text-[#4a6680] text-sm">No applications yet</div> : <PieChart data={pieData} />}
            </div>
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
              <div className="text-sm font-bold text-white mb-4">📊 Status Breakdown</div>
              {barData.length === 0 ? <div className="text-center py-6 text-[#4a6680] text-sm">No applications yet</div> : <BarChart data={barData} />}
            </div>
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
              <div className="text-sm font-bold text-white mb-4">📈 ATS Score History</div>
              {(overview.ats_history || []).length === 0 ? (
                <div className="text-center py-6 text-[#4a6680] text-sm">Score a resume to see history</div>
              ) : (
                <div>
                  <div className="flex items-end gap-1.5 h-24 mb-2">
                    {overview.ats_history.slice(-12).map((h: any, i: number) => (
                      <div key={i} title={`${h.score}%`} className="flex-1 rounded-t hover:opacity-80 transition-all"
                        style={{ height: `${h.score}%`, background: h.score >= 80 ? '#39e87a' : h.score >= 60 ? '#00f0c8' : '#ff7c4d', minHeight: '4px' }} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-[#4a6680]">
                    <span>Oldest</span>
                    <span className="text-[#00f0c8] font-bold">Latest: {overview.ats_history[overview.ats_history.length - 1]?.score}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Heatmap */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
            <div className="text-sm font-bold text-white mb-4">🗓 Application Heatmap
              <span className="text-xs text-[#4a6680] font-normal ml-2">Last 26 weeks</span>
            </div>
            <Heatmap data={heatmapData} />
          </div>

          {/* Salary summary */}
          {salaries.length > 0 && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
              <div className="text-sm font-bold text-white mb-4">💰 Salary Overview</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><div className="text-2xl font-bold text-[#39e87a]">{salaries.length}</div><div className="text-xs text-[#4a6680] mt-1">Tracked</div></div>
                <div><div className="text-2xl font-bold text-[#00f0c8]">{avgSalary.toLocaleString()}</div><div className="text-xs text-[#4a6680] mt-1">Avg Salary</div></div>
                <div><div className="text-2xl font-bold text-[#ffd84d]">{maxSalary.toLocaleString()}</div><div className="text-xs text-[#4a6680] mt-1">Highest Offer</div></div>
              </div>
            </div>
          )}

          {/* Achievements */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-white">🏆 Achievements</div>
              <div className="text-xs text-[#ffd84d]">{earnedCount} / {achievements.length} earned</div>
            </div>
            <div className="h-1.5 bg-[#1e2838] rounded-full overflow-hidden mb-4">
              <div className="h-full rounded-full bg-[#ffd84d] transition-all duration-700" style={{ width: `${(earnedCount / achievements.length) * 100}%` }} />
            </div>
            <div className="grid grid-cols-5 gap-3 sm:grid-cols-10">
              {achievements.map((a, i) => <Badge key={i} {...a} />)}
            </div>
          </div>
        </div>
      )}

      {overview && overview.applications.total === 0 && tab === 'overview' && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📊</div>
          <div className="text-white font-bold text-lg mb-2">No data yet</div>
          <p className="text-[#4a6680] text-sm">Add job applications and score resumes to see analytics</p>
        </div>
      )}

      {/* ══ SKILLS ══ */}
      {tab === 'skills' && (
        <div className="max-w-3xl">
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6680] text-sm">🔍</span>
              <input className="w-full bg-[#0c1018] border border-[#1e2838] rounded-lg pl-8 pr-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors"
                placeholder="Search skills..." value={skillSearch} onChange={e => setSkillSearch(e.target.value)} />
            </div>
            <select value={skillFilter} onChange={e => setSkillFilter(e.target.value as any)}
              className="bg-[#0c1018] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#00f0c8]">
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
            <button onClick={() => setShowAddSkill(true)} className="bg-[#00f0c8] text-black font-bold px-4 py-2 rounded-lg text-sm">+ Add Skill</button>
          </div>
          <div className="text-xs text-[#4a6680] mb-3">{filteredSkills.length} of {skills.length} skills</div>

          {showAddSkill && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-bold text-white">Add Skill</div>
                  <button onClick={() => setShowAddSkill(false)} className="text-[#4a6680] hover:text-white">✕</button>
                </div>
                <form onSubmit={handleAddSkill} className="space-y-4">
                  <div>
                    <label className="text-xs text-[#7a96b0] block mb-1.5">Skill Name *</label>
                    <input className={inputCls} value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="e.g. Python, LangChain, Docker..." required />
                  </div>
                  <div>
                    <label className="text-xs text-[#7a96b0] block mb-1.5">Level: <span style={{ color: levelColor(newLevel) }}>{newLevel}% ({levelLabel(newLevel)})</span></label>
                    <input type="range" min="0" max="100" value={newLevel} onChange={e => setNewLevel(parseInt(e.target.value))} className="w-full accent-[#00f0c8]" />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowAddSkill(false)} className="flex-1 bg-[#111620] border border-[#1e2838] text-white py-2.5 rounded-lg text-sm">Cancel</button>
                    <button type="submit" className="flex-1 bg-[#00f0c8] text-black font-bold py-2.5 rounded-lg text-sm">Add Skill</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showGoalForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-bold text-white">🎯 Set Goal</div>
                  <button onClick={() => setShowGoalForm(null)} className="text-[#4a6680] hover:text-white">✕</button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[#7a96b0] block mb-1.5">Target: <span style={{ color: levelColor(goalTarget) }}>{goalTarget}% ({levelLabel(goalTarget)})</span></label>
                    <input type="range" min="0" max="100" value={goalTarget} onChange={e => setGoalTarget(parseInt(e.target.value))} className="w-full accent-[#9b7bff]" />
                  </div>
                  <div>
                    <label className="text-xs text-[#7a96b0] block mb-1.5">Deadline *</label>
                    <input type="date" className={inputCls} value={goalDeadline} onChange={e => setGoalDeadline(e.target.value)} />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowGoalForm(null)} className="flex-1 bg-[#111620] border border-[#1e2838] text-white py-2.5 rounded-lg text-sm">Cancel</button>
                    <button onClick={() => addGoal(showGoalForm)} className="flex-1 bg-[#9b7bff] text-white font-bold py-2.5 rounded-lg text-sm">Set Goal</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {filteredSkills.length === 0 ? (
            <div className="text-center py-16 bg-[#0c1018] border border-[#1e2838] rounded-xl">
              <div className="text-5xl mb-4">📈</div>
              <div className="text-white font-bold text-lg mb-2">{skills.length === 0 ? 'No skills tracked yet' : 'No skills match filter'}</div>
              {skills.length === 0 && <button onClick={() => setShowAddSkill(true)} className="bg-[#00f0c8] text-black font-bold px-6 py-3 rounded-lg mt-3">+ Add First Skill</button>}
            </div>
          ) : (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl overflow-hidden">
              {filteredSkills.map((skill, i) => {
                const goal = goals.find(g => g.skill_id === skill.id)
                const goalProgress = goal ? Math.min(100, (skill.level / goal.target) * 100) : null
                const daysLeft = goal ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000) : null
                return (
                  <div key={skill.id} className={`p-4 ${i < filteredSkills.length - 1 ? 'border-b border-[#1e2838]' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white">{skill.skill_name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold" style={{ color: levelColor(skill.level) }}>{skill.level}% — {levelLabel(skill.level)}</span>
                        <button onClick={() => setShowGoalForm(skill.id)} className="text-xs text-[#9b7bff] hover:text-white border border-[#9b7bff33] rounded px-1.5 py-0.5">🎯</button>
                        <button onClick={() => handleDeleteSkill(skill.id)} className="text-[#4a6680] hover:text-red-400 text-xs">✕</button>
                      </div>
                    </div>
                    <div className="h-2.5 bg-[#1e2838] rounded-full overflow-hidden mb-1">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${skill.level}%`, background: levelColor(skill.level) }} />
                    </div>
                    {goal && (
                      <div className="mb-1">
                        <div className="flex justify-between text-[10px] text-[#7a96b0] mb-0.5">
                          <span>Goal: {goal.target}% by {new Date(goal.deadline).toLocaleDateString()}</span>
                          <span className={daysLeft! < 0 ? 'text-red-400' : daysLeft! <= 7 ? 'text-[#ffd84d]' : 'text-[#4a6680]'}>
                            {daysLeft! < 0 ? 'Overdue' : `${daysLeft}d left`}
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#1e2838] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${goalProgress}%`, background: goalProgress! >= 100 ? '#39e87a' : '#9b7bff' }} />
                        </div>
                        <div className="flex justify-between text-[10px] mt-0.5">
                          <span className="text-[#4a6680]">{Math.round(goalProgress!)}% towards goal</span>
                          <button onClick={() => removeGoal(skill.id)} className="text-[#4a6680] hover:text-red-400">Remove goal</button>
                        </div>
                      </div>
                    )}
                    <input type="range" min="0" max="100" value={skill.level}
                      onChange={e => handleUpdateLevel(skill.id, parseInt(e.target.value))} className="w-full accent-[#00f0c8]" />
                    <div className="flex justify-between text-[10px] text-[#4a6680] mt-0.5">
                      <span>Beginner</span><span>Intermediate</span><span>Advanced</span><span>Expert</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ REPORT ══ */}
      {tab === 'report' && (
        <div className="max-w-3xl">
          {!report ? (
            <div className="text-center py-16 bg-[#0c1018] border border-[#1e2838] rounded-xl">
              <div className="text-5xl mb-4">📅</div>
              <div className="text-white font-bold text-lg mb-2">Generate your weekly report</div>
              <p className="text-[#4a6680] text-sm mb-6">AI analyzes your career data and gives personalized insights</p>
              <button onClick={handleGenerateReport} disabled={loading} className="bg-[#9b7bff] text-white font-bold px-6 py-3 rounded-lg disabled:opacity-40">
                {loading ? '⚡ Generating...' : '📅 Generate Report'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { value: report.stats.weekly_apps, label: 'This Week', color: '#00f0c8' },
                  { value: report.stats.total_apps, label: 'Total Apps', color: '#9b7bff' },
                  { value: `${report.stats.best_ats}%`, label: 'Best ATS', color: '#ff7c4d' },
                  { value: report.stats.skills_count, label: 'Skills', color: '#39e87a' },
                ].map((s, i) => (
                  <div key={i} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs text-[#4a6680] mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-bold text-white">📅 Weekly Career Report</div>
                  <div className="text-xs text-[#4a6680]">{new Date(report.generated_at).toLocaleDateString()}</div>
                </div>
                <div className="bg-[#111620] border border-[#1e2838] rounded-xl p-5">
                  <div className="text-sm text-white leading-relaxed whitespace-pre-wrap">{report.report}</div>
                </div>
                <div className="flex gap-3 mt-4 flex-wrap">
                  <button onClick={handleGenerateReport} disabled={loading} className="bg-[#9b7bff] text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-40">🔄 Regenerate</button>
                  <button onClick={() => navigator.clipboard.writeText(report.report)} className="bg-[#111620] border border-[#1e2838] text-white px-4 py-2 rounded-lg text-sm hover:border-[#263040]">📋 Copy</button>
                  <button onClick={exportCSV} className="bg-[#111620] border border-[#1e2838] text-white px-4 py-2 rounded-lg text-sm hover:border-[#263040]">📤 Export CSV</button>
                  <button onClick={exportPDF} className="bg-[#39e87a22] border border-[#39e87a44] text-[#39e87a] font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#39e87a33]">📄 Export PDF</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ CALENDAR ══ */}
      {tab === 'calendar' && (
        <div className="max-w-5xl space-y-5">
          <div className="grid grid-cols-5 gap-5">
            <div className="col-span-3 bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="text-[#4a6680] hover:text-white px-2">←</button>
                <div className="text-sm font-bold text-white">{calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="text-[#4a6680] hover:text-white px-2">→</button>
              </div>
              <div className="grid grid-cols-7 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-center text-[10px] text-[#4a6680] font-bold py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: getFirstDay(calendarDate.getFullYear(), calendarDate.getMonth()) }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: getDaysInMonth(calendarDate.getFullYear(), calendarDate.getMonth()) }).map((_, i) => {
                  const day = i + 1
                  const dayRem = remindersOnDay(day)
                  const isToday = new Date().getDate() === day && new Date().getMonth() === calendarDate.getMonth() && new Date().getFullYear() === calendarDate.getFullYear()
                  return (
                    <div key={day} className={`aspect-square flex flex-col items-center justify-start pt-1 rounded-lg text-xs cursor-pointer hover:bg-[#1e2838] transition-all ${isToday ? 'bg-[#00f0c820] border border-[#00f0c8]' : ''}`}>
                      <span className={`font-bold ${isToday ? 'text-[#00f0c8]' : 'text-[#7a96b0]'}`}>{day}</span>
                      <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                        {dayRem.slice(0, 3).map((r, ri) => (
                          <div key={ri} className="w-1.5 h-1.5 rounded-full" style={{ background: reminderColors[r.type] }} title={r.title} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-4 mt-4 pt-4 border-t border-[#1e2838]">
                {Object.entries(reminderColors).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-1.5 text-[10px] text-[#4a6680]">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} /><span className="capitalize">{type}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-bold text-white">🔔 Reminders</div>
                  <button onClick={() => setShowAddReminder(!showAddReminder)} className="bg-[#00f0c8] text-black font-bold text-xs px-3 py-1.5 rounded-lg">+ Add</button>
                </div>
                {showAddReminder && (
                  <div className="bg-[#111620] border border-[#1e2838] rounded-xl p-4 mb-4 space-y-3">
                    <input className={inputCls} placeholder="Reminder title..." value={newReminder.title} onChange={e => setNewReminder(p => ({ ...p, title: e.target.value }))} />
                    <input type="date" className={inputCls} value={newReminder.date} onChange={e => setNewReminder(p => ({ ...p, date: e.target.value }))} />
                    <select className={inputCls} value={newReminder.type} onChange={e => setNewReminder(p => ({ ...p, type: e.target.value as Reminder['type'] }))}>
                      <option value="interview">Interview</option>
                      <option value="followup">Follow-up</option>
                      <option value="deadline">Deadline</option>
                      <option value="other">Other</option>
                    </select>
                    <textarea className={inputCls} placeholder="Notes (optional)..." rows={2} value={newReminder.note} onChange={e => setNewReminder(p => ({ ...p, note: e.target.value }))} />
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddReminder(false)} className="flex-1 bg-[#0c1018] border border-[#1e2838] text-white py-2 rounded-lg text-xs">Cancel</button>
                      <button onClick={addReminder} className="flex-1 bg-[#00f0c8] text-black font-bold py-2 rounded-lg text-xs">Save</button>
                    </div>
                  </div>
                )}
                {reminders.length === 0
                  ? <div className="text-center py-6 text-[#4a6680] text-xs">No reminders yet</div>
                  : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {[...reminders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(r => {
                        const daysLeft = Math.ceil((new Date(r.date).getTime() - Date.now()) / 86400000)
                        return (
                          <div key={r.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${r.done ? 'opacity-40 border-[#1e2838]' : 'border-[#1e2838] hover:border-[#263040]'}`}>
                            <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: reminderColors[r.type] }} />
                            <div className="flex-1 min-w-0">
                              <div className={`text-xs font-bold truncate ${r.done ? 'line-through text-[#4a6680]' : 'text-white'}`}>{r.title}</div>
                              <div className="text-[10px] text-[#4a6680] mt-0.5">{new Date(r.date).toLocaleDateString()} · <span className="capitalize">{r.type}</span></div>
                              {r.note && <div className="text-[10px] text-[#7a96b0] mt-0.5 italic">{r.note}</div>}
                              {!r.done && (
                                <div className={`text-[10px] mt-0.5 font-bold ${daysLeft < 0 ? 'text-red-400' : daysLeft <= 2 ? 'text-[#ffd84d]' : 'text-[#4a6680]'}`}>
                                  {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Today!' : `${daysLeft}d left`}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 flex-shrink-0">
                              <button onClick={() => toggleReminder(r.id)} className="text-[10px] text-[#4a6680] hover:text-[#00f0c8]">{r.done ? '↩' : '✓'}</button>
                              <button onClick={() => deleteReminder(r.id)} className="text-[10px] text-[#4a6680] hover:text-red-400">✕</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Salary Tracker */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-white">💰 Salary Tracker</div>
              <button onClick={() => setShowAddSalary(!showAddSalary)} className="bg-[#39e87a] text-black font-bold text-xs px-3 py-1.5 rounded-lg">+ Add</button>
            </div>
            {showAddSalary && (
              <div className="bg-[#111620] border border-[#1e2838] rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
                <input className={inputCls} placeholder="Company name" value={newSalary.company} onChange={e => setNewSalary(p => ({ ...p, company: e.target.value }))} />
                <input className={inputCls} placeholder="Role / Position" value={newSalary.role} onChange={e => setNewSalary(p => ({ ...p, role: e.target.value }))} />
                <input type="number" className={inputCls} placeholder="Min salary" value={newSalary.min || ''} onChange={e => setNewSalary(p => ({ ...p, min: parseInt(e.target.value) || 0 }))} />
                <input type="number" className={inputCls} placeholder="Max salary" value={newSalary.max || ''} onChange={e => setNewSalary(p => ({ ...p, max: parseInt(e.target.value) || 0 }))} />
                <select className={inputCls} value={newSalary.currency} onChange={e => setNewSalary(p => ({ ...p, currency: e.target.value }))}>
                  <option value="BDT">BDT ৳</option><option value="USD">USD $</option><option value="EUR">EUR €</option><option value="GBP">GBP £</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddSalary(false)} className="flex-1 bg-[#0c1018] border border-[#1e2838] text-white py-2 rounded-lg text-xs">Cancel</button>
                  <button onClick={addSalary} className="flex-1 bg-[#39e87a] text-black font-bold py-2 rounded-lg text-xs">Save</button>
                </div>
              </div>
            )}
            {salaries.length === 0
              ? <div className="text-center py-6 text-[#4a6680] text-sm">No salary data yet — track offers and expectations!</div>
              : (
                <div className="space-y-2">
                  {salaries.map(s => {
                    const maxAll = Math.max(...salaries.map(e => e.max), 1)
                    return (
                      <div key={s.id} className="flex items-center gap-4 p-3 bg-[#111620] border border-[#1e2838] rounded-xl">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-white truncate">{s.company}</span>
                            <span className="text-xs text-[#4a6680] ml-2 flex-shrink-0">{s.role}</span>
                          </div>
                          <div className="h-2 bg-[#1e2838] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#39e87a] transition-all" style={{ width: `${(s.max / maxAll) * 100}%` }} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-[#39e87a]">{s.min.toLocaleString()}–{s.max.toLocaleString()}</div>
                          <div className="text-xs text-[#4a6680]">{s.currency}</div>
                        </div>
                        <button onClick={() => setSalaries(prev => prev.filter(e => e.id !== s.id))} className="text-[#4a6680] hover:text-red-400 text-xs">✕</button>
                      </div>
                    )
                  })}
                </div>
              )}
          </div>

          {/* Application Notes */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-white">📝 Application Notes</div>
              <button onClick={() => setShowAddNote(!showAddNote)} className="bg-[#9b7bff] text-white font-bold text-xs px-3 py-1.5 rounded-lg">+ Add Note</button>
            </div>
            {showAddNote && (
              <div className="bg-[#111620] border border-[#1e2838] rounded-xl p-4 mb-4 space-y-3">
                <input className={inputCls} placeholder="Company / Application name" value={newNote.company} onChange={e => setNewNote(p => ({ ...p, company: e.target.value }))} />
                <textarea className={inputCls} placeholder="Notes, interviewer names, questions asked, follow-up details..." rows={3} value={newNote.content} onChange={e => setNewNote(p => ({ ...p, content: e.target.value }))} />
                <div className="flex gap-2">
                  <button onClick={() => setShowAddNote(false)} className="flex-1 bg-[#0c1018] border border-[#1e2838] text-white py-2 rounded-lg text-xs">Cancel</button>
                  <button onClick={addNote} className="flex-1 bg-[#9b7bff] text-white font-bold py-2 rounded-lg text-xs">Save Note</button>
                </div>
              </div>
            )}
            {appNotes.length === 0
              ? <div className="text-center py-6 text-[#4a6680] text-sm">No notes yet — jot down interview questions, contacts, deadlines...</div>
              : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {[...appNotes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(n => (
                    <div key={n.id} className="p-4 bg-[#111620] border border-[#1e2838] rounded-xl group relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#9b7bff]">{n.company}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#4a6680]">{new Date(n.date).toLocaleDateString()}</span>
                          <button onClick={() => setAppNotes(prev => prev.filter(e => e.id !== n.id))} className="text-[#4a6680] hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all">✕</button>
                        </div>
                      </div>
                      <p className="text-sm text-[#7a96b0] leading-relaxed whitespace-pre-wrap">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}

      {/* ══ AI TOOLS ══ */}
      {tab === 'ai' && (
        <div className="max-w-3xl space-y-6">
          {/* Job Match Score */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6">
            <div className="text-sm font-bold text-white mb-1">🤖 Job Match Score</div>
            <p className="text-xs text-[#4a6680] mb-4">Paste a job description — AI will analyze how well your current skills match</p>
            <textarea className={inputCls} rows={6} placeholder="Paste the job description here..." value={jdText} onChange={e => setJdText(e.target.value)} />
            <div className="flex items-center gap-3 mt-3">
              <button onClick={handleJobMatch} disabled={matchLoading || !jdText.trim() || skills.length === 0}
                className="bg-[#00f0c8] text-black font-bold px-5 py-2.5 rounded-lg text-sm disabled:opacity-40 hover:brightness-110 transition-all">
                {matchLoading ? '⚡ Analyzing...' : '🔍 Analyze Match'}
              </button>
              {skills.length === 0 && <span className="text-xs text-[#ff7c4d]">⚠️ Add skills first in the Skills tab</span>}
            </div>
            {matchResult && (
              <div className="mt-4 bg-[#111620] border border-[#1e2838] rounded-xl p-5">
                <div className="text-xs font-bold text-[#00f0c8] mb-3">📊 Match Analysis</div>
                <div className="text-sm text-white leading-relaxed whitespace-pre-wrap">{matchResult}</div>
                <button onClick={() => navigator.clipboard.writeText(matchResult)} className="mt-3 bg-[#111620] border border-[#1e2838] text-white px-3 py-1.5 rounded-lg text-xs hover:border-[#263040]">📋 Copy</button>
              </div>
            )}
          </div>

          {/* Interview Q&A */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6">
            <div className="text-sm font-bold text-white mb-1">🎤 Interview Q&A Practice</div>
            <p className="text-xs text-[#4a6680] mb-4">Enter a role and get AI-generated interview questions with answer hints</p>
            <input className={inputCls} placeholder="e.g. React Developer, Data Analyst, Product Manager..." value={interviewRole} onChange={e => setInterviewRole(e.target.value)} />
            <button onClick={handleInterviewQA} disabled={qaLoading || !interviewRole.trim()}
              className="mt-3 bg-[#9b7bff] text-white font-bold px-5 py-2.5 rounded-lg text-sm disabled:opacity-40 hover:brightness-110 transition-all">
              {qaLoading ? '⚡ Generating...' : '🎤 Generate Questions'}
            </button>
            {qaResult && (
              <div className="mt-4 bg-[#111620] border border-[#1e2838] rounded-xl p-5">
                <div className="text-xs font-bold text-[#9b7bff] mb-3">💬 Interview Questions</div>
                <div className="text-sm text-white leading-relaxed whitespace-pre-wrap">{qaResult}</div>
                <button onClick={() => navigator.clipboard.writeText(qaResult)} className="mt-3 bg-[#111620] border border-[#1e2838] text-white px-3 py-1.5 rounded-lg text-xs hover:border-[#263040]">📋 Copy Questions</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
