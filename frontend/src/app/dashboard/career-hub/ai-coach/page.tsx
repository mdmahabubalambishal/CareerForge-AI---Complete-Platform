'use client'
import { useState, useEffect, useRef } from 'react'
import { analyticsApi } from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const SUGGESTED_QUESTIONS = [
  'How can I improve my resume ATS score?',
  'What skills should I learn next?',
  'How do I negotiate salary?',
  'How to prepare for technical interviews?',
  'Should I apply to startups or big companies?',
  'How to handle job rejection?',
  'What makes a good cover letter?',
  'How to grow my professional network?',
]

function ls<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

export default function AICareerCoachPage() {
  const [messages, setMessages] = useState<Message[]>(() => ls('ai_coach_messages', []))
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [skills, setSkills] = useState<any[]>([])
  const [overview, setOverview] = useState<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const [ov, sk] = await Promise.all([
          analyticsApi.getOverview(),
          analyticsApi.getSkills(),
        ])
        setOverview(ov)
        setSkills(sk)
      } catch (e) { console.error(e) }
    }
    load()
  }, [])

  useEffect(() => {
    localStorage.setItem('ai_coach_messages', JSON.stringify(messages))
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(text?: string) {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          context: {
            skills: skills.map(s => `${s.skill_name} (${s.level}%)`).join(', '),
            totalApps: overview?.applications?.total || 0,
            responseRate: overview?.applications?.response_rate || 0,
            bestATS: overview?.resumes?.best?.ats_score || 0,
          }
        }),
      })
      const data = await res.json()
      if (data.error) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: '❌ Error: ' + data.error,
          timestamp: new Date().toISOString(),
        }])
        return
      }
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
      }])
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Network error: ' + e?.message,
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function clearChat() {
    setMessages([])
    localStorage.removeItem('ai_coach_messages')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🧠</span>
            <h1 className="text-2xl font-bold text-white">AI Career Coach</h1>
          </div>
          <p className="text-[#4a6680] text-sm ml-12">Your personal AI-powered career advisor — ask anything</p>
        </div>
        <div className="flex items-center gap-3">
          {skills.length > 0 && (
            <div className="text-xs px-3 py-1.5 rounded-full bg-[#00f0c815] border border-[#00f0c833] text-[#00f0c8]">
              {skills.length} skills
            </div>
          )}
          {overview && (
            <div className="text-xs px-3 py-1.5 rounded-full bg-[#9b7bff15] border border-[#9b7bff33] text-[#9b7bff]">
              {overview.applications?.total || 0} apps
            </div>
          )}
          {messages.length > 0 && (
            <button onClick={clearChat}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#111620] border border-[#1e2838] text-[#4a6680] hover:text-red-400 hover:border-red-400 transition-all">
              🗑 Clear
            </button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-[#0c1018] border border-[#1e2838] rounded-2xl flex flex-col overflow-hidden min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <div className="text-5xl mb-4">🧠</div>
              <div className="text-white font-bold text-lg mb-2">Hi! I'm your AI Career Coach</div>
              <p className="text-[#4a6680] text-sm mb-8 max-w-md">
                I know your skills, applications, and career data. Ask me anything about your job search, career growth, or professional development.
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-lg">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button key={i} onClick={() => handleSend(q)}
                    className="text-xs px-3 py-2.5 rounded-xl bg-[#111620] border border-[#1e2838] text-[#7a96b0] hover:border-[#00f0c8] hover:text-white text-left transition-all">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                {/* Avatar */}
                <div className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mb-1 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-[#00f0c8] to-[#9b7bff] text-black'
                      : 'bg-gradient-to-br from-[#ff7c4d] to-[#9b7bff] text-white'
                  }`}>
                    {msg.role === 'user' ? 'You' : '🧠'}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#00f0c8] text-black rounded-br-sm'
                      : 'bg-[#111620] border border-[#1e2838] text-white rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
                <div className={`text-[10px] text-[#4a6680] mt-1 ${msg.role === 'user' ? 'text-right pr-9' : 'pl-9'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff7c4d] to-[#9b7bff] flex items-center justify-center text-xs text-white">🧠</div>
                <div className="bg-[#111620] border border-[#1e2838] px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#4a6680] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#4a6680] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#4a6680] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-[#1e2838] p-4 flex-shrink-0 bg-[#0c1018]">
          {/* Suggested questions (when chat has messages) */}
          {messages.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
                <button key={i} onClick={() => handleSend(q)}
                  className="text-[10px] px-2.5 py-1.5 rounded-lg bg-[#111620] border border-[#1e2838] text-[#4a6680] hover:text-white hover:border-[#263040] transition-all whitespace-nowrap flex-shrink-0">
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your career coach anything... (Enter to send, Shift+Enter for new line)"
              rows={2}
              className="flex-1 bg-[#111620] border border-[#1e2838] rounded-xl px-4 py-3 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors resize-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="bg-[#00f0c8] text-black font-bold px-4 py-3 rounded-xl text-sm hover:brightness-110 transition-all disabled:opacity-40 flex-shrink-0"
            >
              Send →
            </button>
          </div>
          <div className="text-[10px] text-[#4a6680] mt-2 text-center">
            AI knows your {skills.length} skills and {overview?.applications?.total || 0} applications
          </div>
        </div>
      </div>
    </div>
  )
}