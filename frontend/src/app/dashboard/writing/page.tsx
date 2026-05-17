'use client'
import { useState } from 'react'
import { writingApi } from '@/lib/api'

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
  type: 'input' | 'textarea'
  rows?: number
  required?: boolean
}

const tools: Tool[] = [
  {
    id: 'cover-letter',
    icon: '✉️',
    label: 'Cover Letter',
    color: '#00f0c8',
    endpoint: 'coverLetter',
    fields: [
      { key: 'candidate_info', label: 'Your Info', placeholder: 'Name, skills, experience summary...', type: 'textarea', rows: 3, required: true },
      { key: 'target_role', label: 'Target Role', placeholder: 'e.g. LLM Engineer', type: 'input', required: true },
      { key: 'target_company', label: 'Company', placeholder: 'e.g. Google (optional)', type: 'input' },
      { key: 'job_description', label: 'Job Description', placeholder: 'Paste JD here for better results...', type: 'textarea', rows: 4 },
    ],
  },
  {
    id: 'sop',
    icon: '📜',
    label: 'SOP / Motivation Letter',
    color: '#9b7bff',
    endpoint: 'sop',
    fields: [
      { key: 'candidate_info', label: 'Your Background', placeholder: 'Education, experience, achievements...', type: 'textarea', rows: 3, required: true },
      { key: 'purpose', label: 'Purpose', placeholder: 'e.g. Masters admission, job application', type: 'input', required: true },
      { key: 'target', label: 'Institution / Company', placeholder: 'e.g. MIT, Google', type: 'input' },
      { key: 'program', label: 'Program / Role', placeholder: 'e.g. MS in CS, ML Engineer', type: 'input' },
    ],
  },
  {
    id: 'bio',
    icon: '👤',
    label: 'Bio Generator',
    color: '#ff7c4d',
    endpoint: 'bio',
    fields: [
      { key: 'candidate_info', label: 'Your Info', placeholder: 'Name, role, achievements, interests...', type: 'textarea', rows: 3, required: true },
      { key: 'platform', label: 'Platform', placeholder: 'LinkedIn / Twitter / Website / Conference', type: 'input', required: true },
      { key: 'style', label: 'Style', placeholder: 'LinkedIn / Twitter / Website / Conference', type: 'input' },
    ],
  },
  {
    id: 'cold-email',
    icon: '📨',
    label: 'Cold Email',
    color: '#39e87a',
    endpoint: 'coldEmail',
    fields: [
      { key: 'sender_info', label: 'Your Info', placeholder: 'Name, role, key skills...', type: 'textarea', rows: 2, required: true },
      { key: 'target_person', label: 'Target Person', placeholder: 'e.g. John Smith, Engineering Manager', type: 'input', required: true },
      { key: 'target_company', label: 'Target Company', placeholder: 'e.g. OpenAI', type: 'input', required: true },
      { key: 'goal', label: 'Goal', placeholder: 'e.g. Get a referral, ask for informational interview', type: 'input', required: true },
    ],
  },
  {
    id: 'thank-you-email',
    icon: '🙏',
    label: 'Thank You Email',
    color: '#ffd84d',
    endpoint: 'thankYouEmail',
    fields: [
      { key: 'candidate_info', label: 'Your Info', placeholder: 'Your name and role applied for...', type: 'input', required: true },
      { key: 'interviewer_name', label: 'Interviewer Name', placeholder: 'e.g. Sarah Johnson', type: 'input', required: true },
      { key: 'company', label: 'Company', placeholder: 'e.g. Google', type: 'input', required: true },
      { key: 'role', label: 'Role', placeholder: 'e.g. LLM Engineer', type: 'input', required: true },
      { key: 'topics', label: 'Topics Discussed', placeholder: 'e.g. RAG systems, team culture, growth plans', type: 'input' },
    ],
  },
  {
    id: 'salary-negotiation',
    icon: '💰',
    label: 'Salary Negotiation',
    color: '#4d9fff',
    endpoint: 'salaryNegotiation',
    fields: [
      { key: 'candidate_info', label: 'Your Info', placeholder: 'Name, role, years of experience...', type: 'input', required: true },
      { key: 'current_offer', label: 'Current Offer', placeholder: 'e.g. $120,000 / ৳150,000', type: 'input', required: true },
      { key: 'target_salary', label: 'Target Salary', placeholder: 'e.g. $145,000 / ৳180,000', type: 'input', required: true },
      { key: 'role', label: 'Role', placeholder: 'e.g. LLM Engineer', type: 'input', required: true },
      { key: 'company', label: 'Company', placeholder: 'e.g. Google', type: 'input', required: true },
      { key: 'justification', label: 'Justification', placeholder: 'Market rate, competing offers, unique skills...', type: 'textarea', rows: 2 },
    ],
  },
  {
    id: 'jd-translator',
    icon: '🌐',
    label: 'JD Translator',
    color: '#ff5c9c',
    endpoint: 'jdTranslator',
    fields: [
      { key: 'input_text', label: 'Job Description', placeholder: 'Paste the full job description here...', type: 'textarea', rows: 6, required: true },
      { key: 'task', label: 'Task', placeholder: 'translate to Bengali / simplify / translate to English', type: 'input' },
    ],
  },
]

export default function WritingPage() {
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
    // this binding সমস্যা fix — directly endpoint call করো
    let data
    switch (activeTool.endpoint) {
      case 'coverLetter':
        data = await writingApi.coverLetter(formData as any)
        break
      case 'sop':
        data = await writingApi.sop(formData as any)
        break
      case 'bio':
        data = await writingApi.bio(formData as any)
        break
      case 'coldEmail':
        data = await writingApi.coldEmail(formData as any)
        break
      case 'thankYouEmail':
        data = await writingApi.thankYouEmail(formData as any)
        break
      case 'salaryNegotiation':
        data = await writingApi.salaryNegotiation(formData as any)
        break
      case 'jdTranslator':
        data = await writingApi.jdTranslator(formData as any)
        break
      case 'networkingMessage':
        data = await writingApi.networkingMessage(formData as any)
        break
      default:
        throw new Error('Unknown tool')
    }
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

  const inputClass = "w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors"
  const labelClass = "text-[#7a96b0] text-xs font-medium block mb-1.5"

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">AI Writing Suite</h1>
        <p className="text-[#4a6680] text-sm mt-1">
          7 AI-powered tools — cover letters, emails, bios, and more
        </p>
      </div>

      <div className="grid grid-cols-4 gap-5">

        {/* Tool Selector */}
        <div className="col-span-1 space-y-2">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => handleToolChange(tool)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                activeTool.id === tool.id
                  ? 'text-black'
                  : 'bg-[#0c1018] border border-[#1e2838] text-[#7a96b0] hover:text-white hover:border-[#263040]'
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
                  <div key={field.key} className={field.type === 'textarea' && (field.rows || 0) >= 4 ? 'col-span-2' : ''}>
                    <label className={labelClass}>
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        className={inputClass + ' resize-none'}
                        rows={field.rows || 3}
                        placeholder={field.placeholder}
                        value={formData[field.key] || ''}
                        onChange={e => setField(field.key, e.target.value)}
                        required={field.required}
                      />
                    ) : (
                      <input
                        type="text"
                        className={inputClass}
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