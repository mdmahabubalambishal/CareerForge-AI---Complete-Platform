'use client'
import { useState } from 'react'

interface Props {
  onSubmit: (data: any) => void
  loading: boolean
}

const INDUSTRIES = [
  'Technology / AI / ML',
  'Software Engineering',
  'Data Science',
  'Product Management',
  'Design / UX',
  'Marketing / Growth',
  'Finance / Banking',
  'Healthcare',
  'Education',
  'NGO / Non-profit',
  'Government',
  'Freelance / Remote',
  'Other',
]

export default function ResumeForm({ onSubmit, loading }: Props) {
  const [activeSection, setActiveSection] = useState('basic')
  const [form, setForm] = useState({
    // Meta
    title: '',
    target_role: '',
    target_company: '',
    industry: 'Technology / AI / ML',

    // Personal
    full_name: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: '',

    // Content
    summary: '',
    skills: '',
    experience: '',
    education: '',
    projects: '',
    certifications: '',
    languages: '',
    awards: '',
    publications: '',
    volunteer: '',
    references: '',
  })

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      title: form.title || `${form.target_role} Resume`,
      target_role: form.target_role,
      target_company: form.target_company,
      industry: form.industry,
      user_data: {
        personal: {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          location: form.location,
          linkedin: form.linkedin,
          github: form.github,
          portfolio: form.portfolio,
        },
        raw_summary: form.summary,
        raw_skills: form.skills,
        raw_experience: form.experience,
        raw_education: form.education,
        raw_projects: form.projects,
        raw_certifications: form.certifications,
        raw_languages: form.languages,
        raw_awards: form.awards,
        raw_publications: form.publications,
        raw_volunteer: form.volunteer,
        raw_references: form.references,
      }
    })
  }

  const inputCls = "w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors"
  const labelCls = "text-[#7a96b0] text-xs font-medium block mb-1.5"
  const textareaCls = inputCls + " resize-none"

  const sections = [
    { id: 'basic', label: '🎯 Target', required: true },
    { id: 'personal', label: '👤 Personal', required: true },
    { id: 'experience', label: '💼 Experience' },
    { id: 'education', label: '🎓 Education' },
    { id: 'skills', label: '⚡ Skills' },
    { id: 'projects', label: '🚀 Projects' },
    { id: 'extra', label: '✨ Extra' },
  ]

  return (
    <div className="max-w-4xl">
      {/* Section Tabs */}
      <div className="flex gap-1 mb-5 bg-[#0c1018] border border-[#1e2838] rounded-xl p-1 flex-wrap">
        {sections.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeSection === s.id
                ? 'bg-[#00f0c8] text-black'
                : 'text-[#7a96b0] hover:text-white'
            }`}
          >
            {s.label}
            {s.required && <span className="text-red-400 ml-1">*</span>}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>

        {/* TARGET */}
        {activeSection === 'basic' && (
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6">
            <div className="text-sm font-bold text-white mb-4">🎯 Target Job Info</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Resume Title</label>
                <input className={inputCls} placeholder="e.g. LLM Engineer Resume v3" value={form.title} onChange={e => set('title', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Target Role *</label>
                <input className={inputCls} required placeholder="e.g. LLM Engineer, Product Manager, Teacher" value={form.target_role} onChange={e => set('target_role', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Target Company</label>
                <input className={inputCls} placeholder="e.g. Google, Brac, Any startup (optional)" value={form.target_company} onChange={e => set('target_company', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Industry *</label>
                <select className={inputCls} value={form.industry} onChange={e => set('industry', e.target.value)}>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 bg-[#00f0c8]/05 border border-[#00f0c8]/15 rounded-lg p-3">
              <div className="text-xs text-[#00f0c8] font-bold mb-1">💡 Pro Tip</div>
              <div className="text-xs text-[#7a96b0]">
                Each resume can be tailored for a specific role. Create multiple versions — one for LLM Engineer, one for ML Engineer, one for Freelance.
              </div>
            </div>
          </div>
        )}

        {/* PERSONAL */}
        {activeSection === 'personal' && (
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6">
            <div className="text-sm font-bold text-white mb-4">👤 Personal Info</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input className={inputCls} required placeholder="Mahabub Alam Bishal" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input className={inputCls} required type="email" placeholder="you@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input className={inputCls} placeholder="+880 1234 567890" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <input className={inputCls} placeholder="Dhaka, Bangladesh" value={form.location} onChange={e => set('location', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>LinkedIn URL</label>
                <input className={inputCls} placeholder="linkedin.com/in/your-profile" value={form.linkedin} onChange={e => set('linkedin', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>GitHub URL</label>
                <input className={inputCls} placeholder="github.com/your-username" value={form.github} onChange={e => set('github', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Portfolio / Website</label>
                <input className={inputCls} placeholder="yourportfolio.vercel.app" value={form.portfolio} onChange={e => set('portfolio', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* EXPERIENCE */}
        {activeSection === 'experience' && (
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6 space-y-4">
            <div className="text-sm font-bold text-white">💼 Work Experience</div>
            <div>
              <label className={labelCls}>Professional Summary</label>
              <textarea className={textareaCls} rows={3}
                placeholder="Brief 2-3 sentence professional summary (AI will enhance this)"
                value={form.summary} onChange={e => set('summary', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Work Experience</label>
              <textarea className={textareaCls} rows={6}
                placeholder={`Describe your work experience freely:\n\nAI Engineer at TechCorp, 2023-2024, Dhaka\n- Built RAG system with 30% better accuracy\n- Deployed 3 LLM apps on HuggingFace\n\nFreelance AI Developer, 2022-2023\n- Built chatbots for 10+ clients`}
                value={form.experience} onChange={e => set('experience', e.target.value)} />
            </div>
          </div>
        )}

        {/* EDUCATION */}
        {activeSection === 'education' && (
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6">
            <div className="text-sm font-bold text-white mb-4">🎓 Education</div>
            <div>
              <label className={labelCls}>Education Details</label>
              <textarea className={textareaCls} rows={5}
                placeholder={`Describe your education:\n\nBSc in Computer Science, Dhaka University, 2024, GPA 3.8\nDiploma in CSE, Dhaka Polytechnic, 2022\nRelevant courses: Machine Learning, Data Structures, Algorithms`}
                value={form.education} onChange={e => set('education', e.target.value)} />
            </div>
          </div>
        )}

        {/* SKILLS */}
        {activeSection === 'skills' && (
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6">
            <div className="text-sm font-bold text-white mb-4">⚡ Skills</div>
            <div>
              <label className={labelCls}>All Skills (comma separated or by category)</label>
              <textarea className={textareaCls} rows={6}
                placeholder={`Technical: Python, LangChain, LangGraph, FastAPI, RAG, LLMs\nTools: Docker, Git, HuggingFace, Groq, ChromaDB, Supabase\nSoft Skills: Problem Solving, Team Collaboration, Communication\n\nOr just list them:\nPython, React, Next.js, SQL, Machine Learning, Deep Learning`}
                value={form.skills} onChange={e => set('skills', e.target.value)} />
            </div>
          </div>
        )}

        {/* PROJECTS */}
        {activeSection === 'projects' && (
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6">
            <div className="text-sm font-bold text-white mb-4">🚀 Projects</div>
            <div>
              <label className={labelCls}>Projects</label>
              <textarea className={textareaCls} rows={8}
                placeholder={`Describe your projects:\n\nCareerForge AI — FastAPI, Next.js, Groq, ChromaDB\nFull-stack AI SaaS with resume builder, chatbot, job tracker\nhttps://careerforge.vercel.app\n\nAutonomous Research Agent — LangGraph, Groq\nMulti-agent system for automated research reports\nhttps://github.com/username/project`}
                value={form.projects} onChange={e => set('projects', e.target.value)} />
            </div>
          </div>
        )}

        {/* EXTRA SECTIONS */}
        {activeSection === 'extra' && (
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6 space-y-4">
            <div className="text-sm font-bold text-white mb-2">✨ Additional Sections</div>
            <div className="text-xs text-[#4a6680] mb-4">Only fill what's relevant — AI skips empty sections</div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>🏆 Certifications</label>
                <textarea className={textareaCls} rows={3}
                  placeholder="Google ML Certificate, 2024&#10;AWS Cloud Practitioner, 2023&#10;Coursera Deep Learning, 2023"
                  value={form.certifications} onChange={e => set('certifications', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>🌍 Languages</label>
                <textarea className={textareaCls} rows={3}
                  placeholder="Bengali - Native&#10;English - Fluent&#10;Hindi - Conversational"
                  value={form.languages} onChange={e => set('languages', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>🥇 Awards & Honors</label>
                <textarea className={textareaCls} rows={3}
                  placeholder="Best AI Project Award, Hackathon 2024&#10;Dean's List, 2022-2023&#10;National Science Olympiad Winner, 2021"
                  value={form.awards} onChange={e => set('awards', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>📚 Publications / Research</label>
                <textarea className={textareaCls} rows={3}
                  placeholder="RAG Systems for Low-Resource Languages, arXiv 2024&#10;Efficient LLM Fine-tuning, IEEE Conference 2023"
                  value={form.publications} onChange={e => set('publications', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>🤝 Volunteer Experience</label>
                <textarea className={textareaCls} rows={3}
                  placeholder="AI Trainer, Teach For Bangladesh, 2023-Present&#10;Tech Mentor, Youth Program, 2022"
                  value={form.volunteer} onChange={e => set('volunteer', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>📞 References</label>
                <textarea className={textareaCls} rows={3}
                  placeholder="Dr. Ahmed, CTO TechCorp, ahmed@techcorp.com&#10;Available upon request"
                  value={form.references} onChange={e => set('references', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="mt-5 flex gap-3">
          {activeSection !== 'basic' && (
            <button
              type="button"
              onClick={() => {
                const ids = sections.map(s => s.id)
                const idx = ids.indexOf(activeSection)
                if (idx > 0) setActiveSection(ids[idx - 1])
              }}
              className="px-6 py-3 bg-[#111620] border border-[#1e2838] text-white rounded-xl text-sm"
            >
              ← Previous
            </button>
          )}
          {activeSection !== 'extra' ? (
            <button
              type="button"
              onClick={() => {
                const ids = sections.map(s => s.id)
                const idx = ids.indexOf(activeSection)
                if (idx < ids.length - 1) setActiveSection(ids[idx + 1])
              }}
              className="flex-1 py-3 bg-[#111620] border border-[#1e2838] text-white rounded-xl text-sm hover:border-[#00f0c8] transition-all"
            >
              Next →
            </button>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#00f0c8] text-black font-bold py-3 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="animate-spin">⚡</span> Generating...</>
            ) : (
              '✨ Generate Resume'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}