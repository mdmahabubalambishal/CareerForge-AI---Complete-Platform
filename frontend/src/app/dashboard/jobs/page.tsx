'use client'
import { useState, useEffect, useMemo } from 'react'
import { jobsApi } from '@/lib/api'

type Application = {
  id: string
  company: string
  role: string
  status: string
  priority: string
  job_type: string
  work_mode: string
  salary_min?: number
  salary_max?: number
  currency: string
  location?: string
  job_url?: string
  notes?: string
  follow_up_date?: string
  applied_date: string
}

type Tab = 'tracker' | 'salary' | 'market' | 'remote' | 'offer'

const STATUS_COLUMNS = [
  { id: 'applied', label: 'Applied', color: '#4d9fff' },
  { id: 'screening', label: 'Screening', color: '#ffd84d' },
  { id: 'interviewing', label: 'Interviewing', color: '#ff7c4d' },
  { id: 'offer', label: 'Offer 🎉', color: '#39e87a' },
  { id: 'rejected', label: 'Rejected', color: '#ff5c9c' },
  { id: 'withdrawn', label: 'Withdrawn', color: '#4a6680' },
  { id: 'ghosted', label: 'Ghosted 👻', color: '#9b7bff' },
]

const EMPTY_FORM = {
  company: '',
  role: '',
  status: 'applied',
  priority: 'medium',
  job_type: 'full-time',
  work_mode: 'remote',
  location: '',
  salary_min: '',
  salary_max: '',
  currency: 'USD',
  job_url: '',
  follow_up_date: '',
  notes: '',
}

export default function JobsPage() {
  const [tab, setTab] = useState<Tab>('tracker')
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<any>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [salaryRole, setSalaryRole] = useState('')
  const [salaryLocation, setSalaryLocation] = useState('')
  const [salaryData, setSalaryData] = useState<any>(null)
  const [marketRole, setMarketRole] = useState('')
  const [marketData, setMarketData] = useState<any>(null)
  const [remoteRole, setRemoteRole] = useState('')
  const [remoteData, setRemoteData] = useState<any>(null)
  const [offerText, setOfferText] = useState('')
  const [offerRole, setOfferRole] = useState('')
  const [offerCompany, setOfferCompany] = useState('')
  const [offerResult, setOfferResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  // Tracked jobs থেকে unique roles বের করা (most tracked first)
  const trackedRoles = useMemo(() => {
    const roleCounts: Record<string, number> = {}
    applications.forEach(a => {
      if (a.role) roleCounts[a.role] = (roleCounts[a.role] || 0) + 1
    })
    return Object.entries(roleCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([role]) => role)
  }, [applications])

  // Tracked jobs থেকে unique locations
  const trackedLocations = useMemo(() => {
    const locs = new Set<string>()
    applications.forEach(a => { if (a.location) locs.add(a.location) })
    return Array.from(locs)
  }, [applications])

  // Applications load হলে default role সেট
  useEffect(() => {
    if (trackedRoles.length > 0) {
      if (!salaryRole) setSalaryRole(trackedRoles[0])
      if (!marketRole) setMarketRole(trackedRoles[0])
      if (!remoteRole) setRemoteRole(trackedRoles[0])
      if (!offerRole) setOfferRole(trackedRoles[0])
    }
  }, [trackedRoles])

  useEffect(() => {
    fetchApplications()
    fetchStats()
  }, [])

  async function fetchApplications() {
    try {
      const data = await jobsApi.listApplications()
      setApplications(data)
    } catch (e) { console.error(e) }
  }

  async function fetchStats() {
    try {
      const data = await jobsApi.getStats()
      setStats(data)
    } catch (e) { console.error(e) }
  }

  async function handleAddApplication(e: React.FormEvent) {
    e.preventDefault()
    try {
      await jobsApi.createApplication({
        ...form,
        salary_min: form.salary_min ? parseInt(form.salary_min) : undefined,
        salary_max: form.salary_max ? parseInt(form.salary_max) : undefined,
      })
      await fetchApplications()
      await fetchStats()
      setShowAddForm(false)
      setForm(EMPTY_FORM)
    } catch (e: any) { alert('Error: ' + e.message) }
  }

  async function handleStatusChange(id: string, status: string) {
    await jobsApi.updateApplication(id, { status })
    await fetchApplications()
    await fetchStats()
  }

  async function handleDelete(id: string) {
    await jobsApi.deleteApplication(id)
    await fetchApplications()
    await fetchStats()
  }

  async function handleSalarySearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await jobsApi.salaryInsights(salaryRole, salaryLocation)
      setSalaryData(data)
    } catch (e: any) { alert(e.message) }
    finally { setLoading(false) }
  }

  async function handleMarketFetch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await jobsApi.marketTrends(marketRole)
      setMarketData(data)
    } catch (e: any) { alert(e.message) }
    finally { setLoading(false) }
  }

  async function handleRemoteFetch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await jobsApi.remoteBD(remoteRole)
      setRemoteData(data)
    } catch (e: any) { alert(e.message) }
    finally { setLoading(false) }
  }

  async function handleOfferAnalyze(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await jobsApi.analyzeOffer(offerText, offerRole, offerCompany)
      setOfferResult(data)
    } catch (e: any) { alert(e.message) }
    finally { setLoading(false) }
  }

  function setField(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const inputCls = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors'
  const labelCls = 'text-[#7a96b0] text-xs font-medium block mb-1.5'

  const tabs = [
    { id: 'tracker', label: '💼 Job Tracker' },
    { id: 'salary', label: '💰 Salary' },
    { id: 'market', label: '📊 Market Trends' },
    { id: 'remote', label: '🌏 Remote BD' },
    { id: 'offer', label: '📄 Offer Analyzer' },
  ]

  const workModeIcon = (m: string) => m === 'remote' ? '🌏' : m === 'hybrid' ? '🏢' : '📍'
  const priorityIcon = (p: string) => p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'

  // Reusable role selector — tracked jobs থেকে populate হয়, নাহলে free text
  function RoleSelector({ value, onChange, label = 'Role *' }: { value: string; onChange: (v: string) => void; label?: string }) {
    const [customMode, setCustomMode] = useState(false)
    return (
      <div>
        <label className={labelCls}>
          {label}
          {trackedRoles.length > 0 && <span className="text-[#00f0c8] ml-1">· from your tracked jobs</span>}
        </label>
        {trackedRoles.length > 0 && !customMode ? (
          <div className="flex gap-2">
            <select className={inputCls} value={value} onChange={e => {
              if (e.target.value === '__custom__') { setCustomMode(true); onChange('') }
              else onChange(e.target.value)
            }}>
              {trackedRoles.map(r => <option key={r} value={r}>{r}</option>)}
              <option value="__custom__">✏️ Type custom role...</option>
            </select>
          </div>
        ) : (
          <div className="flex gap-2">
            <input className={inputCls} value={value} onChange={e => onChange(e.target.value)} placeholder="e.g. Software Engineer" autoFocus={customMode} />
            {customMode && trackedRoles.length > 0 && (
              <button type="button" onClick={() => { setCustomMode(false); onChange(trackedRoles[0]) }}
                className="text-xs px-3 py-2 bg-[#111620] border border-[#1e2838] text-[#4a6680] hover:text-white rounded-lg whitespace-nowrap">
                ← Back
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Job Hunting Tools</h1>
          <p className="text-[#4a6680] text-sm mt-1">
            {stats ? `${stats.total} applications · ${stats.response_rate}% response rate` : 'Track and manage your job search'}
          </p>
        </div>
        {tab === 'tracker' && (
          <button onClick={() => setShowAddForm(true)} className="bg-[#00f0c8] text-black font-bold px-4 py-2 rounded-lg text-sm hover:bg-white transition-colors">
            + Add Application
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#0c1018] border border-[#1e2838] rounded-xl p-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-[#00f0c8] text-black' : 'text-[#7a96b0] hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── JOB TRACKER ── */}
      {tab === 'tracker' && (
        <>
          {stats && (
            <div className="grid grid-cols-7 gap-2 mb-6">
              {STATUS_COLUMNS.map(col => (
                <div key={col.id} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-3 text-center">
                  <div className="text-xl font-bold mb-1" style={{ color: col.color }}>{stats[col.id] || 0}</div>
                  <div className="text-[10px] text-[#4a6680]">{col.label}</div>
                </div>
              ))}
            </div>
          )}

          {showAddForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, overflowY: 'auto', padding: '16px' }}>
              <div style={{ maxWidth: '640px', margin: '32px auto' }}>
                <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="text-base font-bold text-white">Add Application</div>
                    <button onClick={() => setShowAddForm(false)} className="text-[#4a6680] hover:text-white">✕</button>
                  </div>
                  <form onSubmit={handleAddApplication} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Company *</label>
                        <input className={inputCls} required value={form.company} onChange={e => setField('company', e.target.value)} placeholder="Google, Startup, NGO..." />
                      </div>
                      <div>
                        <label className={labelCls}>Role *</label>
                        <input className={inputCls} required value={form.role} onChange={e => setField('role', e.target.value)} placeholder="Any role..." />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Status</label>
                        <select className={inputCls} value={form.status} onChange={e => setField('status', e.target.value)}>
                          {STATUS_COLUMNS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Priority</label>
                        <select className={inputCls} value={form.priority} onChange={e => setField('priority', e.target.value)}>
                          <option value="high">🔴 High</option>
                          <option value="medium">🟡 Medium</option>
                          <option value="low">🟢 Low</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Job Type</label>
                        <select className={inputCls} value={form.job_type} onChange={e => setField('job_type', e.target.value)}>
                          <option value="full-time">Full-time</option>
                          <option value="part-time">Part-time</option>
                          <option value="contract">Contract</option>
                          <option value="freelance">Freelance</option>
                          <option value="internship">Internship</option>
                          <option value="volunteer">Volunteer</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Work Mode</label>
                        <select className={inputCls} value={form.work_mode} onChange={e => setField('work_mode', e.target.value)}>
                          <option value="remote">🌏 Remote</option>
                          <option value="hybrid">🏢 Hybrid</option>
                          <option value="onsite">📍 Onsite</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Location</label>
                      <input className={inputCls} value={form.location} onChange={e => setField('location', e.target.value)} placeholder="Dhaka / New York / Anywhere" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={labelCls}>Currency</label>
                        <select className={inputCls} value={form.currency} onChange={e => setField('currency', e.target.value)}>
                          <option value="USD">USD $</option>
                          <option value="BDT">BDT ৳</option>
                          <option value="EUR">EUR €</option>
                          <option value="GBP">GBP £</option>
                          <option value="CAD">CAD $</option>
                          <option value="AUD">AUD $</option>
                          <option value="INR">INR ₹</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Min Salary</label>
                        <input className={inputCls} type="number" value={form.salary_min} onChange={e => setField('salary_min', e.target.value)} placeholder="50000" />
                      </div>
                      <div>
                        <label className={labelCls}>Max Salary</label>
                        <input className={inputCls} type="number" value={form.salary_max} onChange={e => setField('salary_max', e.target.value)} placeholder="80000" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Job URL</label>
                        <input className={inputCls} value={form.job_url} onChange={e => setField('job_url', e.target.value)} placeholder="https://..." />
                      </div>
                      <div>
                        <label className={labelCls}>Follow-up Date</label>
                        <input className={inputCls} type="date" value={form.follow_up_date} onChange={e => setField('follow_up_date', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Notes</label>
                      <textarea className={inputCls + ' resize-none'} rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Recruiter name, tips, referral..." />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 bg-[#111620] border border-[#1e2838] text-white py-2.5 rounded-lg text-sm">Cancel</button>
                      <button type="submit" className="flex-1 bg-[#00f0c8] text-black font-bold py-2.5 rounded-lg text-sm">Add Application</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {applications.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">💼</div>
              <div className="text-white font-bold text-lg mb-2">No applications yet</div>
              <p className="text-[#4a6680] text-sm mb-6">Track any job — developer, designer, manager, teacher, anything</p>
              <button onClick={() => setShowAddForm(true)} className="bg-[#00f0c8] text-black font-bold px-6 py-3 rounded-lg">+ Add First Application</button>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {STATUS_COLUMNS.map(col => (
                <div key={col.id}>
                  <div className="flex items-center gap-1.5 mb-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.color }} />
                    <span className="text-[10px] font-bold text-[#7a96b0] uppercase tracking-wide truncate">{col.label}</span>
                    <span className="ml-auto text-[10px] text-[#4a6680] bg-[#0c1018] border border-[#1e2838] px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {applications.filter(a => a.status === col.id).length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {applications.filter(a => a.status === col.id).map(app => (
                      <div key={app.id} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-3 hover:border-[#263040] transition-all">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[10px] text-[#4a6680] truncate flex-1">{app.company}</div>
                          <span className="text-[10px] flex-shrink-0 ml-1">{priorityIcon(app.priority || 'medium')}</span>
                        </div>
                        <div className="text-xs font-bold text-white mb-1 leading-tight">{app.role}</div>
                        <div className="text-[10px] text-[#4a6680] mb-1">
                          {workModeIcon(app.work_mode || 'remote')} {app.work_mode || 'remote'}
                          {app.location ? ` · ${app.location}` : ''}
                        </div>
                        <div className="text-[10px] text-[#4a6680] mb-1">{app.job_type || 'full-time'}</div>
                        {app.salary_min && (
                          <div className="text-[10px] text-[#39e87a] mb-1 font-bold">
                            {app.currency} {app.salary_min.toLocaleString()}{app.salary_max ? `–${app.salary_max.toLocaleString()}` : '+'}
                          </div>
                        )}
                        {app.follow_up_date && (
                          <div className="text-[10px] text-[#ffd84d] mb-1">📅 {new Date(app.follow_up_date).toLocaleDateString()}</div>
                        )}
                        <div className="flex gap-1 flex-wrap mt-2">
                          {STATUS_COLUMNS.filter(s => s.id !== app.status).slice(0, 1).map(s => (
                            <button key={s.id} onClick={() => handleStatusChange(app.id, s.id)}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-[#111620] border border-[#1e2838] text-[#4a6680] hover:text-white truncate max-w-full">
                              → {s.label}
                            </button>
                          ))}
                          <div className="flex gap-1 ml-auto">
                            {app.job_url && (
                              <a href={app.job_url} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] px-1.5 py-0.5 rounded bg-[#111620] border border-[#1e2838] text-[#00f0c8]">🔗</a>
                            )}
                            <button onClick={() => handleDelete(app.id)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[#111620] border border-[#1e2838] text-[#4a6680] hover:text-red-400">✕</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── SALARY INSIGHTS ── */}
      {tab === 'salary' && (
        <div className="max-w-3xl">
          <form onSubmit={handleSalarySearch} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5 mb-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <RoleSelector value={salaryRole} onChange={setSalaryRole} />
              </div>
              <div>
                <label className={labelCls}>
                  Location
                  {trackedLocations.length > 0 && <span className="text-[#00f0c8] ml-1">· from your jobs</span>}
                </label>
                {trackedLocations.length > 0 ? (
                  <select className={inputCls} value={salaryLocation} onChange={e => setSalaryLocation(e.target.value === '__none__' ? '' : e.target.value)}>
                    <option value="__none__">Any location</option>
                    {trackedLocations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                ) : (
                  <input className={inputCls} value={salaryLocation} onChange={e => setSalaryLocation(e.target.value)} placeholder="USA / Bangladesh" />
                )}
              </div>
            </div>
            <button type="submit" disabled={loading || !salaryRole}
              className="w-full mt-3 bg-[#00f0c8] text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-40">
              {loading ? 'Searching...' : '💰 Get Salary Insights'}
            </button>
          </form>
          {salaryData && (
            <div>
              {salaryData.summary && (
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-[#4d9fff]">${salaryData.summary.min?.toLocaleString()}</div>
                    <div className="text-xs text-[#4a6680] mt-1">Minimum</div>
                  </div>
                  <div className="bg-[#0c1018] border border-[#00f0c8]/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-[#00f0c8]">${salaryData.summary.avg?.toLocaleString()}</div>
                    <div className="text-xs text-[#4a6680] mt-1">Average</div>
                  </div>
                  <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-[#39e87a]">${salaryData.summary.max?.toLocaleString()}</div>
                    <div className="text-xs text-[#4a6680] mt-1">Maximum</div>
                  </div>
                </div>
              )}
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[#1e2838] text-sm font-bold text-white">Company Breakdown</div>
                {salaryData.data.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 p-4 border-b border-[#1e2838] last:border-0">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{d.company}</div>
                      <div className="text-xs text-[#4a6680]">{d.location} · {d.experience_level}</div>
                    </div>
                    <div className="text-sm font-bold text-[#39e87a]">${d.avg_salary?.toLocaleString()}</div>
                    <div className="text-xs text-[#4a6680]">{d.source}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MARKET TRENDS ── */}
      {tab === 'market' && (
        <div>
          <form onSubmit={handleMarketFetch} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4 mb-5 flex gap-3 items-end">
            <div className="flex-1">
              <RoleSelector value={marketRole} onChange={setMarketRole} label="Analyze market for role" />
            </div>
            <button type="submit" disabled={loading || !marketRole}
              className="bg-[#00f0c8] text-black font-bold px-5 py-2.5 rounded-lg text-sm disabled:opacity-40 whitespace-nowrap">
              {loading ? 'Loading...' : '📊 Get Trends'}
            </button>
          </form>
          {marketData ? (
            <div className="grid grid-cols-2 gap-5">
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                <div className="text-sm font-bold text-white mb-4">🔥 Top Roles in Demand</div>
                {marketData.top_roles.map((r: any, i: number) => (
                  <div key={i} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white">{r.role}</span>
                      <div className="flex gap-2">
                        <span className="text-[#39e87a] text-xs font-bold">{r.growth}</span>
                        <span className="text-[#4a6680] text-xs">{r.demand}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#1e2838] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#00f0c8] to-[#4d9fff]" style={{ width: `${r.demand}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                <div className="text-sm font-bold text-white mb-4">⚡ Top Skills</div>
                {marketData.top_skills.map((s: any, i: number) => (
                  <div key={i} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white">{s.skill}</span>
                      <span className="text-[#4a6680] text-xs">{s.demand}%</span>
                    </div>
                    <div className="h-2 bg-[#1e2838] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#9b7bff]" style={{ width: `${s.demand}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5 col-span-2">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-[#00f0c8]">{marketData.remote_percentage}%</div>
                    <div className="text-xs text-[#4a6680] mt-1">Jobs are Remote</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-[#9b7bff]">{marketData.bd_remote_jobs}</div>
                    <div className="text-xs text-[#4a6680] mt-1">Remote Jobs for BD</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-[#39e87a]">{marketData.avg_salary_increase}</div>
                    <div className="text-xs text-[#4a6680] mt-1">Avg Salary Increase YoY</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📊</div>
              <p className="text-[#4a6680] text-sm">
                {trackedRoles.length > 0 ? 'Select a role above and click Get Trends' : 'Add some job applications first — roles will auto-populate here'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── REMOTE BD ── */}
      {tab === 'remote' && (
        <div>
          <form onSubmit={handleRemoteFetch} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4 mb-5 flex gap-3 items-end">
            <div className="flex-1">
              <RoleSelector value={remoteRole} onChange={setRemoteRole} label="Find remote jobs for role" />
            </div>
            <button type="submit" disabled={loading || !remoteRole}
              className="bg-[#00f0c8] text-black font-bold px-5 py-2.5 rounded-lg text-sm disabled:opacity-40 whitespace-nowrap">
              {loading ? 'Loading...' : '🌏 Find Remote Jobs'}
            </button>
          </form>
          {remoteData ? (
            <>
              <div className="grid grid-cols-3 gap-4 mb-5">
                {remoteData.jobs.map((job: any, i: number) => (
                  <div key={i} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4 hover:border-[#263040] transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-xs text-[#4a6680]">{job.company}</div>
                        <div className="text-sm font-bold text-white mt-0.5">{job.role}</div>
                      </div>
                      <span className="text-xs bg-[#111620] border border-[#1e2838] text-[#4a6680] px-2 py-0.5 rounded">{job.type}</span>
                    </div>
                    <div className="text-sm font-bold text-[#39e87a] mb-2">{job.salary}</div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {job.skills.map((s: string) => (
                        <span key={s} className="text-[10px] bg-[#111620] border border-[#1e2838] text-[#7a96b0] px-2 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#00f0c8] hover:underline">Apply →</a>
                  </div>
                ))}
              </div>
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                <div className="text-sm font-bold text-white mb-3">💡 Tips for BD Remote Workers</div>
                <div className="grid grid-cols-2 gap-2">
                  {remoteData.tips.map((tip: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-[#7a96b0]">
                      <span className="text-[#00f0c8] flex-shrink-0">✦</span>{tip}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🌏</div>
              <p className="text-[#4a6680] text-sm">
                {trackedRoles.length > 0 ? 'Select a role above and click Find Remote Jobs' : 'Add some job applications first — roles will auto-populate here'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── OFFER ANALYZER ── */}
      {tab === 'offer' && (
        <div className="max-w-4xl">
          <form onSubmit={handleOfferAnalyze} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5 mb-5">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <RoleSelector value={offerRole} onChange={setOfferRole} />
              <div>
                <label className={labelCls}>Company *</label>
                <input className={inputCls} value={offerCompany} onChange={e => setOfferCompany(e.target.value)} placeholder="Company name" required />
              </div>
            </div>
            <div>
              <label className={labelCls}>Offer Letter Text *</label>
              <textarea className={inputCls + ' resize-none'} rows={6} value={offerText} onChange={e => setOfferText(e.target.value)} placeholder="Paste your offer letter here..." required />
            </div>
            <button type="submit" disabled={loading || !offerRole}
              className="w-full mt-3 bg-[#9b7bff] text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-40">
              {loading ? 'Analyzing...' : '📄 Analyze Offer Letter'}
            </button>
          </form>
          {offerResult && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                <div className="text-sm font-bold text-white mb-4">Analysis Result</div>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold mb-1" style={{ color: offerResult.score >= 70 ? '#39e87a' : offerResult.score >= 50 ? '#ffd84d' : '#ff5c9c' }}>
                    {offerResult.score}/100
                  </div>
                  <div className={`text-sm font-bold ${offerResult.recommendation === 'accept' ? 'text-[#39e87a]' : offerResult.recommendation === 'negotiate' ? 'text-[#ffd84d]' : 'text-[#ff5c9c]'}`}>
                    {offerResult.recommendation?.toUpperCase()}
                  </div>
                </div>
                <div className="text-xs text-[#7a96b0] leading-relaxed">{offerResult.summary}</div>
                <div className="mt-3 pt-3 border-t border-[#1e2838]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4a6680]">Base Salary</span>
                    <span className="text-white font-bold">${offerResult.base_salary?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-[#4a6680]">Market</span>
                    <span className="font-bold" style={{ color: offerResult.market_comparison === 'above' ? '#39e87a' : offerResult.market_comparison === 'at' ? '#ffd84d' : '#ff5c9c' }}>
                      {offerResult.market_comparison} market
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {offerResult.green_flags?.length > 0 && (
                  <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                    <div className="text-xs font-bold text-[#39e87a] uppercase tracking-wide mb-2">✅ Green Flags</div>
                    {offerResult.green_flags.map((f: string, i: number) => <div key={i} className="text-xs text-[#7a96b0] mb-1">• {f}</div>)}
                  </div>
                )}
                {offerResult.red_flags?.length > 0 && (
                  <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                    <div className="text-xs font-bold text-[#ff5c9c] uppercase tracking-wide mb-2">🚩 Red Flags</div>
                    {offerResult.red_flags.map((f: string, i: number) => <div key={i} className="text-xs text-[#7a96b0] mb-1">• {f}</div>)}
                  </div>
                )}
                {offerResult.negotiation_points?.length > 0 && (
                  <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                    <div className="text-xs font-bold text-[#ffd84d] uppercase tracking-wide mb-2">💡 Negotiate</div>
                    {offerResult.negotiation_points.map((f: string, i: number) => <div key={i} className="text-xs text-[#7a96b0] mb-1">• {f}</div>)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
