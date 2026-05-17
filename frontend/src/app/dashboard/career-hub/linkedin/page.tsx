'use client'
import { useState, useEffect } from 'react'
import { analyticsApi, jobsApi } from '@/lib/api'

interface SavedPost {
  id: string
  content: string
  type: string
  tone: string
  created_at: string
}

const POST_TYPES = [
  { id: 'job_search', label: '🔍 Job Search Update', desc: 'Share your job search journey' },
  { id: 'achievement', label: '🏆 Achievement', desc: 'Celebrate a win or milestone' },
  { id: 'skill_learned', label: '📚 Skill Learned', desc: 'Share something new you learned' },
  { id: 'interview_experience', label: '🎤 Interview Experience', desc: 'Share interview insights' },
  { id: 'weekly_reflection', label: '📅 Weekly Reflection', desc: 'Reflect on your week' },
  { id: 'career_tip', label: '💡 Career Tip', desc: 'Share a useful career tip' },
]

const TONES = [
  { id: 'professional', label: 'Professional', emoji: '👔' },
  { id: 'casual', label: 'Casual', emoji: '😊' },
  { id: 'inspiring', label: 'Inspiring', emoji: '🚀' },
  { id: 'storytelling', label: 'Storytelling', emoji: '📖' },
]

function ls<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

export default function LinkedInGeneratorPage() {
  const [overview, setOverview] = useState<any>(null)
  const [skills, setSkills] = useState<any[]>([])
  const [postType, setPostType] = useState('job_search')
  const [tone, setTone] = useState('professional')
  const [customContext, setCustomContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>(() => ls('linkedin_posts', []))
  const [activeTab, setActiveTab] = useState<'generate' | 'saved'>('generate')
  const [charCount, setCharCount] = useState(0)

  useEffect(() => {
    localStorage.setItem('linkedin_posts', JSON.stringify(savedPosts))
  }, [savedPosts])

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
    setCharCount(generated?.length || 0)
  }, [generated])

  async function handleGenerate() {
    setLoading(true)
    setGenerated(null)
    try {
      const context = {
        postType,
        tone,
        customContext,
        stats: overview ? {
          totalApps: overview.applications?.total || 0,
          weeklyApps: overview.applications?.weekly || 0,
          responseRate: overview.applications?.response_rate || 0,
          bestATS: overview.resumes?.best?.ats_score || 0,
        } : null,
        skills: skills.slice(0, 8).map(s => `${s.skill_name} (${s.level}%)`),
      }

      const res = await fetch('/api/linkedin-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setGenerated(data.content)
    } catch (e: any) {
      alert('Error: ' + e?.message)
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!generated) return
    navigator.clipboard.writeText(generated)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSave() {
    if (!generated) return
    const post: SavedPost = {
      id: Date.now().toString(),
      content: generated,
      type: postType,
      tone,
      created_at: new Date().toISOString(),
    }
    setSavedPosts(prev => [post, ...prev])
    alert('Post saved!')
  }

  function deletePost(id: string) {
    setSavedPosts(prev => prev.filter(p => p.id !== id))
  }

  function loadPost(post: SavedPost) {
    setGenerated(post.content)
    setPostType(post.type)
    setTone(post.tone)
    setActiveTab('generate')
  }

  const inputCls = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors'
  const charColor = charCount > 2800 ? '#ff5c9c' : charCount > 2000 ? '#ffd84d' : '#39e87a'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">💡</span>
            <h1 className="text-2xl font-bold text-white">LinkedIn Post Generator</h1>
          </div>
          <p className="text-[#4a6680] text-sm ml-12">AI generates engaging LinkedIn posts from your career data</p>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 bg-[#0c1018] border border-[#1e2838] rounded-xl p-1">
          <button onClick={() => setActiveTab('generate')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'generate' ? 'bg-[#00f0c8] text-black' : 'text-[#7a96b0] hover:text-white'}`}>
            ✨ Generate
          </button>
          <button onClick={() => setActiveTab('saved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'saved' ? 'bg-[#00f0c8] text-black' : 'text-[#7a96b0] hover:text-white'}`}>
            💾 Saved ({savedPosts.length})
          </button>
        </div>
      </div>

      {/* GENERATE TAB */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-2 gap-6">
          {/* LEFT — Controls */}
          <div className="space-y-5">
            {/* Post Type */}
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
              <div className="text-xs font-bold text-white mb-3">Post Type</div>
              <div className="space-y-2">
                {POST_TYPES.map(pt => (
                  <div key={pt.id} onClick={() => setPostType(pt.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${
                      postType === pt.id
                        ? 'border-[#00f0c8] bg-[#00f0c808]'
                        : 'border-transparent hover:bg-[#111620]'
                    }`}>
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${postType === pt.id ? 'border-[#00f0c8] bg-[#00f0c8]' : 'border-[#4a6680]'}`} />
                    <div>
                      <div className="text-xs font-bold text-white">{pt.label}</div>
                      <div className="text-[10px] text-[#4a6680]">{pt.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
              <div className="text-xs font-bold text-white mb-3">Tone</div>
              <div className="grid grid-cols-2 gap-2">
                {TONES.map(t => (
                  <button key={t.id} onClick={() => setTone(t.id)}
                    className={`py-2.5 rounded-lg text-xs font-bold border transition-all ${
                      tone === t.id
                        ? 'bg-[#9b7bff] border-[#9b7bff] text-white'
                        : 'bg-[#111620] border-[#1e2838] text-[#7a96b0] hover:border-[#263040]'
                    }`}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Context */}
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
              <div className="text-xs font-bold text-white mb-2">Additional Context <span className="text-[#4a6680] font-normal">(optional)</span></div>
              <textarea className={inputCls} rows={3}
                placeholder="e.g. Just got my first interview at Google, learned Docker this week, completed 50 applications..."
                value={customContext}
                onChange={e => setCustomContext(e.target.value)} />
            </div>

            {/* Data Preview */}
            {overview && (
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                <div className="text-xs font-bold text-white mb-3">📊 AI will use your data</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#4a6680]">Total Apps</span>
                    <span className="text-[#00f0c8] font-bold">{overview.applications?.total || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4a6680]">This Week</span>
                    <span className="text-[#00f0c8] font-bold">{overview.applications?.weekly || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4a6680]">Response Rate</span>
                    <span className="text-[#9b7bff] font-bold">{overview.applications?.response_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4a6680]">Skills</span>
                    <span className="text-[#39e87a] font-bold">{skills.length}</span>
                  </div>
                </div>
              </div>
            )}

            <button onClick={handleGenerate} disabled={loading}
              className="w-full bg-[#0a66c2] text-white font-bold py-3 rounded-xl text-sm hover:brightness-110 transition-all disabled:opacity-40">
              {loading ? '⚡ Generating...' : '💡 Generate LinkedIn Post'}
            </button>
          </div>

          {/* RIGHT — Preview */}
          <div className="space-y-4">
            {loading && (
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
                <div className="text-5xl mb-4 animate-pulse">💡</div>
                <div className="text-white font-bold mb-2">Crafting your post...</div>
                <div className="text-xs text-[#4a6680]">AI is writing an engaging LinkedIn post</div>
              </div>
            )}

            {!loading && generated && (
              <div className="space-y-3">
                {/* LinkedIn Preview Card */}
                <div className="bg-white rounded-2xl p-5 shadow-lg">
                  {/* Fake LinkedIn Profile */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0a66c2] to-[#00f0c8] flex items-center justify-center text-white font-bold text-sm">You</div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">Your Name</div>
                      <div className="text-xs text-gray-500">Job Seeker • Just now</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{generated}</div>
                  <div className="flex gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                    <span>👍 Like</span>
                    <span>💬 Comment</span>
                    <span>🔄 Repost</span>
                    <span>📤 Send</span>
                  </div>
                </div>

                {/* Char count */}
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: charColor }}>{charCount} characters</span>
                  <span className="text-[#4a6680]">LinkedIn limit: 3,000</span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button onClick={handleCopy}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${copied ? 'bg-[#39e87a] text-black' : 'bg-[#0a66c2] text-white hover:brightness-110'}`}>
                    {copied ? '✓ Copied!' : '📋 Copy Post'}
                  </button>
                  <button onClick={handleSave}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#111620] border border-[#1e2838] text-white hover:border-[#263040]">
                    💾 Save
                  </button>
                  <button onClick={handleGenerate} disabled={loading}
                    className="px-4 py-2.5 rounded-xl text-sm bg-[#111620] border border-[#1e2838] text-[#7a96b0] hover:text-white hover:border-[#263040]">
                    🔄
                  </button>
                </div>

                {/* Editable textarea */}
                <div>
                  <div className="text-xs text-[#4a6680] mb-2">✏️ Edit before posting:</div>
                  <textarea className={inputCls} rows={8}
                    value={generated}
                    onChange={e => setGenerated(e.target.value)} />
                </div>
              </div>
            )}

            {!loading && !generated && (
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
                <div className="text-5xl mb-4">💡</div>
                <div className="text-white font-bold text-lg mb-2">Ready to generate</div>
                <p className="text-[#4a6680] text-sm">Select a post type, choose your tone, and click Generate</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SAVED TAB */}
      {activeTab === 'saved' && (
        <div>
          {savedPosts.length === 0 ? (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-16 text-center">
              <div className="text-5xl mb-4">💾</div>
              <div className="text-white font-bold text-lg mb-2">No saved posts yet</div>
              <p className="text-[#4a6680] text-sm mb-6">Generate a post and save it to see it here</p>
              <button onClick={() => setActiveTab('generate')}
                className="bg-[#0a66c2] text-white font-bold px-6 py-3 rounded-lg text-sm">
                ✨ Generate Post
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {savedPosts.map(post => (
                <div key={post.id} className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#0a66c222] text-[#0a66c2] border border-[#0a66c244]">
                        {POST_TYPES.find(p => p.id === post.type)?.label || post.type}
                      </span>
                      <span className="text-xs text-[#4a6680] capitalize">{post.tone}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => loadPost(post)} className="text-xs text-[#00f0c8] hover:underline">Load</button>
                      <button onClick={() => { navigator.clipboard.writeText(post.content) }} className="text-xs text-[#4a6680] hover:text-white">Copy</button>
                      <button onClick={() => deletePost(post.id)} className="text-xs text-[#4a6680] hover:text-red-400">✕</button>
                    </div>
                  </div>
                  <p className="text-xs text-[#7a96b0] leading-relaxed line-clamp-4 whitespace-pre-wrap">{post.content}</p>
                  <div className="text-[10px] text-[#4a6680] mt-3">{new Date(post.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}