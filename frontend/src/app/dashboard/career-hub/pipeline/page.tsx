'use client'
import { useState, useEffect } from 'react'
import { jobsApi } from '@/lib/api'

interface Job {
  id: string
  company: string
  role: string
  status: string
  applied_date?: string
  salary_min?: number
  salary_max?: number
  currency?: string
  location?: string
  notes?: string
  job_url?: string
  priority?: string
}

const COLUMNS = [
  { id: 'applied', label: 'Applied', color: '#4d9fff', emoji: '📤' },
  { id: 'screening', label: 'Screening', color: '#ffd84d', emoji: '👀' },
  { id: 'interviewing', label: 'Interview', color: '#ff7c4d', emoji: '🎤' },
  { id: 'offer', label: 'Offer', color: '#39e87a', emoji: '🎉' },
  { id: 'rejected', label: 'Rejected', color: '#ff5c9c', emoji: '❌' },
]

export default function PipelinePage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [fetching, setFetching] = useState(true)
  const [draggedJob, setDraggedJob] = useState<Job | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [newJob, setNewJob] = useState({ company: '', role: '', salary_min: '', salary_max: '', currency: 'USD', location: '', notes: '', job_url: '' })
  const [saving, setSaving] = useState(false)

  const inputCls = 'w-full bg-[#0c1018] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors'

  useEffect(() => { loadJobs() }, [])

  async function loadJobs() {
    setFetching(true)
    try {
      const data = await jobsApi.listApplications()
      setJobs(data)
    } catch (e) { console.error(e) }
    finally { setFetching(false) }
  }

  function getJobsByStatus(status: string) {
    return jobs.filter(j => j.status === status)
  }

  function handleDragStart(job: Job) {
    setDraggedJob(job)
  }

  function handleDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault()
    setDragOverCol(colId)
  }

  async function handleDrop(e: React.DragEvent, colId: string) {
    e.preventDefault()
    if (!draggedJob || draggedJob.status === colId) {
      setDraggedJob(null)
      setDragOverCol(null)
      return
    }
    // Optimistic update
    setJobs(prev => prev.map(j => j.id === draggedJob.id ? { ...j, status: colId } : j))
    setDraggedJob(null)
    setDragOverCol(null)
    // Sync to API
    try {
      await jobsApi.updateApplication(draggedJob.id, { status: colId })
    } catch (e) {
      console.error(e)
      // Revert on failure
      setJobs(prev => prev.map(j => j.id === draggedJob.id ? { ...j, status: draggedJob.status } : j))
    }
  }

  function handleDragEnd() {
    setDraggedJob(null)
    setDragOverCol(null)
  }

  async function addJob() {
    if (!newJob.company || !newJob.role) return
    setSaving(true)
    try {
      const created = await jobsApi.createApplication({
        company: newJob.company,
        role: newJob.role,
        status: 'applied',
        salary_min: newJob.salary_min ? parseInt(newJob.salary_min) : undefined,
        salary_max: newJob.salary_max ? parseInt(newJob.salary_max) : undefined,
        currency: newJob.currency || 'USD',
        location: newJob.location || undefined,
        notes: newJob.notes || undefined,
        job_url: newJob.job_url || undefined,
      })
      setJobs(prev => [...prev, created])
      setNewJob({ company: '', role: '', salary_min: '', salary_max: '', currency: 'USD', location: '', notes: '', job_url: '' })
      setShowAddModal(false)
    } catch (e: any) {
      alert('Failed to add: ' + e?.message)
    } finally { setSaving(false) }
  }

  async function deleteJob(id: string) {
    try {
      await jobsApi.deleteApplication(id)
      setJobs(prev => prev.filter(j => j.id !== id))
      setSelectedJob(null)
    } catch (e: any) { alert('Failed to delete: ' + e?.message) }
  }

  const totalJobs = jobs.length
  const offerCount = jobs.filter(j => j.status === 'offer').length
  const interviewCount = jobs.filter(j => j.status === 'interviewing').length
  const responseRate = totalJobs > 0 ? Math.round(((totalJobs - jobs.filter(j => j.status === 'applied').length) / totalJobs) * 100) : 0

  function formatSalary(job: Job) {
    if (!job.salary_min && !job.salary_max) return null
    const cur = job.currency || 'USD'
    if (job.salary_min && job.salary_max) return `${job.salary_min.toLocaleString()}–${job.salary_max.toLocaleString()} ${cur}`
    return `${(job.salary_min || job.salary_max)!.toLocaleString()} ${cur}`
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">📋</span>
            <h1 className="text-2xl font-bold text-white">Pipeline Board</h1>
          </div>
          <p className="text-[#4a6680] text-sm ml-12">Drag & drop to track your application journey</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#00f0c8] text-black font-bold px-4 py-2 rounded-lg text-sm hover:brightness-110 transition-all"
        >
          + Add Application
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: totalJobs, color: '#4d9fff' },
          { label: 'Interviewing', value: interviewCount, color: '#ff7c4d' },
          { label: 'Offers', value: offerCount, color: '#39e87a' },
          { label: 'Response Rate', value: `${responseRate}%`, color: '#9b7bff' },
        ].map((s, i) => (
          <div key={i} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: s.color }} />
            <div className="text-xs text-[#4a6680] uppercase tracking-wide mb-1">{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Loading */}
      {fetching && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 animate-pulse">📋</div>
          <div className="text-white font-bold">Loading applications...</div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-5 gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colJobs = getJobsByStatus(col.id)
          const isDragOver = dragOverCol === col.id
          return (
            <div
              key={col.id}
              onDragOver={e => handleDragOver(e, col.id)}
              onDrop={e => handleDrop(e, col.id)}
              className={`rounded-2xl border transition-all min-h-[500px] flex flex-col ${
                isDragOver
                  ? 'border-[#00f0c8] bg-[#00f0c808]'
                  : 'border-[#1e2838] bg-[#0c1018]'
              }`}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-[#1e2838] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{col.emoji}</span>
                  <span className="text-sm font-bold text-white">{col.label}</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${col.color}22`, color: col.color }}>
                  {colJobs.length}
                </span>
              </div>

              {/* Color bar */}
              <div className="h-0.5 w-full" style={{ background: col.color }} />

              {/* Cards */}
              <div className="p-2 flex-1 space-y-2">
                {colJobs.map(job => (
                  <div
                    key={job.id}
                    draggable
                    onDragStart={() => handleDragStart(job)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedJob(job)}
                    className={`bg-[#111620] border border-[#1e2838] rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-[#263040] transition-all group ${
                      draggedJob?.id === job.id ? 'opacity-40 scale-95' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-sm font-bold text-white truncate flex-1">{job.company}</div>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ml-2" style={{ background: col.color }} />
                    </div>
                    <div className="text-xs text-[#4a6680] truncate mb-2">{job.role}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {formatSalary(job) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e2838] text-[#7a96b0]">
                          💰 {formatSalary(job)}
                        </span>
                      )}
                      {job.location && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e2838] text-[#7a96b0]">
                          📍 {job.location}
                        </span>
                      )}
                    </div>
                    {job.applied_date && (
                      <div className="text-[10px] text-[#4a6680] mt-2">
                        {new Date(job.applied_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}

                {/* Drop zone hint */}
                {isDragOver && draggedJob && (
                  <div className="border-2 border-dashed border-[#00f0c8] rounded-xl p-4 text-center text-xs text-[#00f0c8]">
                    Drop here
                  </div>
                )}

                {colJobs.length === 0 && !isDragOver && (
                  <div className="text-center py-8 text-[10px] text-[#4a6680]">
                    Drop cards here
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Job Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-white">+ Add Application</div>
              <button onClick={() => setShowAddModal(false)} className="text-[#4a6680] hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#7a96b0] block mb-1.5">Company *</label>
                <input className={inputCls} placeholder="e.g. Google" value={newJob.company} onChange={e => setNewJob(p => ({ ...p, company: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[#7a96b0] block mb-1.5">Role *</label>
                <input className={inputCls} placeholder="e.g. Frontend Developer" value={newJob.role} onChange={e => setNewJob(p => ({ ...p, role: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">Min Salary</label>
                  <input type="number" className={inputCls} placeholder="60000" value={newJob.salary_min} onChange={e => setNewJob(p => ({ ...p, salary_min: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">Max Salary</label>
                  <input type="number" className={inputCls} placeholder="90000" value={newJob.salary_max} onChange={e => setNewJob(p => ({ ...p, salary_max: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">Currency</label>
                  <select className={inputCls} value={newJob.currency} onChange={e => setNewJob(p => ({ ...p, currency: e.target.value }))}>
                    <option value="USD">USD</option>
                    <option value="BDT">BDT</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">Location</label>
                  <input className={inputCls} placeholder="e.g. Remote" value={newJob.location} onChange={e => setNewJob(p => ({ ...p, location: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">Job URL</label>
                  <input className={inputCls} placeholder="https://..." value={newJob.job_url} onChange={e => setNewJob(p => ({ ...p, job_url: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#7a96b0] block mb-1.5">Notes</label>
                <textarea className={inputCls} rows={2} placeholder="Any notes..." value={newJob.notes} onChange={e => setNewJob(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowAddModal(false)} className="flex-1 bg-[#111620] border border-[#1e2838] text-white py-2.5 rounded-lg text-sm">Cancel</button>
                <button onClick={addJob} disabled={saving} className="flex-1 bg-[#00f0c8] text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-40">
                  {saving ? 'Saving...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setSelectedJob(null)}>
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-base font-bold text-white">{selectedJob.company}</div>
                <div className="text-xs text-[#4a6680]">{selectedJob.role}</div>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-[#4a6680] hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Status', value: selectedJob.status },
                { label: 'Applied', value: selectedJob.applied_date ? new Date(selectedJob.applied_date).toLocaleDateString() : '—' },
                { label: 'Salary', value: formatSalary(selectedJob) || '—' },
                { label: 'Location', value: selectedJob.location || '—' },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-[#1e2838]">
                  <span className="text-xs text-[#4a6680]">{row.label}</span>
                  <span className="text-xs font-bold text-white capitalize">{row.value}</span>
                </div>
              ))}
              {selectedJob.notes && (
                <div className="bg-[#111620] rounded-xl p-3">
                  <div className="text-xs text-[#4a6680] mb-1">Notes</div>
                  <div className="text-sm text-[#7a96b0]">{selectedJob.notes}</div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => deleteJob(selectedJob.id)}
                className="flex-1 bg-[#ff5c9c22] border border-[#ff5c9c44] text-[#ff5c9c] py-2 rounded-lg text-sm hover:bg-[#ff5c9c33]"
              >
                🗑 Delete
              </button>
              <button
                onClick={() => setSelectedJob(null)}
                className="flex-1 bg-[#111620] border border-[#1e2838] text-white py-2 rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}