'use client'
import { useState, useEffect, useRef } from 'react'
import { knowledgeApi } from '@/lib/api'

type Message = {
  role: 'user' | 'assistant'
  content: string
  sources?: { title: string; score: number }[]
}

type Session = { id: string; title: string; created_at: string }
type Document = { id: string; title: string; source_type: string; chunk_count: number }
type Tab = 'chat' | 'documents'

export default function ChatPage() {
  const [tab, setTab] = useState<Tab>('chat')
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadTab, setUploadTab] = useState<'pdf' | 'text' | 'url'>('pdf')
  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [urlTitle, setUrlTitle] = useState('')
  const [useRag, setUseRag] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSessions()
    fetchDocuments()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchSessions() {
    try {
      const data = await knowledgeApi.listSessions()
      setSessions(data)
    } catch (e) { console.error(e) }
  }

  async function fetchDocuments() {
    try {
      const data = await knowledgeApi.listDocuments()
      setDocuments(data)
    } catch (e) { console.error(e) }
  }

  async function handleSelectSession(sessionId: string) {
    setActiveSession(sessionId)
    try {
      const msgs = await knowledgeApi.getMessages(sessionId)
      setMessages(msgs)
    } catch (e) { console.error(e) }
  }

  async function handleNewChat() {
    setActiveSession(null)
    setMessages([])
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await knowledgeApi.chat(input, activeSession || undefined, useRag)
      if (!activeSession) {
        setActiveSession(res.session_id)
        await fetchSessions()
      }
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.message,
        sources: res.sources,
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error: ' + e.message
      }])
    } finally {
      setLoading(false)
    }
  }

  async function handlePDFUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const title = file.name.replace('.pdf', '')
    setUploading(true)
    try {
      await knowledgeApi.uploadPDF(file, title)
      await fetchDocuments()
      alert('PDF uploaded successfully!')
    } catch (err: any) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleTextUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!textContent.trim()) return
    setUploading(true)
    try {
      await knowledgeApi.uploadText(textTitle || 'Text Document', textContent)
      await fetchDocuments()
      setTextTitle('')
      setTextContent('')
      alert('Text uploaded!')
    } catch (err: any) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleURLUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!urlInput.trim()) return
    setUploading(true)
    try {
      await knowledgeApi.uploadURL(urlInput, urlTitle || urlInput)
      await fetchDocuments()
      setUrlInput('')
      setUrlTitle('')
      alert('URL processed!')
    } catch (err: any) {
      alert('Failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteDocument(id: string) {
    await knowledgeApi.deleteDocument(id)
    await fetchDocuments()
  }

  async function handleDeleteSession(id: string) {
    await knowledgeApi.deleteSession(id)
    if (activeSession === id) {
      setActiveSession(null)
      setMessages([])
    }
    await fetchSessions()
  }

  const srcIcon = (t: string) => t === 'pdf' ? '📄' : t === 'url' ? '🌐' : '📝'
  const inputCls = "w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors"

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
          <p className="text-[#4a6680] text-sm mt-1">RAG-powered · Bengali + English · {documents.length} documents</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('chat')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'chat' ? 'bg-[#00f0c8] text-black' : 'bg-[#0c1018] border border-[#1e2838] text-[#7a96b0]'}`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setTab('documents')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'documents' ? 'bg-[#00f0c8] text-black' : 'bg-[#0c1018] border border-[#1e2838] text-[#7a96b0]'}`}
          >
            📚 Documents {documents.length > 0 && `(${documents.length})`}
          </button>
        </div>
      </div>

      {/* CHAT TAB */}
      {tab === 'chat' && (
        <div className="grid grid-cols-4 gap-4" style={{ height: 'calc(100vh - 200px)' }}>

          {/* Sessions sidebar */}
          <div className="col-span-1 bg-[#0c1018] border border-[#1e2838] rounded-xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-[#1e2838] flex items-center justify-between">
              <span className="text-xs font-bold text-[#7a96b0] uppercase tracking-wide">Conversations</span>
              <button
                onClick={handleNewChat}
                className="text-xs text-[#00f0c8] hover:underline"
              >
                + New
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="p-4 text-center text-[#4a6680] text-xs">No conversations yet</div>
              ) : (
                sessions.map(s => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSession(s.id)}
                    className={`p-3 border-b border-[#1e2838] cursor-pointer transition-all group ${activeSession === s.id ? 'bg-[#00f0c8]/10' : 'hover:bg-[#111620]'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-medium text-white truncate flex-1">{s.title}</div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteSession(s.id) }}
                        className="text-[#4a6680] hover:text-red-400 opacity-0 group-hover:opacity-100 text-xs flex-shrink-0"
                      >✕</button>
                    </div>
                    <div className="text-[10px] text-[#4a6680] mt-1">
                      {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="col-span-3 bg-[#0c1018] border border-[#1e2838] rounded-xl overflow-hidden flex flex-col">
            {/* Chat header */}
            <div className="p-4 border-b border-[#1e2838] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00f0c8] to-[#4d9fff] flex items-center justify-center text-black font-bold text-sm">⚡</div>
                <div>
                  <div className="text-sm font-bold text-white">CareerForge AI</div>
                  <div className="text-xs text-[#4a6680]">Powered by LLaMA 3.3 70B + RAG</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#4a6680]">Use Documents</span>
                <button
                  onClick={() => setUseRag(!useRag)}
                  className={`w-10 h-5 rounded-full transition-all relative ${useRag ? 'bg-[#00f0c8]' : 'bg-[#1e2838]'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${useRag ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">💬</div>
                  <div className="text-white font-bold mb-2">Ask me anything!</div>
                  <div className="text-[#4a6680] text-sm">Career advice · Resume help · Interview prep</div>
                  <div className="text-[#4a6680] text-sm">বাংলায় জিজ্ঞেস করতে পারেন</div>
                  <div className="grid grid-cols-2 gap-2 mt-6 max-w-md mx-auto">
                    {[
                      'আমার resume কিভাবে improve করব?',
                      'Google interview এর জন্য কিভাবে prepare করব?',
                      'LLM Engineer হতে কী কী skills লাগবে?',
                      'Salary negotiation কিভাবে করব?',
                    ].map(q => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="text-left text-xs bg-[#111620] border border-[#1e2838] rounded-lg p-3 text-[#7a96b0] hover:text-white hover:border-[#263040] transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    msg.role === 'assistant'
                      ? 'bg-gradient-to-br from-[#00f0c8] to-[#4d9fff] text-black'
                      : 'bg-[#1e2838] text-white'
                  }`}>
                    {msg.role === 'assistant' ? '⚡' : 'M'}
                  </div>
                  <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed ${
                      msg.role === 'assistant'
                        ? 'bg-[#111620] border border-[#1e2838] text-white'
                        : 'bg-[#00f0c8]/10 border border-[#00f0c8]/20 text-white'
                    }`}>
                      {msg.content}
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {msg.sources.map((s, j) => (
                          <span key={j} className="text-[10px] bg-[#0c1018] border border-[#1e2838] text-[#4a6680] px-2 py-0.5 rounded">
                            📄 {s.title} ({Math.round(s.score * 100)}%)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00f0c8] to-[#4d9fff] flex items-center justify-center text-black font-bold text-sm flex-shrink-0">⚡</div>
                  <div className="bg-[#111620] border border-[#1e2838] rounded-xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[#00f0c8] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-[#00f0c8] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-[#00f0c8] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#1e2838]">
              <form onSubmit={handleSend} className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask anything... বাংলায় জিজ্ঞেস করুন..."
                  disabled={loading}
                  className="flex-1 bg-[#111620] border border-[#1e2838] rounded-xl px-4 py-3 text-sm text-white placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="bg-[#00f0c8] text-black font-bold px-5 py-3 rounded-xl text-sm hover:bg-white transition-colors disabled:opacity-40"
                >
                  ⮐
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENTS TAB */}
      {tab === 'documents' && (
        <div className="grid grid-cols-2 gap-5">

          {/* Upload */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6">
            <div className="text-sm font-bold text-white mb-4">Upload Document</div>

            {/* Upload tabs */}
            <div className="flex gap-1 mb-5 bg-[#111620] rounded-lg p-1">
              {(['pdf', 'text', 'url'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setUploadTab(t)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${uploadTab === t ? 'bg-[#00f0c8] text-black' : 'text-[#7a96b0]'}`}
                >
                  {t === 'pdf' ? '📄 PDF' : t === 'text' ? '📝 Text' : '🌐 URL'}
                </button>
              ))}
            </div>

            {/* PDF Upload */}
            {uploadTab === 'pdf' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handlePDFUpload}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#1e2838] rounded-xl p-8 text-center cursor-pointer hover:border-[#00f0c8]/40 transition-all"
                >
                  <div className="text-3xl mb-2">📄</div>
                  <div className="text-white text-sm font-medium mb-1">
                    {uploading ? 'Uploading...' : 'Click to upload PDF'}
                  </div>
                  <div className="text-[#4a6680] text-xs">Max 10MB</div>
                </div>
              </div>
            )}

            {/* Text Upload */}
            {uploadTab === 'text' && (
              <form onSubmit={handleTextUpload} className="space-y-3">
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">Title</label>
                  <input
                    className={inputCls}
                    placeholder="Document title..."
                    value={textTitle}
                    onChange={e => setTextTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">Content *</label>
                  <textarea
                    className={inputCls + ' resize-none'}
                    rows={6}
                    placeholder="Paste your text here..."
                    value={textContent}
                    onChange={e => setTextContent(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-[#00f0c8] text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-40"
                >
                  {uploading ? 'Uploading...' : '📝 Upload Text'}
                </button>
              </form>
            )}

            {/* URL Upload */}
            {uploadTab === 'url' && (
              <form onSubmit={handleURLUpload} className="space-y-3">
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">URL *</label>
                  <input
                    className={inputCls}
                    placeholder="https://example.com/article"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">Title (optional)</label>
                  <input
                    className={inputCls}
                    placeholder="Article title..."
                    value={urlTitle}
                    onChange={e => setUrlTitle(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-[#9b7bff] text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-40"
                >
                  {uploading ? 'Processing...' : '🌐 Process URL'}
                </button>
              </form>
            )}
          </div>

          {/* Document List */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6">
            <div className="text-sm font-bold text-white mb-4">
              Knowledge Base ({documents.length} documents)
            </div>
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📚</div>
                <div className="text-white font-bold mb-2">No documents yet</div>
                <div className="text-[#4a6680] text-sm">Upload PDF, text, or URL to start</div>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 bg-[#111620] border border-[#1e2838] rounded-lg p-3">
                    <span className="text-xl flex-shrink-0">{srcIcon(doc.source_type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{doc.title}</div>
                      <div className="text-xs text-[#4a6680]">{doc.chunk_count} chunks · {doc.source_type}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="text-[#4a6680] hover:text-red-400 text-xs flex-shrink-0"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}