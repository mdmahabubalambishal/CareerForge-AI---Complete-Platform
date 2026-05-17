'use client'
import { useState, useEffect, useRef } from 'react'
import { portfolioApi, resumeApi } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

interface Project { name: string; description: string; tech_stack: string[]; link: string; github: string }
interface Experience { title: string; company: string; location: string; start_date: string; end_date: string; bullets: string[] }
interface Education { degree: string; field: string; institution: string; start_year: string; end_year: string; gpa: string }
interface Testimonial { name: string; role: string; company: string; text: string }

const THEMES = [
  { id: 'dark',     label: 'Dark',     color: '#38bdf8', bg: '#080b10' },
  { id: 'light',    label: 'Light',    color: '#0ea5e9', bg: '#f0f4f8' },
  { id: 'midnight', label: 'Midnight', color: '#a78bfa', bg: '#06040f' },
  { id: 'ocean',    label: 'Ocean',    color: '#06b6d4', bg: '#020d14' },
  { id: 'forest',   label: 'Forest',   color: '#4ade80', bg: '#030a04' },
  { id: 'sunset',   label: 'Sunset',   color: '#fb923c', bg: '#0f0605' },
  { id: 'rose',     label: 'Rose',     color: '#fb7185', bg: '#0f0509' },
]

export default function PortfolioPage() {
  const [resumes, setResumes]           = useState<any[]>([])
  const [selectedResume, setSelectedResume] = useState('')
  const [theme, setTheme]               = useState('dark')
  const [html, setHtml]                 = useState('')
  const [loading, setLoading]           = useState(false)
  const [tab, setTab]                   = useState<'generate' | 'manual' | 'preview' | 'settings'>('generate')
  const [manualTab, setManualTab]       = useState<'personal' | 'skills' | 'projects' | 'experience' | 'education' | 'testimonials'>('personal')
  const [portfolio, setPortfolio]       = useState<any>(null)
  const [authChecked, setAuthChecked]   = useState(false)

  // Photo
  const [photoUrl, setPhotoUrl]         = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoInputType, setPhotoInputType] = useState<'upload' | 'url'>('upload')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Settings
  const [isPublic, setIsPublic]         = useState(false)
  const [slug, setSlug]                 = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved]   = useState(false)

  // Analytics
  const [analytics, setAnalytics]       = useState<any>(null)

  // Manual form
  const [personal, setPersonal] = useState({ full_name: '', email: '', phone: '', location: '', title: '', linkedin: '', github: '', portfolio: '' })
  const [summary, setSummary]   = useState('')
  const [techSkills, setTechSkills] = useState('')
  const [toolSkills, setToolSkills] = useState('')
  const [softSkills, setSoftSkills] = useState('')
  const [projects, setProjects]     = useState<Project[]>([])
  const [experience, setExperience] = useState<Experience[]>([])
  const [education, setEducation]   = useState<Education[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])

  useEffect(() => { checkAuthAndFetchData() }, [])

  async function checkAuthAndFetchData() {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        const now = Math.floor(Date.now() / 1000)
        if (session.expires_at && session.expires_at < now) {
          const { error } = await supabase.auth.refreshSession()
          if (error) { window.location.href = '/login'; return }
        }
        await Promise.all([fetchResumes(), fetchPortfolio(), fetchAnalytics()])
      } else { window.location.href = '/login' }
    } catch { window.location.href = '/login' }
    finally { setAuthChecked(true) }
  }

  async function fetchResumes() {
    try { setResumes(await resumeApi.list()) } catch { }
  }

  async function fetchPortfolio() {
    try {
      const data = await portfolioApi.get()
      if (data) {
        setPortfolio(data)
        setHtml(data.html)
        setTheme(data.theme || 'dark')
        if (data.photo_url) { setPhotoUrl(data.photo_url); setPhotoPreview(data.photo_url) }
        setIsPublic(data.is_public || false)
        setSlug(data.slug || '')
        setCustomDomain(data.custom_domain || '')
      }
    } catch { }
  }

  async function fetchAnalytics() {
    try { setAnalytics(await portfolioApi.getAnalytics()) } catch { }
  }

  // ── Photo ──────────────────────────────────────────────────────────────────
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
    setUploadingPhoto(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const ext = file.name.split('.').pop()
      const fileName = `${session.user.id}/avatar.${ext}`
      const { error } = await supabase.storage.from('portfolio-photos').upload(fileName, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('portfolio-photos').getPublicUrl(fileName)
      setPhotoUrl(publicUrl); setPhotoPreview(publicUrl)
    } catch (err: any) { alert(`Photo upload failed: ${err.message}`); setPhotoPreview('') }
    finally { setUploadingPhoto(false) }
  }

  function removePhoto() {
    setPhotoUrl(''); setPhotoPreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Generate ───────────────────────────────────────────────────────────────
  async function handleGenerate() {
    setLoading(true)
    try {
      const extraData = testimonials.length > 0 ? { testimonials } : undefined
      const data = await portfolioApi.generate(selectedResume || undefined, extraData, theme, photoUrl || undefined)
      setHtml(data.html); setPortfolio(data)
      if (data.slug) setSlug(data.slug)
      setTab('preview')
    } catch (err: any) { alert(err.message) }
    finally { setLoading(false) }
  }

  async function handleManualGenerate() {
    setLoading(true)
    try {
      const data = {
        personal, summary,
        skills: {
          technical: techSkills.split(',').map(s => s.trim()).filter(Boolean),
          tools: toolSkills.split(',').map(s => s.trim()).filter(Boolean),
          soft: softSkills.split(',').map(s => s.trim()).filter(Boolean),
        },
        projects, experience, education, testimonials,
      }
      const result = await portfolioApi.generate(undefined, data, theme, photoUrl || undefined)
      setHtml(result.html); setPortfolio(result)
      if (result.slug) setSlug(result.slug)
      setTab('preview')
    } catch (err: any) { alert(err.message) }
    finally { setLoading(false) }
  }

  // ── Settings ───────────────────────────────────────────────────────────────
  async function handleSaveSettings() {
    setSavingSettings(true)
    try {
      await portfolioApi.updateSettings({ is_public: isPublic, slug, custom_domain: customDomain })
      setSettingsSaved(true)
      await fetchAnalytics()
      setTimeout(() => setSettingsSaved(false), 2500)
    } catch (err: any) { alert(err.message) }
    finally { setSavingSettings(false) }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const addProject    = () => setProjects(p => [...p, { name: '', description: '', tech_stack: [], link: '', github: '' }])
  const removeProject = (i: number) => setProjects(p => p.filter((_, idx) => idx !== i))
  const updateProject = (i: number, f: keyof Project, v: any) => setProjects(p => p.map((x, idx) => idx === i ? { ...x, [f]: v } : x))

  const addExperience    = () => setExperience(p => [...p, { title: '', company: '', location: '', start_date: '', end_date: '', bullets: [''] }])
  const removeExperience = (i: number) => setExperience(p => p.filter((_, idx) => idx !== i))
  const updateExperience = (i: number, f: keyof Experience, v: any) => setExperience(p => p.map((x, idx) => idx === i ? { ...x, [f]: v } : x))

  const addEducation    = () => setEducation(p => [...p, { degree: '', field: '', institution: '', start_year: '', end_year: '', gpa: '' }])
  const removeEducation = (i: number) => setEducation(p => p.filter((_, idx) => idx !== i))
  const updateEducation = (i: number, f: keyof Education, v: any) => setEducation(p => p.map((x, idx) => idx === i ? { ...x, [f]: v } : x))

  const addTestimonial    = () => setTestimonials(p => [...p, { name: '', role: '', company: '', text: '' }])
  const removeTestimonial = (i: number) => setTestimonials(p => p.filter((_, idx) => idx !== i))
  const updateTestimonial = (i: number, f: keyof Testimonial, v: string) => setTestimonials(p => p.map((x, idx) => idx === i ? { ...x, [f]: v } : x))

  function handleDownload() {
    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'portfolio.html'; a.click()
    URL.revokeObjectURL(url)
  }

  function handleOpenPreview() {
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
  }

  function copyPublicUrl() {
    const url = `${window.location.origin}/p/${slug}`
    navigator.clipboard.writeText(url)
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inp     = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors'
  const lbl     = 'text-[#7a96b0] text-xs font-medium block mb-1.5'
  const card    = 'bg-[#0c1018] border border-[#1e2838] rounded-xl p-5'
  const addBtn  = 'flex items-center gap-2 text-xs text-[#00f0c8] border border-[#00f0c8]/30 hover:border-[#00f0c8] px-3 py-2 rounded-lg transition-all'
  const rmBtn   = 'text-[#ff5f57] text-xs hover:underline'
  const itemCard = 'bg-[#111620] border border-[#1e2838] rounded-xl p-4 space-y-3'

  // ── Photo Box ──────────────────────────────────────────────────────────────
  const PhotoBox = () => (
    <div className={card}>
      <div className="text-sm font-bold text-white mb-3">🖼 Profile Photo</div>
      {photoPreview ? (
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <img src={photoPreview} alt="Preview" className="w-14 h-14 rounded-full object-cover border-2 border-[#00f0c8]" onError={() => setPhotoPreview('')} />
            {uploadingPhoto && <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center"><span className="animate-spin text-xs">⚡</span></div>}
          </div>
          <div>
            <p className="text-white text-xs font-medium mb-1">{uploadingPhoto ? 'Uploading...' : 'Photo ready ✓'}</p>
            <button onClick={removePhoto} className="text-[#ff5f57] text-xs hover:underline">Remove</button>
          </div>
        </div>
      ) : (
        <div className="w-14 h-14 rounded-full bg-[#111620] border-2 border-dashed border-[#1e2838] flex items-center justify-center mb-4 text-2xl">👤</div>
      )}
      <div className="flex gap-1 mb-3 bg-[#111620] rounded-lg p-1">
        {(['upload', 'url'] as const).map(t => (
          <button key={t} onClick={() => setPhotoInputType(t)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${photoInputType === t ? 'bg-[#1e2838] text-white' : 'text-[#4a6680]'}`}>
            {t === 'upload' ? '📁 Upload' : '🔗 URL'}
          </button>
        ))}
      </div>
      {photoInputType === 'upload' ? (
        <>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" id="photo-upload" />
          <label htmlFor="photo-upload" className="w-full flex items-center justify-center gap-2 bg-[#111620] border border-dashed border-[#1e2838] hover:border-[#00f0c8] rounded-lg py-3 text-xs text-[#7a96b0] hover:text-white cursor-pointer transition-all">
            {uploadingPhoto ? <><span className="animate-spin">⚡</span> Uploading...</> : <>📤 Click to upload</>}
          </label>
          <p className="text-[#4a6680] text-xs mt-1.5">JPG, PNG, WebP — max 5MB</p>
        </>
      ) : (
        <>
          <input className={inp} placeholder="https://github.com/you.png" value={photoUrl}
            onChange={e => { setPhotoUrl(e.target.value); setPhotoPreview(e.target.value) }} />
          <p className="text-[#4a6680] text-xs mt-1.5">GitHub avatar, LinkedIn photo URL, etc.</p>
        </>
      )}
    </div>
  )

  // ── Theme Picker ───────────────────────────────────────────────────────────
  const ThemePicker = () => (
    <div className={card}>
      <div className="text-sm font-bold text-white mb-3">🎨 Theme</div>
      <div className="grid grid-cols-4 gap-2">
        {THEMES.map(t => (
          <button key={t.id} onClick={() => setTheme(t.id)}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${theme === t.id ? 'border-[#00f0c8] bg-[#00f0c8]/5' : 'border-[#1e2838] hover:border-[#263040]'}`}>
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center" style={{ background: t.bg, borderColor: t.color }}>
              <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
            </div>
            <span className={`text-xs font-medium ${theme === t.id ? 'text-[#00f0c8]' : 'text-[#4a6680]'}`}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )

  // ── Testimonials for Generate tab ──────────────────────────────────────────
  const TestimonialsBox = () => (
    <div className={card}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold text-white">💬 Testimonials</div>
        <button onClick={addTestimonial} className="text-xs text-[#00f0c8] border border-[#00f0c8]/30 hover:border-[#00f0c8] px-2 py-1 rounded-lg transition-all">+ Add</button>
      </div>
      {testimonials.length === 0 ? (
        <p className="text-[#4a6680] text-xs text-center py-3">No testimonials yet</p>
      ) : (
        <div className="space-y-3">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-[#111620] border border-[#1e2838] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#00f0c8] text-xs font-bold">#{i + 1}</span>
                <button onClick={() => removeTestimonial(i)} className="text-[#ff5f57] text-xs">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={lbl}>Name</label><input className={inp} value={t.name} placeholder="John Smith" onChange={e => updateTestimonial(i, 'name', e.target.value)} /></div>
                <div><label className={lbl}>Role</label><input className={inp} value={t.role} placeholder="CTO" onChange={e => updateTestimonial(i, 'role', e.target.value)} /></div>
                <div className="col-span-2"><label className={lbl}>Company</label><input className={inp} value={t.company} placeholder="TechCorp" onChange={e => updateTestimonial(i, 'company', e.target.value)} /></div>
                <div className="col-span-2"><label className={lbl}>Message</label><textarea className={inp + ' resize-none'} rows={2} value={t.text} placeholder="An exceptional developer..." onChange={e => updateTestimonial(i, 'text', e.target.value)} /></div>
              </div>
            </div>
          ))}
          <button onClick={handleGenerate} disabled={loading}
            className="w-full bg-[#111620] border border-[#00f0c8]/30 hover:border-[#00f0c8] text-[#00f0c8] font-bold py-2 rounded-lg text-xs disabled:opacity-40 transition-all flex items-center justify-center gap-2">
            {loading ? <><span className="animate-spin">⚡</span> Regenerating...</> : '🔄 Regenerate with Testimonials'}
          </button>
        </div>
      )}
    </div>
  )

  if (!authChecked) return (
    <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
      <div className="text-center"><div className="animate-spin text-4xl mb-4">⚡</div><p className="text-[#4a6680]">Loading...</p></div>
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio Builder</h1>
          <p className="text-[#4a6680] text-sm mt-1">Auto-generate from resume or build manually — deploy to Vercel</p>
        </div>
        {html && (
          <div className="flex gap-2">
            <button onClick={handleOpenPreview} className="bg-[#111620] border border-[#1e2838] text-white px-4 py-2 rounded-lg text-sm hover:border-[#263040]">👁 Preview</button>
            <button onClick={handleDownload} className="bg-[#111620] border border-[#1e2838] text-white px-4 py-2 rounded-lg text-sm hover:border-[#263040]">📥 Download</button>
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 mb-6 bg-[#0c1018] border border-[#1e2838] rounded-xl p-1 w-fit">
        {[
          { id: 'generate', label: '🤖 From Resume' },
          { id: 'manual',   label: '✏️ Manual Build' },
          { id: 'preview',  label: '👁 Preview' },
          { id: 'settings', label: '⚙️ Settings' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-[#00f0c8] text-black' : 'text-[#7a96b0] hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── FROM RESUME ── */}
      {tab === 'generate' && (
        <div className="grid grid-cols-3 gap-5">
          <div className="space-y-4">
            <div className={card}>
              <div className="text-sm font-bold text-white mb-4">Generate from Resume</div>
              <div className="space-y-4">
                <div>
                  <label className={lbl}>Select Resume</label>
                  <select className={inp} value={selectedResume} onChange={e => setSelectedResume(e.target.value)}>
                    <option value="">Latest resume</option>
                    {resumes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                  </select>
                </div>
                <button onClick={handleGenerate} disabled={loading || uploadingPhoto}
                  className="w-full bg-[#00f0c8] text-black font-bold py-3 rounded-lg text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                  {loading ? <><span className="animate-spin">⚡</span> Generating...</> : '🌐 Generate Portfolio'}
                </button>
              </div>
            </div>
            <ThemePicker />
            <PhotoBox />
            <TestimonialsBox />
            <div className={card}>
              <div className="text-sm font-bold text-white mb-3">🚀 Deploy to Vercel</div>
              <div className="space-y-1.5 text-xs text-[#7a96b0] mb-3">
                <p>1. Generate portfolio</p><p>2. Download HTML file</p>
                <p>3. Go to <span className="text-[#00f0c8]">vercel.com/new</span></p>
                <p>4. Drag & drop the HTML file</p><p>5. Get your live URL!</p>
              </div>
              <a href="https://vercel.com/new" target="_blank" rel="noopener noreferrer"
                className="block w-full bg-[#111620] border border-[#1e2838] text-white text-center py-2 rounded-lg text-sm hover:border-[#00f0c8] transition-all">
                Open Vercel →
              </a>
            </div>
          </div>
          <div className="col-span-2">
            {html ? (
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl overflow-hidden">
                <div className="bg-[#111620] border-b border-[#1e2838] p-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" /><div className="w-3 h-3 rounded-full bg-[#febc2e]" /><div className="w-3 h-3 rounded-full bg-[#28c840]" />
                  <div className="flex-1 bg-[#0c1018] rounded px-3 py-1 text-xs text-[#4a6680] ml-2">your-name.vercel.app</div>
                </div>
                <iframe srcDoc={html} className="w-full border-0" style={{ height: '520px' }} title="Portfolio Preview" />
              </div>
            ) : (
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center p-10">
                  <div className="text-5xl mb-4">🌐</div>
                  <div className="text-white font-bold text-lg mb-2">Portfolio Preview</div>
                  <p className="text-[#4a6680] text-sm">Generate your portfolio to see preview here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MANUAL BUILD ── */}
      {tab === 'manual' && (
        <div className="grid grid-cols-3 gap-5">
          <div className="space-y-4">
            <div className={card}>
              <div className="text-sm font-bold text-white mb-3">Sections</div>
              <div className="space-y-1">
                {[
                  { id: 'personal',     label: '👤 Personal Info', count: null },
                  { id: 'skills',       label: '⚡ Skills',         count: null },
                  { id: 'projects',     label: '🚀 Projects',       count: projects.length },
                  { id: 'experience',   label: '💼 Experience',     count: experience.length },
                  { id: 'education',    label: '🎓 Education',      count: education.length },
                  { id: 'testimonials', label: '💬 Testimonials',   count: testimonials.length },
                ].map(s => (
                  <button key={s.id} onClick={() => setManualTab(s.id as any)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${manualTab === s.id ? 'bg-[#00f0c8]/10 text-[#00f0c8] border border-[#00f0c8]/30' : 'text-[#7a96b0] hover:text-white hover:bg-[#111620]'}`}>
                    <span>{s.label}</span>
                    {s.count !== null && s.count > 0 && <span className="bg-[#00f0c8]/20 text-[#00f0c8] text-xs px-2 py-0.5 rounded-full">{s.count}</span>}
                  </button>
                ))}
              </div>
            </div>
            <ThemePicker />
            <PhotoBox />
            <div className={card}>
              <button onClick={handleManualGenerate} disabled={loading || uploadingPhoto || !personal.full_name}
                className="w-full bg-[#00f0c8] text-black font-bold py-3 rounded-lg text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                {loading ? <><span className="animate-spin">⚡</span> Generating...</> : '🌐 Generate Portfolio'}
              </button>
              {!personal.full_name && <p className="text-[#4a6680] text-xs mt-2 text-center">Full name required</p>}
            </div>
          </div>

          <div className="col-span-2">
            {/* PERSONAL */}
            {manualTab === 'personal' && (
              <div className={card + ' space-y-4'}>
                <div className="text-sm font-bold text-white">Personal Info</div>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: 'full_name', label: 'Full Name *', placeholder: 'Mahabub Alam Bishal', type: 'text' },
                    { key: 'title',     label: 'Job Title',   placeholder: 'Full Stack Developer', type: 'text' },
                    { key: 'email',     label: 'Email',       placeholder: 'you@email.com',        type: 'email' },
                    { key: 'phone',     label: 'Phone',       placeholder: '+880 1700 000000',      type: 'text' },
                    { key: 'location',  label: 'Location',    placeholder: 'Dhaka, Bangladesh',     type: 'text' },
                    { key: 'github',    label: 'GitHub URL',  placeholder: 'github.com/username',  type: 'text' },
                    { key: 'linkedin',  label: 'LinkedIn URL',placeholder: 'linkedin.com/in/you',  type: 'text' },
                    { key: 'portfolio', label: 'Portfolio URL',placeholder: 'yoursite.com',        type: 'text' },
                  ] as const).map(f => (
                    <div key={f.key}>
                      <label className={lbl}>{f.label}</label>
                      <input type={f.type} className={inp} placeholder={f.placeholder} value={(personal as any)[f.key]}
                        onChange={e => setPersonal(p => ({ ...p, [f.key]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className={lbl}>Professional Summary</label>
                  <textarea className={inp + ' resize-none'} rows={4} value={summary} onChange={e => setSummary(e.target.value)}
                    placeholder="AI Engineer building production LLM applications..." />
                </div>
              </div>
            )}

            {/* SKILLS */}
            {manualTab === 'skills' && (
              <div className={card + ' space-y-4'}>
                <div className="text-sm font-bold text-white">Skills</div>
                {[
                  { label: 'Technical Skills', val: techSkills, set: setTechSkills, placeholder: 'Python, TypeScript, React, FastAPI...' },
                  { label: 'Tools & Platforms', val: toolSkills, set: setToolSkills, placeholder: 'Docker, AWS, Vercel, GitHub Actions...' },
                  { label: 'Soft Skills', val: softSkills, set: setSoftSkills, placeholder: 'Team Leadership, Communication...' },
                ].map(f => (
                  <div key={f.label}>
                    <label className={lbl}>{f.label} <span className="text-[#4a6680]">(comma separated)</span></label>
                    <input className={inp} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} />
                  </div>
                ))}
              </div>
            )}

            {/* PROJECTS */}
            {manualTab === 'projects' && (
              <div className="space-y-4">
                {projects.map((proj, i) => (
                  <div key={i} className={itemCard}>
                    <div className="flex items-center justify-between"><span className="text-[#00f0c8] text-xs font-bold">Project {i + 1}</span><button onClick={() => removeProject(i)} className={rmBtn}>✕ Remove</button></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2"><label className={lbl}>Project Name</label><input className={inp} value={proj.name} placeholder="CareerForge AI" onChange={e => updateProject(i, 'name', e.target.value)} /></div>
                      <div className="col-span-2"><label className={lbl}>Description</label><textarea className={inp + ' resize-none'} rows={2} value={proj.description} placeholder="AI-powered career tool..." onChange={e => updateProject(i, 'description', e.target.value)} /></div>
                      <div className="col-span-2"><label className={lbl}>Tech Stack <span className="text-[#4a6680]">(comma separated)</span></label><input className={inp} value={proj.tech_stack.join(', ')} placeholder="Next.js, FastAPI, Supabase" onChange={e => updateProject(i, 'tech_stack', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} /></div>
                      <div><label className={lbl}>Live Demo URL</label><input className={inp} value={proj.link} placeholder="https://app.vercel.app" onChange={e => updateProject(i, 'link', e.target.value)} /></div>
                      <div><label className={lbl}>GitHub URL</label><input className={inp} value={proj.github} placeholder="https://github.com/you/repo" onChange={e => updateProject(i, 'github', e.target.value)} /></div>
                    </div>
                  </div>
                ))}
                <button onClick={addProject} className={addBtn}><span className="text-lg leading-none">+</span> Add Project</button>
                {projects.length === 0 && <div className={card + ' text-center py-10'}><div className="text-4xl mb-3">🚀</div><p className="text-[#4a6680] text-sm">No projects yet!</p></div>}
              </div>
            )}

            {/* EXPERIENCE */}
            {manualTab === 'experience' && (
              <div className="space-y-4">
                {experience.map((exp, i) => (
                  <div key={i} className={itemCard}>
                    <div className="flex items-center justify-between"><span className="text-[#00f0c8] text-xs font-bold">Experience {i + 1}</span><button onClick={() => removeExperience(i)} className={rmBtn}>✕ Remove</button></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={lbl}>Job Title</label><input className={inp} value={exp.title} placeholder="Software Engineer" onChange={e => updateExperience(i, 'title', e.target.value)} /></div>
                      <div><label className={lbl}>Company</label><input className={inp} value={exp.company} placeholder="Google" onChange={e => updateExperience(i, 'company', e.target.value)} /></div>
                      <div><label className={lbl}>Location</label><input className={inp} value={exp.location} placeholder="Dhaka, Bangladesh" onChange={e => updateExperience(i, 'location', e.target.value)} /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className={lbl}>Start</label><input className={inp} value={exp.start_date} placeholder="Jan 2023" onChange={e => updateExperience(i, 'start_date', e.target.value)} /></div>
                        <div><label className={lbl}>End</label><input className={inp} value={exp.end_date} placeholder="Present" onChange={e => updateExperience(i, 'end_date', e.target.value)} /></div>
                      </div>
                      <div className="col-span-2"><label className={lbl}>Responsibilities <span className="text-[#4a6680]">(one per line)</span></label><textarea className={inp + ' resize-none'} rows={4} value={exp.bullets.join('\n')} placeholder={"Built REST APIs\nReduced latency by 40%"} onChange={e => updateExperience(i, 'bullets', e.target.value.split('\n'))} /></div>
                    </div>
                  </div>
                ))}
                <button onClick={addExperience} className={addBtn}><span className="text-lg leading-none">+</span> Add Experience</button>
                {experience.length === 0 && <div className={card + ' text-center py-10'}><div className="text-4xl mb-3">💼</div><p className="text-[#4a6680] text-sm">No experience yet!</p></div>}
              </div>
            )}

            {/* EDUCATION */}
            {manualTab === 'education' && (
              <div className="space-y-4">
                {education.map((edu, i) => (
                  <div key={i} className={itemCard}>
                    <div className="flex items-center justify-between"><span className="text-[#00f0c8] text-xs font-bold">Education {i + 1}</span><button onClick={() => removeEducation(i)} className={rmBtn}>✕ Remove</button></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={lbl}>Degree</label><input className={inp} value={edu.degree} placeholder="BSc" onChange={e => updateEducation(i, 'degree', e.target.value)} /></div>
                      <div><label className={lbl}>Field</label><input className={inp} value={edu.field} placeholder="Computer Science" onChange={e => updateEducation(i, 'field', e.target.value)} /></div>
                      <div className="col-span-2"><label className={lbl}>Institution</label><input className={inp} value={edu.institution} placeholder="BUET" onChange={e => updateEducation(i, 'institution', e.target.value)} /></div>
                      <div><label className={lbl}>Start Year</label><input className={inp} value={edu.start_year} placeholder="2019" onChange={e => updateEducation(i, 'start_year', e.target.value)} /></div>
                      <div><label className={lbl}>End Year</label><input className={inp} value={edu.end_year} placeholder="2023" onChange={e => updateEducation(i, 'end_year', e.target.value)} /></div>
                      <div><label className={lbl}>GPA (optional)</label><input className={inp} value={edu.gpa} placeholder="3.8 / 4.0" onChange={e => updateEducation(i, 'gpa', e.target.value)} /></div>
                    </div>
                  </div>
                ))}
                <button onClick={addEducation} className={addBtn}><span className="text-lg leading-none">+</span> Add Education</button>
                {education.length === 0 && <div className={card + ' text-center py-10'}><div className="text-4xl mb-3">🎓</div><p className="text-[#4a6680] text-sm">No education yet!</p></div>}
              </div>
            )}

            {/* TESTIMONIALS */}
            {manualTab === 'testimonials' && (
              <div className="space-y-4">
                {testimonials.map((t, i) => (
                  <div key={i} className={itemCard}>
                    <div className="flex items-center justify-between"><span className="text-[#00f0c8] text-xs font-bold">Testimonial {i + 1}</span><button onClick={() => removeTestimonial(i)} className={rmBtn}>✕ Remove</button></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={lbl}>Name</label><input className={inp} value={t.name} placeholder="John Smith" onChange={e => updateTestimonial(i, 'name', e.target.value)} /></div>
                      <div><label className={lbl}>Role</label><input className={inp} value={t.role} placeholder="CTO" onChange={e => updateTestimonial(i, 'role', e.target.value)} /></div>
                      <div><label className={lbl}>Company</label><input className={inp} value={t.company} placeholder="TechCorp" onChange={e => updateTestimonial(i, 'company', e.target.value)} /></div>
                      <div className="col-span-2"><label className={lbl}>Testimonial Text</label><textarea className={inp + ' resize-none'} rows={3} value={t.text} placeholder="An exceptional developer..." onChange={e => updateTestimonial(i, 'text', e.target.value)} /></div>
                    </div>
                  </div>
                ))}
                <button onClick={addTestimonial} className={addBtn}><span className="text-lg leading-none">+</span> Add Testimonial</button>
                {testimonials.length === 0 && <div className={card + ' text-center py-10'}><div className="text-4xl mb-3">💬</div><p className="text-[#4a6680] text-sm">No testimonials yet!</p></div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {tab === 'preview' && (
        <div>
          {html ? (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl overflow-hidden">
              <div className="bg-[#111620] border-b border-[#1e2838] p-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" /><div className="w-3 h-3 rounded-full bg-[#febc2e]" /><div className="w-3 h-3 rounded-full bg-[#28c840]" />
                <div className="flex-1 bg-[#0c1018] rounded px-3 py-1 text-xs text-[#4a6680] ml-2">
                  {slug ? `careerforge.app/p/${slug}` : 'your-name.vercel.app'}
                </div>
                <button onClick={handleOpenPreview} className="text-xs text-[#00f0c8] hover:underline ml-2">Open Full Screen</button>
              </div>
              <iframe srcDoc={html} className="w-full border-0" style={{ height: '600px' }} title="Portfolio Preview" />
            </div>
          ) : (
            <div className="text-center py-16 bg-[#0c1018] border border-[#1e2838] rounded-xl">
              <div className="text-5xl mb-4">🌐</div>
              <div className="text-white font-bold mb-2">No portfolio yet</div>
              <p className="text-[#4a6680] text-sm mb-6">Generate from resume or build manually</p>
              <button onClick={() => setTab('generate')} className="bg-[#00f0c8] text-black font-bold px-6 py-3 rounded-lg">Generate Portfolio</button>
            </div>
          )}
        </div>
      )}

      {/* ── SETTINGS ── */}
      {tab === 'settings' && (
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-5">

            {/* Public URL */}
            <div className={card}>
              <div className="text-sm font-bold text-white mb-4">🔗 Public URL</div>
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer ${isPublic ? 'border-[#00f0c8] bg-[#00f0c8]/5' : 'border-[#1e2838]'}`}
                  onClick={() => setIsPublic(!isPublic)}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isPublic ? 'bg-[#00f0c8] border-[#00f0c8]' : 'border-[#4a6680]'}`}>
                    {isPublic && <span className="text-black text-xs font-bold">✓</span>}
                  </div>
                  <span className="text-sm text-white">Make portfolio public</span>
                </div>
              </div>
              {isPublic && slug && (
                <div className="mb-4">
                  <label className={lbl}>Your public URL</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-[#00f0c8] text-sm font-mono">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/p/{slug}
                    </div>
                    <button onClick={copyPublicUrl} className="bg-[#111620] border border-[#1e2838] text-white px-4 py-2 rounded-lg text-sm hover:border-[#00f0c8] transition-all">📋 Copy</button>
                  </div>
                </div>
              )}
              <div>
                <label className={lbl}>Custom slug</label>
                <div className="flex gap-2">
                  <div className="bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-[#4a6680] text-sm">/p/</div>
                  <input className={inp} value={slug} placeholder="your-name" onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                </div>
                <p className="text-[#4a6680] text-xs mt-1.5">Only letters, numbers, and hyphens</p>
              </div>
            </div>

            {/* Custom Domain */}
            <div className={card}>
              <div className="text-sm font-bold text-white mb-4">🌐 Custom Domain</div>
              <div className="mb-4">
                <label className={lbl}>Your domain</label>
                <input className={inp} value={customDomain} placeholder="yourname.com" onChange={e => setCustomDomain(e.target.value)} />
              </div>
              <div className="bg-[#111620] border border-[#1e2838] rounded-xl p-4 space-y-3">
                <p className="text-white text-xs font-bold mb-2">DNS Setup Guide</p>
                <div className="space-y-2 text-xs text-[#7a96b0]">
                  <p>1. Generate & download your portfolio HTML</p>
                  <p>2. Go to <span className="text-[#00f0c8]">vercel.com</span> → Deploy the HTML file</p>
                  <p>3. In Vercel → Settings → Domains → Add your domain</p>
                  <p>4. In your DNS provider, add a CNAME record:</p>
                  <div className="bg-[#0c1018] rounded-lg p-3 font-mono text-xs space-y-1">
                    <p><span className="text-[#00f0c8]">Type:</span> CNAME</p>
                    <p><span className="text-[#00f0c8]">Name:</span> @ (or www)</p>
                    <p><span className="text-[#00f0c8]">Value:</span> cname.vercel-dns.com</p>
                  </div>
                  <p>5. Wait 24-48 hours for DNS propagation</p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button onClick={handleSaveSettings} disabled={savingSettings}
              className="w-full bg-[#00f0c8] text-black font-bold py-3 rounded-lg text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
              {savingSettings ? <><span className="animate-spin">⚡</span> Saving...</> : settingsSaved ? '✓ Saved!' : '💾 Save Settings'}
            </button>
          </div>

          {/* Analytics */}
          <div className="space-y-4">
            <div className={card}>
              <div className="text-sm font-bold text-white mb-4">📊 Analytics</div>
              {analytics ? (
                <div className="space-y-4">
                  <div className="bg-[#111620] border border-[#1e2838] rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-[#00f0c8] mb-1">{analytics.views || 0}</div>
                    <div className="text-[#4a6680] text-xs">Total Views</div>
                  </div>
                  <div className="bg-[#111620] border border-[#1e2838] rounded-xl p-4">
                    <p className="text-[#4a6680] text-xs mb-1">Last Viewed</p>
                    <p className="text-white text-sm">
                      {analytics.last_viewed
                        ? new Date(analytics.last_viewed).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Not viewed yet'}
                    </p>
                  </div>
                  <div className="bg-[#111620] border border-[#1e2838] rounded-xl p-4">
                    <p className="text-[#4a6680] text-xs mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${analytics.is_public ? 'bg-[#00f0c8]' : 'bg-[#4a6680]'}`} />
                      <p className="text-white text-sm">{analytics.is_public ? 'Public' : 'Private'}</p>
                    </div>
                  </div>
                  {analytics.slug && (
                    <div className="bg-[#111620] border border-[#1e2838] rounded-xl p-4">
                      <p className="text-[#4a6680] text-xs mb-1">Slug</p>
                      <p className="text-[#00f0c8] text-sm font-mono">/p/{analytics.slug}</p>
                    </div>
                  )}
                  <button onClick={fetchAnalytics} className="w-full bg-[#111620] border border-[#1e2838] text-[#7a96b0] py-2 rounded-lg text-xs hover:border-[#263040] transition-all">
                    🔄 Refresh
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">📊</div>
                  <p className="text-[#4a6680] text-sm">No analytics yet</p>
                  <p className="text-[#4a6680] text-xs mt-1">Generate a portfolio first</p>
                </div>
              )}
            </div>

            {/* Quick share */}
            {slug && isPublic && (
              <div className={card}>
                <div className="text-sm font-bold text-white mb-3">📤 Share</div>
                <div className="space-y-2">
                  <button onClick={copyPublicUrl} className="w-full bg-[#111620] border border-[#1e2838] text-white py-2.5 rounded-lg text-sm hover:border-[#00f0c8] transition-all flex items-center justify-center gap-2">
                    📋 Copy Link
                  </button>
                  <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/p/${slug}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="block w-full bg-[#111620] border border-[#1e2838] text-white py-2.5 rounded-lg text-sm hover:border-[#0ea5e9] transition-all text-center">
                    🔗 Share on LinkedIn
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}