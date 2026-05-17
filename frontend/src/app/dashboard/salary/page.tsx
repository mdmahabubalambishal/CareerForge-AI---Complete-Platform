'use client'
import { useState, useEffect, useRef } from 'react'
import { jobsApi } from '@/lib/api'

const DEFAULT_ROLES = ['LLM Engineer', 'ML Engineer', 'Data Scientist', 'AI Engineer', 'Program Officer']

const CURRENCIES = [
  { code: 'USD', symbol: '$', rate: 1 },
  { code: 'BDT', symbol: '৳', rate: 110 },
  { code: 'EUR', symbol: '€', rate: 0.92 },
  { code: 'GBP', symbol: '£', rate: 0.79 },
  { code: 'CAD', symbol: 'C$', rate: 1.36 },
  { code: 'INR', symbol: '₹', rate: 83 },
]

const EXP_LEVELS = ['All', 'Junior', 'Mid', 'Senior', 'Lead']

type SalaryEntry = {
  company: string
  location: string
  experience_level: string
  min_salary: number
  max_salary: number
  avg_salary: number
  currency: string
  source: string
  role?: string
}

type SalaryResult = {
  role: string
  data: SalaryEntry[]
  summary: { min: number; max: number; avg: number; count: number }
}

type SavedResult = SalaryResult & { savedAt: string; location: string }

export default function SalaryPage() {
  const [role, setRole] = useState('LLM Engineer')
  const [location, setLocation] = useState('')
  const [results, setResults] = useState<Record<string, SalaryResult>>({})
  const [activeRole, setActiveRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareRoles, setCompareRoles] = useState<string[]>([])
  const [quickRoles, setQuickRoles] = useState<string[]>(DEFAULT_ROLES)
  const [newRole, setNewRole] = useState('')
  const [showAddInput, setShowAddInput] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'compare' | 'ai' | 'saved'>('overview')
  const [aiTips, setAiTips] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [currency, setCurrency] = useState(CURRENCIES[0])
  const [expFilter, setExpFilter] = useState('All')
  const [mySalary, setMySalary] = useState('')
  const [showCalc, setShowCalc] = useState(false)
  const [savedResults, setSavedResults] = useState<Record<string, SavedResult>>({})
  const [negotiationEmail, setNegotiationEmail] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [relatedRoles, setRelatedRoles] = useState<string[]>([])

  const salaryData = activeRole ? results[activeRole] : null

  // localStorage load
  useEffect(() => {
    const savedQ = localStorage.getItem('salary_quick_roles')
    if (savedQ) { try { setQuickRoles(JSON.parse(savedQ)) } catch {} }
    const savedR = localStorage.getItem('salary_saved_results')
    if (savedR) { try { setSavedResults(JSON.parse(savedR)) } catch {} }
  }, [])

  function saveQuickRoles(roles: string[]) {
    setQuickRoles(roles)
    localStorage.setItem('salary_quick_roles', JSON.stringify(roles))
  }

  function handleAddRole() {
    const trimmed = newRole.trim()
    if (!trimmed || quickRoles.includes(trimmed)) return
    saveQuickRoles([...quickRoles, trimmed])
    setNewRole('')
    setShowAddInput(false)
    setRole(trimmed)
  }

  function handleRemoveRole(r: string) {
    const updated = quickRoles.filter(q => q !== r)
    saveQuickRoles(updated)
    if (role === r && updated.length > 0) setRole(updated[0])
  }

  function handleSaveResult() {
    if (!salaryData) return
    const updated = {
      ...savedResults,
      [salaryData.role]: { ...salaryData, savedAt: new Date().toLocaleDateString(), location }
    }
    setSavedResults(updated)
    localStorage.setItem('salary_saved_results', JSON.stringify(updated))
  }

  function handleDeleteSaved(r: string) {
    const updated = { ...savedResults }
    delete updated[r]
    setSavedResults(updated)
    localStorage.setItem('salary_saved_results', JSON.stringify(updated))
  }

  // currency convert
  function convert(usdAmount: number) {
    return Math.round(usdAmount * currency.rate)
  }

  function fmt(amount: number) {
    return `${currency.symbol}${convert(amount)?.toLocaleString()}`
  }

  // filter by experience
  const filteredData = salaryData?.data.filter(d =>
    expFilter === 'All' || d.experience_level?.toLowerCase().includes(expFilter.toLowerCase())
  ) || []

  const filteredSummary = filteredData.length > 0 ? {
    min: Math.min(...filteredData.map(d => d.min_salary)),
    max: Math.max(...filteredData.map(d => d.max_salary)),
    avg: Math.round(filteredData.reduce((s, d) => s + d.avg_salary, 0) / filteredData.length),
    count: filteredData.length,
  } : salaryData?.summary

  // "Am I underpaid?" calc
  const myNum = parseInt(mySalary.replace(/,/g, '')) || 0
  const marketAvg = filteredSummary?.avg || 0
  const diffPct = marketAvg > 0 ? Math.round(((myNum - marketAvg) / marketAvg) * 100) : 0
  const calcStatus = diffPct >= 10 ? 'above' : diffPct >= -10 ? 'at' : 'below'

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!role.trim()) return
    setLoading(true)
    setAiTips(null)
    setNegotiationEmail(null)
    setRelatedRoles([])
    try {
      const data = await jobsApi.salaryInsights(role, location)
      setResults(prev => ({ ...prev, [role]: data }))
      setActiveRole(role)
      setActiveTab('overview')
      if (compareMode && !compareRoles.includes(role)) {
        setCompareRoles(prev => [...prev, role])
      }
      // Related roles — keyword based
      generateRelatedRoles(role)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  function generateRelatedRoles(r: string) {
    const lower = r.toLowerCase()
    const all = [
      'LLM Engineer', 'ML Engineer', 'AI Engineer', 'Data Scientist', 'MLOps Engineer',
      'Data Engineer', 'Software Engineer', 'Backend Engineer', 'Frontend Engineer',
      'DevOps Engineer', 'Product Manager', 'Program Officer', 'Project Manager',
      'Business Analyst', 'Research Scientist', 'NLP Engineer', 'Computer Vision Engineer',
    ]
    const related = all.filter(candidate => {
      if (candidate === r) return false
      const cl = candidate.toLowerCase()
      const words = lower.split(' ')
      return words.some(w => w.length > 3 && cl.includes(w))
    }).slice(0, 4)
    setRelatedRoles(related)
  }

  async function handleGetAiTips() {
    if (!salaryData) return
    setAiLoading(true)
    setActiveTab('ai')
    try {
      const fakeOffer = `Role: ${salaryData.role}. Market average: $${filteredSummary?.avg?.toLocaleString()}. Range: $${filteredSummary?.min?.toLocaleString()} - $${filteredSummary?.max?.toLocaleString()}. Location: ${location || 'Global'}. Experience filter: ${expFilter}.`
      const data = await jobsApi.analyzeOffer(fakeOffer, salaryData.role, 'Market Analysis')
      setAiTips(data.summary || 'No tips generated.')
    } catch {
      setAiTips('Could not generate AI tips. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleGenerateEmail() {
    if (!salaryData) return
    setEmailLoading(true)
    try {
      const prompt = `Write a professional salary negotiation email for a ${salaryData.role} position. The market average is $${filteredSummary?.avg?.toLocaleString()} and I want to negotiate for $${Math.round((filteredSummary?.avg || 0) * 1.15)?.toLocaleString()} (15% above market). Keep it concise, confident, and professional. 3 short paragraphs max.`
      const data = await jobsApi.analyzeOffer(prompt, salaryData.role, 'Email Generation')
      setNegotiationEmail(data.summary || 'Could not generate email.')
    } catch {
      setNegotiationEmail('Could not generate email. Please try again.')
    } finally {
      setEmailLoading(false)
    }
  }

  function handleExportCSV() {
    if (!salaryData) return
    const rows = [
      ['Company', 'Location', 'Experience', 'Min Salary', 'Avg Salary', 'Max Salary', 'Currency', 'Source'],
      ...filteredData.map(d => [d.company, d.location, d.experience_level, d.min_salary, d.avg_salary, d.max_salary, d.currency, d.source])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `salary_${salaryData.role.replace(/ /g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function SalaryBar({ min, avg, max, globalMin, globalMax }: { min: number; avg: number; max: number; globalMin: number; globalMax: number }) {
    const range = globalMax - globalMin || 1
    const minPct = ((min - globalMin) / range) * 100
    const maxPct = ((max - globalMin) / range) * 100
    const avgPct = ((avg - globalMin) / range) * 100
    return (
      <div className="relative h-3 bg-[#1e2838] rounded-full overflow-visible my-1">
        <div className="absolute h-full rounded-full bg-gradient-to-r from-[#4d9fff]/40 to-[#00f0c8]/40"
          style={{ left: `${minPct}%`, width: `${Math.max(maxPct - minPct, 2)}%` }} />
        <div className="absolute w-2.5 h-2.5 rounded-full bg-[#00f0c8] border-2 border-[#0c1018] top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-lg"
          style={{ left: `${avgPct}%` }} />
      </div>
    )
  }

  const inputCls = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors'
  const labelCls = 'text-[#7a96b0] text-xs font-medium block mb-1.5'

  const compareData = compareRoles.map(r => results[r]).filter(Boolean) as SalaryResult[]
  const allAvgs = compareData.map(d => d.summary.avg)
  const compareMax = Math.max(...allAvgs, 1)

  const isSaved = activeRole ? !!savedResults[activeRole] : false

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Salary Insights</h1>
          <p className="text-[#4a6680] text-sm mt-1">Research, compare & negotiate with confidence</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Currency selector */}
          <select
            value={currency.code}
            onChange={e => setCurrency(CURRENCIES.find(c => c.code === e.target.value) || CURRENCIES[0])}
            className="text-xs px-2.5 py-2 bg-[#111620] border border-[#1e2838] text-white rounded-lg focus:outline-none focus:border-[#00f0c8]">
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} {c.symbol}</option>)}
          </select>

          {salaryData && (
            <>
              <button onClick={() => setShowCalc(!showCalc)}
                className={`text-xs px-3 py-2 rounded-lg border transition-all ${showCalc ? 'bg-[#ffd84d]/10 border-[#ffd84d]/30 text-[#ffd84d]' : 'bg-[#111620] border-[#1e2838] text-[#7a96b0] hover:text-white'}`}>
                🧮 Am I Underpaid?
              </button>
              <button onClick={handleSaveResult}
                className={`text-xs px-3 py-2 rounded-lg border transition-all ${isSaved ? 'bg-[#39e87a]/10 border-[#39e87a]/30 text-[#39e87a]' : 'bg-[#111620] border-[#1e2838] text-[#7a96b0] hover:text-white'}`}>
                {isSaved ? '★ Saved' : '☆ Save'}
              </button>
              <button onClick={handleExportCSV}
                className="text-xs px-3 py-2 bg-[#111620] border border-[#1e2838] text-[#7a96b0] hover:text-white rounded-lg transition-all">
                ⬇ CSV
              </button>
              <button onClick={handleGetAiTips} disabled={aiLoading}
                className="text-xs px-3 py-2 bg-[#9b7bff]/20 border border-[#9b7bff]/30 text-[#9b7bff] hover:bg-[#9b7bff]/30 rounded-lg transition-all disabled:opacity-40">
                {aiLoading ? '✨ Thinking...' : '✨ AI Tips'}
              </button>
            </>
          )}
          <button
            onClick={() => { setCompareMode(!compareMode); if (!compareMode) setCompareRoles([]) }}
            className={`text-xs px-3 py-2 rounded-lg border transition-all ${compareMode ? 'bg-[#ffd84d]/10 border-[#ffd84d]/30 text-[#ffd84d]' : 'bg-[#111620] border-[#1e2838] text-[#7a96b0] hover:text-white'}`}>
            ⚖ Compare {compareMode ? `(${compareRoles.length})` : ''}
          </button>
        </div>
      </div>

      {/* "Am I Underpaid?" calculator */}
      {showCalc && salaryData && (
        <div className="mb-5 bg-[#0c1018] border border-[#ffd84d]/20 rounded-xl p-5">
          <div className="text-sm font-bold text-white mb-3">🧮 Am I Underpaid? — {salaryData.role}</div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-48">
              <label className={labelCls}>Your Current Salary ({currency.code})</label>
              <input className={inputCls} value={mySalary} onChange={e => setMySalary(e.target.value)}
                placeholder={`e.g. ${currency.symbol}${convert(80000)?.toLocaleString()}`} />
            </div>
            {myNum > 0 && (
              <div className="flex gap-4 items-center">
                <div className="text-center">
                  <div className="text-xs text-[#4a6680] mb-1">Market Avg</div>
                  <div className="text-lg font-bold text-white">{fmt(marketAvg)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[#4a6680] mb-1">Your Salary</div>
                  <div className="text-lg font-bold text-white">{currency.symbol}{myNum?.toLocaleString()}</div>
                </div>
                <div className={`px-4 py-2 rounded-xl text-center border ${
                  calcStatus === 'above' ? 'bg-[#39e87a]/10 border-[#39e87a]/20' :
                  calcStatus === 'at' ? 'bg-[#ffd84d]/10 border-[#ffd84d]/20' :
                  'bg-[#ff5c9c]/10 border-[#ff5c9c]/20'
                }`}>
                  <div className={`text-2xl font-bold ${calcStatus === 'above' ? 'text-[#39e87a]' : calcStatus === 'at' ? 'text-[#ffd84d]' : 'text-[#ff5c9c]'}`}>
                    {diffPct > 0 ? '+' : ''}{diffPct}%
                  </div>
                  <div className="text-xs text-[#4a6680] mt-0.5">
                    {calcStatus === 'above' ? 'Above market 🎉' : calcStatus === 'at' ? 'At market ✓' : 'Below market ⚠️'}
                  </div>
                </div>
                {calcStatus === 'below' && (
                  <div className="text-xs text-[#4a6680]">
                    <div>You could negotiate for:</div>
                    <div className="text-[#39e87a] font-bold text-base">{fmt(marketAvg)}</div>
                    <div className="text-[#00f0c8]">+{fmt(marketAvg - myNum * (1/currency.rate))} raise</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-5">
        {/* Left sidebar */}
        <div className="space-y-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
            <div className="text-xs font-bold text-white mb-3 uppercase tracking-wide">Search</div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Role *</label>
                <input className={inputCls} value={role} onChange={e => setRole(e.target.value)} placeholder="Any role..." required />
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <input className={inputCls} value={location} onChange={e => setLocation(e.target.value)} placeholder="USA / Bangladesh..." />
              </div>
              <div>
                <label className={labelCls}>Experience Level</label>
                <div className="flex gap-1 flex-wrap">
                  {EXP_LEVELS.map(l => (
                    <button key={l} type="button" onClick={() => setExpFilter(l)}
                      className={`text-[10px] px-2 py-1 rounded border transition-all ${expFilter === l ? 'bg-[#00f0c8]/10 border-[#00f0c8]/30 text-[#00f0c8]' : 'bg-[#111620] border-[#1e2838] text-[#4a6680] hover:text-white'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#00f0c8] text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-40 hover:bg-white transition-all">
                {loading ? '⏳ Searching...' : '💰 Get Salary Data'}
              </button>
            </div>
          </form>

          {/* Quick Roles */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-white uppercase tracking-wide">Quick Roles</div>
              <button onClick={() => saveQuickRoles(DEFAULT_ROLES)} className="text-[10px] text-[#4a6680] hover:text-white">↺</button>
            </div>
            <div className="space-y-1.5 mb-3">
              {quickRoles.map(r => (
                <div key={r} className="group flex items-center gap-1">
                  <button type="button" onClick={() => setRole(r)}
                    className={`flex-1 text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                      role === r ? 'bg-[#00f0c8]/10 border-[#00f0c8]/30 text-[#00f0c8]'
                      : results[r] ? 'bg-[#39e87a]/5 border-[#39e87a]/20 text-[#39e87a]'
                      : 'bg-[#111620] border-[#1e2838] text-[#4a6680] hover:text-white'}`}>
                    {r} {results[r] && <span className="text-[9px] opacity-60">✓</span>}
                  </button>
                  {compareMode && results[r] && (
                    <button type="button"
                      onClick={() => setCompareRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])}
                      className={`text-[10px] w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${compareRoles.includes(r) ? 'bg-[#ffd84d]/20 border-[#ffd84d]/40 text-[#ffd84d]' : 'border-[#1e2838] text-[#4a6680]'}`}>
                      {compareRoles.includes(r) ? '✓' : '+'}
                    </button>
                  )}
                  <button type="button" onClick={() => handleRemoveRole(r)}
                    className="text-[10px] text-[#4a6680] hover:text-red-400 opacity-0 group-hover:opacity-100 w-4 flex-shrink-0">✕</button>
                </div>
              ))}
            </div>
            {showAddInput ? (
              <div className="flex gap-1.5">
                <input className="flex-1 bg-[#111620] border border-[#00f0c8]/30 rounded-lg px-2 py-1.5 text-white text-xs placeholder-[#4a6680] focus:outline-none"
                  value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="e.g. Program Officer" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddRole() } if (e.key === 'Escape') { setShowAddInput(false); setNewRole('') } }} />
                <button type="button" onClick={handleAddRole} className="text-xs px-2 py-1.5 bg-[#00f0c8] text-black font-bold rounded-lg">+</button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowAddInput(true)}
                className="w-full text-xs py-1.5 border border-dashed border-[#1e2838] rounded-lg text-[#4a6680] hover:text-white hover:border-[#263040] transition-all">
                + Add Role
              </button>
            )}
          </div>

          {/* Related roles */}
          {relatedRoles.length > 0 && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
              <div className="text-xs font-bold text-white uppercase tracking-wide mb-3">Related Roles</div>
              <div className="space-y-1.5">
                {relatedRoles.map(r => (
                  <button key={r} type="button" onClick={() => { setRole(r) }}
                    className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg border border-[#1e2838] bg-[#111620] text-[#7a96b0] hover:text-white transition-all">
                    {r} <span className="text-[#4a6680]">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search history */}
          {Object.keys(results).length > 0 && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
              <div className="text-xs font-bold text-white uppercase tracking-wide mb-3">History</div>
              <div className="space-y-1.5">
                {Object.entries(results).map(([r, d]) => (
                  <button key={r} onClick={() => { setActiveRole(r); setRole(r); setActiveTab('overview') }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg border text-xs transition-all ${activeRole === r ? 'bg-[#00f0c8]/10 border-[#00f0c8]/20 text-white' : 'border-[#1e2838] text-[#4a6680] hover:text-white'}`}>
                    <div className="font-medium truncate">{r}</div>
                    <div className="text-[10px] text-[#39e87a]">avg {fmt(d.summary.avg)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="col-span-3 space-y-4">

          {/* Empty state */}
          {!salaryData && !loading && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-16 text-center">
              <div className="text-6xl mb-5">💰</div>
              <div className="text-white font-bold text-xl mb-2">Search any role</div>
              <p className="text-[#4a6680] text-sm mb-6">Salary data for any position — tech, NGO, finance, education, anything</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {DEFAULT_ROLES.map(r => (
                  <button key={r} onClick={() => setRole(r)}
                    className="text-xs px-3 py-1.5 bg-[#111620] border border-[#1e2838] text-[#4a6680] hover:text-white rounded-lg transition-all">{r}</button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-16 text-center">
              <div className="text-5xl mb-4 animate-bounce">💰</div>
              <div className="text-white font-bold text-lg">Fetching data for <span className="text-[#00f0c8]">{role}</span>...</div>
            </div>
          )}

          {salaryData && !loading && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 bg-[#0c1018] border border-[#1e2838] rounded-xl p-1">
                {([
                  { id: 'overview', label: '📊 Overview' },
                  { id: 'breakdown', label: '🏢 Breakdown' },
                  { id: 'compare', label: '⚖ Compare' },
                  { id: 'ai', label: '✨ AI Tips' },
                  { id: 'saved', label: `★ Saved (${Object.keys(savedResults).length})` },
                ] as const).map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === t.id ? 'bg-[#00f0c8] text-black' : 'text-[#7a96b0] hover:text-white'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Minimum', value: filteredSummary?.min || 0, color: '#4d9fff' },
                      { label: 'Average', value: filteredSummary?.avg || 0, color: '#00f0c8', sub: 'Your target' },
                      { label: 'Maximum', value: filteredSummary?.max || 0, color: '#39e87a' },
                    ].map(c => (
                      <div key={c.label} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5 text-center">
                        <div className="text-xs text-[#4a6680] uppercase tracking-wide mb-2">{c.label}</div>
                        <div className="text-3xl font-bold" style={{ color: c.color }}>{fmt(c.value)}</div>
                        {c.sub && <div className="text-xs text-[#4a6680] mt-1">{c.sub}</div>}
                        <div className="text-[10px] text-[#4a6680] mt-1">≈ ${c.value?.toLocaleString()} USD</div>
                      </div>
                    ))}
                  </div>

                  {/* Range bar */}
                  <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-bold text-white">
                        Market Range — <span className="text-[#00f0c8]">{salaryData.role}</span>
                        {expFilter !== 'All' && <span className="text-[#ffd84d] ml-2 text-xs">· {expFilter}</span>}
                      </div>
                      <div className="text-xs text-[#4a6680]">{filteredSummary?.count} entries · {location || 'All locations'} · {currency.code}</div>
                    </div>
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-xs text-[#4a6680] w-28">{fmt(filteredSummary?.min || 0)}</span>
                      <div className="flex-1 h-5 bg-[#1e2838] rounded-full overflow-hidden relative">
                        <div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #4d9fff, #00f0c8, #39e87a)' }} />
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg border-2 border-[#0c1018]"
                          style={{ left: `${(((filteredSummary?.avg || 0) - (filteredSummary?.min || 0)) / ((filteredSummary?.max || 1) - (filteredSummary?.min || 0)) * 100)}%` }} />
                      </div>
                      <span className="text-xs text-[#4a6680] w-28 text-right">{fmt(filteredSummary?.max || 0)}</span>
                    </div>
                    <div className="text-center text-xs text-[#4a6680]">
                      ● Average: <span className="text-white font-bold">{fmt(filteredSummary?.avg || 0)}</span>
                    </div>
                  </div>

                  {/* Negotiation tip */}
                  <div className="bg-gradient-to-br from-[#00f0c8]/5 to-[#4d9fff]/5 border border-[#00f0c8]/15 rounded-xl p-5">
                    <div className="text-sm font-bold text-white mb-2">💡 Negotiation Strategy</div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center">
                        <div className="text-xs text-[#4a6680] mb-1">Floor (don't go below)</div>
                        <div className="text-lg font-bold text-[#4d9fff]">{fmt(filteredSummary?.avg || 0)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-[#4a6680] mb-1">Anchor (+10%)</div>
                        <div className="text-lg font-bold text-[#00f0c8]">{fmt(Math.round((filteredSummary?.avg || 0) * 1.1))}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-[#4a6680] mb-1">Stretch (+20%)</div>
                        <div className="text-lg font-bold text-[#39e87a]">{fmt(Math.round((filteredSummary?.avg || 0) * 1.2))}</div>
                      </div>
                    </div>
                    <p className="text-xs text-[#7a96b0] leading-relaxed">
                      Start at the <strong className="text-[#00f0c8]">Anchor</strong>, be willing to settle at <strong className="text-white">Floor</strong>. 70% of employers expect negotiation. Click{' '}
                      <button onClick={handleGetAiTips} className="text-[#9b7bff] underline">✨ AI Tips</button>{' '}
                      for a personalized script, or{' '}
                      <button onClick={() => { setActiveTab('ai'); handleGenerateEmail() }} className="text-[#00f0c8] underline">generate a negotiation email</button>.
                    </p>
                  </div>
                </div>
              )}

              {/* BREAKDOWN */}
              {activeTab === 'breakdown' && (
                <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-[#1e2838] flex items-center justify-between">
                    <div className="text-sm font-bold text-white">
                      Company Breakdown
                      {expFilter !== 'All' && <span className="ml-2 text-xs text-[#ffd84d]">· {expFilter} only</span>}
                    </div>
                    <div className="flex gap-2">
                      {EXP_LEVELS.map(l => (
                        <button key={l} onClick={() => setExpFilter(l)}
                          className={`text-[10px] px-2 py-1 rounded border transition-all ${expFilter === l ? 'bg-[#00f0c8]/10 border-[#00f0c8]/30 text-[#00f0c8]' : 'border-[#1e2838] text-[#4a6680] hover:text-white'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {filteredData.length === 0 ? (
                    <div className="p-8 text-center text-[#4a6680] text-sm">No data for "{expFilter}" level. Try "All".</div>
                  ) : (
                    <>
                      <div className="p-3 grid grid-cols-5 gap-2 text-[10px] text-[#4a6680] uppercase tracking-wide border-b border-[#1e2838]">
                        <div className="col-span-2">Company</div>
                        <div>Range</div>
                        <div className="text-center">Avg</div>
                        <div className="text-right">Source</div>
                      </div>
                      {filteredData.map((d, i) => (
                        <div key={i} className="p-4 border-b border-[#1e2838] last:border-0 hover:bg-[#111620] transition-all">
                          <div className="grid grid-cols-5 gap-2 items-center mb-2">
                            <div className="col-span-2">
                              <div className="text-sm font-medium text-white">{d.company}</div>
                              <div className="text-xs text-[#4a6680]">{d.location} · {d.experience_level}</div>
                            </div>
                            <div className="text-xs text-[#4a6680]">{fmt(d.min_salary)} – {fmt(d.max_salary)}</div>
                            <div className="text-center text-sm font-bold text-[#39e87a]">{fmt(d.avg_salary)}</div>
                            <div className="text-right text-xs text-[#4a6680]">{d.source}</div>
                          </div>
                          <SalaryBar min={d.min_salary} avg={d.avg_salary} max={d.max_salary}
                            globalMin={filteredSummary?.min || 0} globalMax={filteredSummary?.max || 1} />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* COMPARE */}
              {activeTab === 'compare' && (
                <div className="space-y-4">
                  {compareData.length < 2 ? (
                    <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-10 text-center">
                      <div className="text-4xl mb-3">⚖</div>
                      <div className="text-white font-bold mb-2">Compare Roles Side by Side</div>
                      <p className="text-[#4a6680] text-sm mb-4">Enable Compare mode, search multiple roles, select them from the sidebar.</p>
                      <button onClick={() => setCompareMode(true)} className="text-xs px-4 py-2 bg-[#ffd84d]/10 border border-[#ffd84d]/30 text-[#ffd84d] rounded-lg">
                        Enable Compare Mode
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                        <div className="text-sm font-bold text-white mb-5">Average Salary — {currency.code}</div>
                        <div className="space-y-4">
                          {compareData.map((d, i) => {
                            const pct = (d.summary.avg / compareMax) * 100
                            const colors = ['#00f0c8', '#4d9fff', '#9b7bff', '#ffd84d', '#39e87a', '#ff7c4d']
                            const color = colors[i % colors.length]
                            return (
                              <div key={d.role}>
                                <div className="flex justify-between text-sm mb-1.5">
                                  <span className="text-white font-medium">{d.role}</span>
                                  <span className="font-bold" style={{ color }}>{fmt(d.summary.avg)}</span>
                                </div>
                                <div className="h-8 bg-[#1e2838] rounded-lg overflow-hidden">
                                  <div className="h-full rounded-lg flex items-center px-3 transition-all"
                                    style={{ width: `${pct}%`, background: `${color}20`, borderRight: `2px solid ${color}` }}>
                                    <span className="text-[10px] font-bold" style={{ color }}>{fmt(d.summary.avg)}</span>
                                  </div>
                                </div>
                                <div className="flex justify-between text-[10px] text-[#4a6680] mt-1">
                                  <span>Min: {fmt(d.summary.min)}</span>
                                  <span>Max: {fmt(d.summary.max)}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl overflow-hidden">
                        <div className="grid border-b border-[#1e2838]"
                          style={{ gridTemplateColumns: `140px repeat(${compareData.length}, 1fr)` }}>
                          <div className="p-3 text-xs text-[#4a6680]">Metric</div>
                          {compareData.map(d => <div key={d.role} className="p-3 text-xs font-bold text-white truncate">{d.role}</div>)}
                        </div>
                        {[
                          { label: 'Min', key: 'min' as const },
                          { label: 'Average', key: 'avg' as const },
                          { label: 'Max', key: 'max' as const },
                          { label: 'Data Points', key: 'count' as const },
                        ].map(row => {
                          const vals = compareData.map(d => d.summary[row.key])
                          const maxVal = Math.max(...vals)
                          return (
                            <div key={row.key} className="grid border-b border-[#1e2838] last:border-0 hover:bg-[#111620]"
                              style={{ gridTemplateColumns: `140px repeat(${compareData.length}, 1fr)` }}>
                              <div className="p-3 text-xs text-[#4a6680]">{row.label}</div>
                              {vals.map((v, i) => (
                                <div key={i} className={`p-3 text-xs font-bold ${v === maxVal && row.key !== 'count' ? 'text-[#39e87a]' : 'text-white'}`}>
                                  {row.key !== 'count' ? fmt(v) : v}
                                  {v === maxVal && row.key !== 'count' && <span className="ml-1 text-[9px]">↑</span>}
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* AI TIPS */}
              {activeTab === 'ai' && (
                <div className="space-y-4">
                  {aiLoading && (
                    <div className="bg-[#0c1018] border border-[#9b7bff]/20 rounded-xl p-10 text-center">
                      <div className="text-4xl mb-3">✨</div>
                      <div className="text-white font-bold">Generating strategy for {salaryData.role}...</div>
                    </div>
                  )}
                  {!aiLoading && !aiTips && (
                    <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-10 text-center">
                      <div className="text-4xl mb-3">✨</div>
                      <div className="text-white font-bold mb-2">AI Negotiation Tips</div>
                      <p className="text-[#4a6680] text-sm mb-5">Personalized strategy for <strong className="text-white">{salaryData.role}</strong></p>
                      <button onClick={handleGetAiTips} className="px-6 py-2.5 bg-[#9b7bff] text-white font-bold rounded-lg text-sm hover:bg-[#8a6aee] transition-all">
                        ✨ Generate Tips
                      </button>
                    </div>
                  )}
                  {!aiLoading && aiTips && (
                    <div className="bg-gradient-to-br from-[#9b7bff]/5 to-[#4d9fff]/5 border border-[#9b7bff]/20 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span>✨</span>
                          <div className="text-sm font-bold text-white">AI Strategy — {salaryData.role}</div>
                        </div>
                        <button onClick={handleGetAiTips} className="text-xs text-[#9b7bff] hover:text-white border border-[#9b7bff]/30 px-2 py-1 rounded">↺ Regenerate</button>
                      </div>
                      <div className="text-sm text-[#c0d0e0] leading-relaxed whitespace-pre-wrap mb-4">{aiTips}</div>
                      <div className="grid grid-cols-3 gap-3 text-center pt-4 border-t border-[#9b7bff]/10">
                        <div>
                          <div className="text-lg font-bold text-[#00f0c8]">{fmt(filteredSummary?.avg || 0)}</div>
                          <div className="text-xs text-[#4a6680]">Market Average</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-[#ffd84d]">{fmt(Math.round((filteredSummary?.avg || 0) * 1.1))}</div>
                          <div className="text-xs text-[#4a6680]">Anchor (+10%)</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-[#39e87a]">{fmt(filteredSummary?.max || 0)}</div>
                          <div className="text-xs text-[#4a6680]">Stretch Target</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Negotiation Email */}
                  <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-bold text-white">📧 Negotiation Email Generator</div>
                      <button onClick={handleGenerateEmail} disabled={emailLoading}
                        className="text-xs px-3 py-1.5 bg-[#00f0c8]/10 border border-[#00f0c8]/30 text-[#00f0c8] rounded-lg disabled:opacity-40 hover:bg-[#00f0c8]/20 transition-all">
                        {emailLoading ? 'Writing...' : negotiationEmail ? '↺ Regenerate' : '✍ Generate Email'}
                      </button>
                    </div>
                    {emailLoading && <div className="text-sm text-[#4a6680] animate-pulse">Writing your negotiation email...</div>}
                    {negotiationEmail && !emailLoading && (
                      <div className="relative">
                        <div className="bg-[#111620] border border-[#1e2838] rounded-lg p-4 text-sm text-[#c0d0e0] leading-relaxed whitespace-pre-wrap font-mono text-xs">
                          {negotiationEmail}
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(negotiationEmail)}
                          className="absolute top-2 right-2 text-[10px] px-2 py-1 bg-[#1e2838] text-[#4a6680] hover:text-white rounded transition-all">
                          Copy
                        </button>
                      </div>
                    )}
                    {!negotiationEmail && !emailLoading && (
                      <p className="text-xs text-[#4a6680]">Generate a professional salary negotiation email based on current market data for {salaryData.role}.</p>
                    )}
                  </div>
                </div>
              )}

              {/* SAVED */}
              {activeTab === 'saved' && (
                <div>
                  {Object.keys(savedResults).length === 0 ? (
                    <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-10 text-center">
                      <div className="text-4xl mb-3">★</div>
                      <div className="text-white font-bold mb-2">No saved results yet</div>
                      <p className="text-[#4a6680] text-sm">Search for a role and click ☆ Save to bookmark it.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(savedResults).map(([r, d]) => (
                        <div key={r} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4 hover:border-[#263040] transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="text-sm font-bold text-white">{r}</div>
                              <div className="text-xs text-[#4a6680]">{d.location || 'All locations'} · {d.savedAt}</div>
                            </div>
                            <button onClick={() => handleDeleteSaved(r)} className="text-[10px] text-[#4a6680] hover:text-red-400">✕</button>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center mb-3">
                            <div>
                              <div className="text-xs text-[#4d9fff] font-bold">{fmt(d.summary.min)}</div>
                              <div className="text-[10px] text-[#4a6680]">Min</div>
                            </div>
                            <div>
                              <div className="text-xs text-[#00f0c8] font-bold">{fmt(d.summary.avg)}</div>
                              <div className="text-[10px] text-[#4a6680]">Avg</div>
                            </div>
                            <div>
                              <div className="text-xs text-[#39e87a] font-bold">{fmt(d.summary.max)}</div>
                              <div className="text-[10px] text-[#4a6680]">Max</div>
                            </div>
                          </div>
                          <button onClick={() => { setActiveRole(r); setResults(prev => ({ ...prev, [r]: d })); setActiveTab('overview') }}
                            className="w-full text-xs py-1.5 bg-[#111620] border border-[#1e2838] text-[#4a6680] hover:text-white rounded-lg transition-all">
                            View Details →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}