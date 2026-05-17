'use client'
import { useState } from 'react'

type Tool = {
  id: string
  icon: string
  label: string
  color: string
  endpoint: string
  fields: Field[]
}

type Field = {
  key: string
  label: string
  placeholder: string
  type: 'input' | 'textarea' | 'select'
  options?: string[]
  rows?: number
  required?: boolean
}

const tools: Tool[] = [
  {
    id: 'referral',
    icon: '🤝',
    label: 'Referral Request',
    color: '#00f0c8',
    endpoint: 'referralRequest',
    fields: [
      { key: 'sender_info', label: 'Your Info', placeholder: 'Mahabub, AI Engineer, Python/LangChain specialist', type: 'input', required: true },
      { key: 'target_person', label: 'Target Person', placeholder: 'John Smith, Senior Engineer at Google', type: 'input', required: true },
      { key: 'target_company', label: 'Company', placeholder: 'Google', type: 'input', required: true },
      { key: 'target_role', label: 'Target Role', placeholder: 'LLM Engineer', type: 'input', required: true },
      { key: 'relationship', label: 'Relationship', placeholder: 'Former colleague / LinkedIn connection', type: 'input' },
      { key: 'platform', label: 'Platform', placeholder: 'LinkedIn / Email', type: 'input' },
    ],
  },
  {
    id: 'recommendation',
    icon: '📋',
    label: 'Recommendation Letter',
    color: '#9b7bff',
    endpoint: 'recommendationLetter',
    fields: [
      { key: 'person_info', label: 'About the Person', placeholder: 'Mahabub, AI Engineer, worked with me for 2 years, built excellent RAG systems', type: 'textarea', rows: 3, required: true },
      { key: 'recommender_info', label: 'Recommender Info', placeholder: 'Dr. Ahmed, CTO at TechCorp, managed Mahabub directly', type: 'input', required: true },
      { key: 'purpose', label: 'Purpose', placeholder: 'Job application at Google / University admission', type: 'input', required: true },
      { key: 'strengths', label: 'Key Strengths', placeholder: 'Problem solving, LLM expertise, team collaboration', type: 'input', required: true },
      { key: 'letter_type', label: 'Letter Type', placeholder: 'recommendation letter / reference letter', type: 'input' },
    ],
  },
  {
    id: 'noc',
    icon: '📜',
    label: 'NOC / Certificate',
    color: '#ff7c4d',
    endpoint: 'noc',
    fields: [
      { key: 'employee_info', label: 'Employee Info', placeholder: 'Mahabub Alam Bishal, ID: EMP001', type: 'input', required: true },
      { key: 'company', label: 'Company Name', placeholder: 'TechCorp Bangladesh Ltd.', type: 'input', required: true },
      { key: 'role', label: 'Job Role', placeholder: 'AI Engineer', type: 'input', required: true },
      { key: 'duration', label: 'Duration', placeholder: 'January 2023 to December 2024', type: 'input', required: true },
      { key: 'purpose', label: 'Purpose', placeholder: 'Visa application / New job / Higher studies', type: 'input', required: true },
      { key: 'document_type', label: 'Document Type', placeholder: 'NOC / Experience Certificate / Relieving Letter', type: 'input' },
    ],
  },
  {
    id: 'freelance',
    icon: '🎭',
    label: 'Freelance Profile',
    color: '#ffd84d',
    endpoint: 'freelanceProfile',
    fields: [
      { key: 'platform', label: 'Platform *', placeholder: 'Upwork / Fiverr / Toptal', type: 'select', options: ['Upwork', 'Fiverr', 'Toptal', 'LinkedIn', 'Freelancer.com'], required: true },
      { key: 'freelancer_info', label: 'Your Background', placeholder: 'AI Engineer with 2 years experience, built 5+ production LLM apps', type: 'textarea', rows: 3, required: true },
      { key: 'skills', label: 'Skills', placeholder: 'Python, LangChain, FastAPI, RAG, LLM, ChatGPT API', type: 'input', required: true },
      { key: 'target_clients', label: 'Target Clients', placeholder: 'SaaS startups, e-commerce businesses', type: 'input' },
    ],
  },
  {
    id: 'mentor',
    icon: '🧭',
    label: 'Mentor Finder',
    color: '#39e87a',
    endpoint: 'mentorFinder',
    fields: [
      { key: 'mentee_info', label: 'About You', placeholder: 'Mahabub, AI Engineer from Bangladesh, 1 year experience, want to grow into senior LLM Engineer', type: 'textarea', rows: 3, required: true },
      { key: 'mentor_type', label: 'Mentor Type', placeholder: 'Senior LLM Engineer / AI Startup Founder', type: 'input', required: true },
      { key: 'goals', label: 'Your Goals', placeholder: 'Land a job at top AI company, improve system design skills', type: 'textarea', rows: 2, required: true },
      { key: 'platform', label: 'Platform', placeholder: 'LinkedIn / ADPList / MentorCruise', type: 'input' },
    ],
  },
]

const endpointMap: Record<string, string> = {
  referralRequest: 'referral-request',
  recommendationLetter: 'recommendation-letter',
  noc: 'noc',
  freelanceProfile: 'freelance-profile',
  mentorFinder: 'mentor-finder',
}

export default function NetworkingPage() {
  const [activeTool, setActiveTool] = useState<Tool>(tools[0])
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleToolChange(tool: Tool) {
    setActiveTool(tool)
    setFormData({})
    setResult('')
  }

  function setField(key: string, value: string) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult('')
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      }

      const endpoint = endpointMap[activeTool.endpoint]
      const res = await fetch(`${API_URL}/api/v1/writing/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResult(data.result)
    } catch (err: any) {
      setResult('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputCls = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors'
  const labelCls = 'text-[#7a96b0] text-xs font-medium block mb-1.5'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Networking + Freelance Tools</h1>
        <p className="text-[#4a6680] text-sm mt-1">
          5 AI-powered tools — referrals, certificates, freelance profiles, mentorship
        </p>
      </div>

      <div className="grid grid-cols-4 gap-5">

        {/* Tool Selector */}
        <div className="space-y-2">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => handleToolChange(tool)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left border ${
                activeTool.id === tool.id
                  ? 'text-black border-transparent'
                  : 'bg-[#0c1018] border-[#1e2838] text-[#7a96b0] hover:text-white hover:border-[#263040]'
              }`}
              style={activeTool.id === tool.id ? {
                background: tool.color,
                border: `1px solid ${tool.color}`,
              } : {}}
            >
              <span className="text-lg">{tool.icon}</span>
              <span>{tool.label}</span>
            </button>
          ))}
        </div>

        {/* Form + Result */}
        <div className="col-span-3 space-y-5">

          {/* Form */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">{activeTool.icon}</span>
              <div>
                <div className="text-base font-bold text-white">{activeTool.label}</div>
                <div className="text-xs text-[#4a6680]">Fill in the details below</div>
              </div>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {activeTool.fields.map(field => (
                  <div
                    key={field.key}
                    className={field.type === 'textarea' && (field.rows || 0) >= 3 ? 'col-span-2' : ''}
                  >
                    <label className={labelCls}>
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        className={inputCls}
                        value={formData[field.key] || ''}
                        onChange={e => setField(field.key, e.target.value)}
                        required={field.required}
                      >
                        <option value="">Select platform...</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        className={inputCls + ' resize-none'}
                        rows={field.rows || 3}
                        placeholder={field.placeholder}
                        value={formData[field.key] || ''}
                        onChange={e => setField(field.key, e.target.value)}
                        required={field.required}
                      />
                    ) : (
                      <input
                        type="text"
                        className={inputCls}
                        placeholder={field.placeholder}
                        value={formData[field.key] || ''}
                        onChange={e => setField(field.key, e.target.value)}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{
                  background: loading ? '#1e2838' : activeTool.color,
                  color: loading ? '#4a6680' : '#000',
                }}
              >
                {loading ? (
                  <><span className="animate-spin inline-block">⚡</span> Generating...</>
                ) : (
                  `✨ Generate ${activeTool.label}`
                )}
              </button>
            </form>
          </div>

          {/* Result */}
          {result && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold text-white">Generated Result</div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#111620] border border-[#1e2838] text-[#7a96b0] hover:text-white transition-colors"
                  >
                    {copied ? '✅ Copied!' : '📋 Copy'}
                  </button>
                  <button
                    onClick={() => setResult('')}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#111620] border border-[#1e2838] text-[#7a96b0] hover:text-red-400 transition-colors"
                  >
                    ✕ Clear
                  </button>
                </div>
              </div>
              <div className="bg-[#111620] border border-[#1e2838] rounded-lg p-4 whitespace-pre-wrap text-sm text-[#c8d8e8] leading-relaxed font-mono">
                {result}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}