'use client'
import { useState, useEffect } from 'react'

interface Template {
  id: string
  title: string
  type: 'cover_letter' | 'follow_up' | 'cold_email' | 'thank_you' | 'custom'
  content: string
  tags: string[]
  created_at: string
  used_count: number
}

const TYPE_LABELS: Record<string, string> = {
  cover_letter: 'Cover Letter',
  follow_up: 'Follow-up',
  cold_email: 'Cold Email',
  thank_you: 'Thank You',
  custom: 'Custom',
}

const TYPE_COLORS: Record<string, string> = {
  cover_letter: '#00f0c8',
  follow_up: '#9b7bff',
  cold_email: '#4d9fff',
  thank_you: '#39e87a',
  custom: '#ffd84d',
}

const STARTER_TEMPLATES: Template[] = [
  {
    id: 'starter-1',
    title: 'Standard Cover Letter',
    type: 'cover_letter',
    content: `Dear Hiring Manager,

I am writing to express my strong interest in the [Position] role at [Company]. With [X years] of experience in [field], I am confident that my skills and background make me an excellent candidate for this position.

In my previous role at [Previous Company], I [key achievement with metrics]. I also [another achievement], which directly aligns with [Company]'s mission to [company goal].

I am particularly excited about this opportunity because [specific reason about company/role]. I believe my expertise in [skill 1], [skill 2], and [skill 3] would allow me to make an immediate and meaningful contribution to your team.

I would welcome the opportunity to discuss how my background, skills, and enthusiasm can benefit [Company]. Thank you for your time and consideration.

Best regards,
[Your Name]`,
    tags: ['general', 'formal'],
    created_at: new Date().toISOString(),
    used_count: 0,
  },
  {
    id: 'starter-2',
    title: 'Follow-up After Application',
    type: 'follow_up',
    content: `Subject: Following Up on [Position] Application

Dear [Hiring Manager's Name],

I hope this message finds you well. I recently applied for the [Position] role at [Company] on [Date] and wanted to follow up to reiterate my strong interest in the position.

I am very enthusiastic about the opportunity to join [Company] and contribute to [specific team/project]. Since submitting my application, I have [any relevant update, e.g., completed a project, earned a certification].

I would love to learn more about the position and discuss how my skills align with your team's needs. Please let me know if you need any additional information from my end.

Thank you for your time and consideration.

Best regards,
[Your Name]
[Phone Number]
[LinkedIn Profile]`,
    tags: ['follow-up', 'email'],
    created_at: new Date().toISOString(),
    used_count: 0,
  },
  {
    id: 'starter-3',
    title: 'Thank You After Interview',
    type: 'thank_you',
    content: `Subject: Thank You - [Position] Interview

Dear [Interviewer's Name],

Thank you so much for taking the time to interview me for the [Position] role at [Company] today. I really enjoyed our conversation about [specific topic discussed] and learning more about the team's work on [project/initiative].

After our discussion, I am even more excited about the possibility of joining [Company]. The [specific aspect of role/company] particularly resonates with my career goals and experience in [relevant skill/area].

I wanted to reiterate my enthusiasm for the role and my confidence that my background in [skill] would allow me to contribute meaningfully to your team from day one.

Please don't hesitate to reach out if you need any additional information. I look forward to hearing about the next steps.

Thank you again for this wonderful opportunity.

Warm regards,
[Your Name]`,
    tags: ['interview', 'thank-you'],
    created_at: new Date().toISOString(),
    used_count: 0,
  },
]

function ls<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>(() => {
    const saved = ls<Template[]>('career_templates', [])
    if (saved.length === 0) return STARTER_TEMPLATES
    return saved
  })
  const [selected, setSelected] = useState<Template | null>(null)
  const [editing, setEditing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiPrompt, setAiPrompt] = useState({ type: 'cover_letter', role: '', company: '', tone: 'professional' })

  const [editForm, setEditForm] = useState({ title: '', type: 'cover_letter' as Template['type'], content: '', tags: '' })
  const [newForm, setNewForm] = useState({ title: '', type: 'cover_letter' as Template['type'], content: '', tags: '' })

  useEffect(() => {
    localStorage.setItem('career_templates', JSON.stringify(templates))
  }, [templates])

  useEffect(() => {
    if (selected) {
      setEditForm({ title: selected.title, type: selected.type, content: selected.content, tags: selected.tags.join(', ') })
    }
  }, [selected])

  const filtered = templates.filter(t => {
    const matchFilter = filter === 'all' || t.type === filter
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
    return matchFilter && matchSearch
  })

  function saveEdit() {
    if (!selected) return
    setTemplates(prev => prev.map(t => t.id === selected.id ? {
      ...t,
      title: editForm.title,
      type: editForm.type,
      content: editForm.content,
      tags: editForm.tags.split(',').map(s => s.trim()).filter(Boolean),
    } : t))
    setSelected(prev => prev ? { ...prev, title: editForm.title, type: editForm.type, content: editForm.content, tags: editForm.tags.split(',').map(s => s.trim()).filter(Boolean) } : null)
    setEditing(false)
  }

  function createTemplate() {
    if (!newForm.title || !newForm.content) return
    const t: Template = {
      id: Date.now().toString(),
      title: newForm.title,
      type: newForm.type,
      content: newForm.content,
      tags: newForm.tags.split(',').map(s => s.trim()).filter(Boolean),
      created_at: new Date().toISOString(),
      used_count: 0,
    }
    setTemplates(prev => [...prev, t])
    setSelected(t)
    setNewForm({ title: '', type: 'cover_letter', content: '', tags: '' })
    setShowCreate(false)
  }

  function deleteTemplate(id: string) {
    setTemplates(prev => prev.filter(t => t.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  function copyTemplate(t: Template) {
    navigator.clipboard.writeText(t.content)
    setTemplates(prev => prev.map(tp => tp.id === t.id ? { ...tp, used_count: tp.used_count + 1 } : tp))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function duplicateTemplate(t: Template) {
    const dup: Template = { ...t, id: Date.now().toString(), title: t.title + ' (Copy)', used_count: 0, created_at: new Date().toISOString() }
    setTemplates(prev => [...prev, dup])
    setSelected(dup)
  }

  async function generateWithAI() {
    if (!aiPrompt.role) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiPrompt),
      })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      const t: Template = {
        id: Date.now().toString(),
        title: `${TYPE_LABELS[aiPrompt.type]} — ${aiPrompt.role}${aiPrompt.company ? ' @ ' + aiPrompt.company : ''}`,
        type: aiPrompt.type as Template['type'],
        content: data.content,
        tags: [aiPrompt.role, aiPrompt.company, aiPrompt.tone].filter(Boolean),
        created_at: new Date().toISOString(),
        used_count: 0,
      }
      setTemplates(prev => [...prev, t])
      setSelected(t)
      setShowAiModal(false)
      setAiPrompt({ type: 'cover_letter', role: '', company: '', tone: 'professional' })
    } catch (e: any) {
      alert('AI error: ' + e?.message)
    } finally {
      setAiLoading(false)
    }
  }

  const inputCls = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors'
  const selectCls = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#00f0c8] transition-colors'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">📝</span>
            <h1 className="text-2xl font-bold text-white">Templates</h1>
          </div>
          <p className="text-[#4a6680] text-sm ml-12">Save and reuse cover letters, emails, and more</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAiModal(true)}
            className="bg-[#9b7bff] text-white font-bold px-4 py-2 rounded-lg text-sm hover:brightness-110 transition-all">
            🤖 AI Generate
          </button>
          <button onClick={() => setShowCreate(true)}
            className="bg-[#00f0c8] text-black font-bold px-4 py-2 rounded-lg text-sm hover:brightness-110 transition-all">
            + New Template
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* LEFT — Template List */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6680] text-sm">🔍</span>
            <input className="w-full bg-[#0c1018] border border-[#1e2838] rounded-lg pl-8 pr-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8]"
              placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Filter */}
          <div className="flex flex-wrap gap-1.5">
            {['all', 'cover_letter', 'follow_up', 'cold_email', 'thank_you', 'custom'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                  filter === f ? 'text-black border-transparent' : 'bg-[#0c1018] border-[#1e2838] text-[#7a96b0] hover:border-[#263040]'
                }`}
                style={filter === f ? { background: f === 'all' ? '#00f0c8' : TYPE_COLORS[f], borderColor: 'transparent' } : {}}>
                {f === 'all' ? 'All' : TYPE_LABELS[f]}
              </button>
            ))}
          </div>

          <div className="text-xs text-[#4a6680]">{filtered.length} templates</div>

          {/* Template Cards */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filtered.map(t => (
              <div key={t.id} onClick={() => { setSelected(t); setEditing(false) }}
                className={`p-3 rounded-xl border cursor-pointer transition-all group ${
                  selected?.id === t.id
                    ? 'border-[#00f0c8] bg-[#00f0c808]'
                    : 'border-[#1e2838] bg-[#0c1018] hover:border-[#263040]'
                }`}>
                <div className="flex items-start justify-between mb-1">
                  <div className="text-sm font-bold text-white truncate flex-1">{t.title}</div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: `${TYPE_COLORS[t.type]}22`, color: TYPE_COLORS[t.type] }}>
                    {TYPE_LABELS[t.type]}
                  </span>
                  {t.used_count > 0 && (
                    <span className="text-[10px] text-[#4a6680]">Used {t.used_count}x</span>
                  )}
                </div>
                <div className="text-[10px] text-[#4a6680] line-clamp-2">{t.content.slice(0, 80)}...</div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-8 text-[#4a6680] text-sm">No templates found</div>
            )}
          </div>
        </div>

        {/* RIGHT — Template Detail / Editor */}
        <div className="col-span-2">
          {/* Create New Form */}
          {showCreate && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-white">Create New Template</div>
                <button onClick={() => setShowCreate(false)} className="text-[#4a6680] hover:text-white">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">Title *</label>
                  <input className={inputCls} placeholder="Template name" value={newForm.title} onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">Type</label>
                  <select className={selectCls} value={newForm.type} onChange={e => setNewForm(p => ({ ...p, type: e.target.value as Template['type'] }))}>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#7a96b0] block mb-1.5">Content *</label>
                <textarea className={inputCls} rows={10} placeholder="Write your template here..." value={newForm.content} onChange={e => setNewForm(p => ({ ...p, content: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[#7a96b0] block mb-1.5">Tags (comma separated)</label>
                <input className={inputCls} placeholder="e.g. tech, startup, formal" value={newForm.tags} onChange={e => setNewForm(p => ({ ...p, tags: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowCreate(false)} className="flex-1 bg-[#111620] border border-[#1e2838] text-white py-2.5 rounded-lg text-sm">Cancel</button>
                <button onClick={createTemplate} className="flex-1 bg-[#00f0c8] text-black font-bold py-2.5 rounded-lg text-sm">Create</button>
              </div>
            </div>
          )}

          {/* Selected Template */}
          {selected && !showCreate && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  {editing ? (
                    <input className="bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-1.5 text-white text-base font-bold focus:outline-none focus:border-[#00f0c8] w-72"
                      value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                  ) : (
                    <h2 className="text-base font-bold text-white">{selected.title}</h2>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {editing ? (
                      <select className="bg-[#111620] border border-[#1e2838] rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                        value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value as Template['type'] }))}>
                        {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: `${TYPE_COLORS[selected.type]}22`, color: TYPE_COLORS[selected.type] }}>
                        {TYPE_LABELS[selected.type]}
                      </span>
                    )}
                    <span className="text-xs text-[#4a6680]">Used {selected.used_count}x</span>
                    <span className="text-xs text-[#4a6680]">{new Date(selected.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 rounded-lg bg-[#111620] border border-[#1e2838] text-white hover:border-[#263040]">Cancel</button>
                      <button onClick={saveEdit} className="text-xs px-3 py-1.5 rounded-lg bg-[#00f0c8] text-black font-bold">Save</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => copyTemplate(selected)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${copied ? 'bg-[#39e87a] text-black' : 'bg-[#111620] border border-[#1e2838] text-white hover:border-[#263040]'}`}>
                        {copied ? '✓ Copied!' : '📋 Copy'}
                      </button>
                      <button onClick={() => setEditing(true)} className="text-xs px-3 py-1.5 rounded-lg bg-[#111620] border border-[#1e2838] text-white hover:border-[#263040]">✏️ Edit</button>
                      <button onClick={() => duplicateTemplate(selected)} className="text-xs px-3 py-1.5 rounded-lg bg-[#111620] border border-[#1e2838] text-white hover:border-[#263040]">⧉ Dup</button>
                      <button onClick={() => deleteTemplate(selected.id)} className="text-xs px-3 py-1.5 rounded-lg bg-[#ff5c9c22] border border-[#ff5c9c44] text-[#ff5c9c] hover:bg-[#ff5c9c33]">🗑</button>
                    </>
                  )}
                </div>
              </div>

              {/* Tags */}
              {editing ? (
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">Tags (comma separated)</label>
                  <input className={inputCls} value={editForm.tags} onChange={e => setEditForm(p => ({ ...p, tags: e.target.value }))} placeholder="e.g. tech, startup" />
                </div>
              ) : (
                selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e2838] text-[#7a96b0]">#{tag}</span>
                    ))}
                  </div>
                )
              )}

              {/* Content */}
              {editing ? (
                <textarea className={inputCls} rows={18}
                  value={editForm.content}
                  onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))} />
              ) : (
                <div className="bg-[#111620] border border-[#1e2838] rounded-xl p-4 max-h-[480px] overflow-y-auto">
                  <pre className="text-sm text-[#c0d0e0] whitespace-pre-wrap leading-relaxed font-sans">{selected.content}</pre>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!selected && !showCreate && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-16 text-center">
              <div className="text-5xl mb-4">📝</div>
              <div className="text-white font-bold text-lg mb-2">Select a template</div>
              <p className="text-[#4a6680] text-sm mb-6">Choose from the list or create a new one</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowAiModal(true)} className="bg-[#9b7bff] text-white font-bold px-5 py-2.5 rounded-lg text-sm">🤖 AI Generate</button>
                <button onClick={() => setShowCreate(true)} className="bg-[#00f0c8] text-black font-bold px-5 py-2.5 rounded-lg text-sm">+ Create New</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Generate Modal */}
      {showAiModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-white">🤖 AI Generate Template</div>
              <button onClick={() => setShowAiModal(false)} className="text-[#4a6680] hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#7a96b0] block mb-1.5">Template Type</label>
                <select className={selectCls} value={aiPrompt.type} onChange={e => setAiPrompt(p => ({ ...p, type: e.target.value }))}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#7a96b0] block mb-1.5">Target Role *</label>
                <input className={inputCls} placeholder="e.g. Frontend Developer" value={aiPrompt.role} onChange={e => setAiPrompt(p => ({ ...p, role: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[#7a96b0] block mb-1.5">Company (optional)</label>
                <input className={inputCls} placeholder="e.g. Google" value={aiPrompt.company} onChange={e => setAiPrompt(p => ({ ...p, company: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[#7a96b0] block mb-1.5">Tone</label>
                <select className={selectCls} value={aiPrompt.tone} onChange={e => setAiPrompt(p => ({ ...p, tone: e.target.value }))}>
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="confident">Confident</option>
                  <option value="concise">Concise</option>
                </select>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowAiModal(false)} className="flex-1 bg-[#111620] border border-[#1e2838] text-white py-2.5 rounded-lg text-sm">Cancel</button>
                <button onClick={generateWithAI} disabled={aiLoading || !aiPrompt.role}
                  className="flex-1 bg-[#9b7bff] text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-40">
                  {aiLoading ? '⚡ Generating...' : '🤖 Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}