'use client'
import { useState, useEffect } from 'react'
import { analyticsApi } from '@/lib/api'

interface NewsArticle {
  title: string
  summary: string
  category: string
  relevance: string
  source: string
  why_relevant: string
  key_takeaway: string
  tags: string[]
}

interface NewsData {
  industry: string
  generated_at: string
  articles: NewsArticle[]
  weekly_trend: string
  hot_skills: string[]
}

const CATEGORY_COLORS: Record<string, string> = {
  'AI/ML': '#00f0c8',
  'Industry Trend': '#9b7bff',
  'Career Insight': '#39e87a',
  'Technology': '#4d9fff',
  'Job Market': '#ffd84d',
  'Skill Update': '#ff7c4d',
}

export default function IndustryNewsPage() {
  const [skills, setSkills] = useState<any[]>([])
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [news, setNews] = useState<NewsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [industry, setIndustry] = useState('')
  const [filter, setFilter] = useState('all')
  const [saved, setSaved] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('saved_news') || '[]') } catch { return [] }
  })

  useEffect(() => {
    async function load() {
      try {
        const data = await analyticsApi.getSkills()
        setSkills(data)
      } catch (e) { console.error(e) }
      finally { setFetching(false) }

      // Load cached news
      const cached = localStorage.getItem('industry_news')
      const cachedTime = localStorage.getItem('industry_news_time')
      if (cached && cachedTime) {
        const hoursSince = (Date.now() - parseInt(cachedTime)) / 3600000
        if (hoursSince < 12) {
          setNews(JSON.parse(cached))
        }
      }
    }
    load()
  }, [])

  useEffect(() => {
    localStorage.setItem('saved_news', JSON.stringify(saved))
  }, [saved])

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/industry-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skills: skills.map(s => s.skill_name),
          industry: industry || 'Technology',
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setNews(data.news)
      localStorage.setItem('industry_news', JSON.stringify(data.news))
      localStorage.setItem('industry_news_time', Date.now().toString())
    } catch (e: any) {
      setError('Failed to fetch news: ' + e?.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleSave(title: string) {
    setSaved(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title])
  }

  const categories = news ? ['all', ...new Set(news.articles.map(a => a.category))] : ['all']
  const filtered = news?.articles.filter(a => filter === 'all' || a.category === filter) || []
  const inputCls = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#4d9fff] transition-colors'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">📰</span>
            <h1 className="text-2xl font-bold text-white">Industry News</h1>
          </div>
          <p className="text-[#4a6680] text-sm ml-12">AI-curated news and trends relevant to your career</p>
        </div>
        {news && (
          <div className="text-xs text-[#4a6680]">
            Last updated: {new Date(news.generated_at).toLocaleString()}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4 mb-6">
        <div className="grid grid-cols-3 gap-4 items-end">
          <div className="col-span-2">
            <label className="text-xs font-bold text-white block mb-2">
              Industry / Field
              <span className="text-[#4a6680] font-normal ml-2">Leave blank to auto-detect from your skills</span>
            </label>
            <input className={inputCls}
              placeholder="e.g. AI/ML, Web Development, Data Science, Fintech..."
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()} />
          </div>
          <button onClick={handleGenerate}
            disabled={loading || fetching}
            className="w-full bg-[#4d9fff] text-white font-bold py-2.5 rounded-xl text-sm hover:brightness-110 transition-all disabled:opacity-40">
            {loading ? '⚡ Fetching...' : '📰 Get News'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#ff5c9c11] border border-[#ff5c9c44] rounded-xl p-3 text-sm text-[#ff5c9c] mb-4">
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4 animate-pulse">📰</div>
          <div className="text-white font-bold mb-2">Fetching latest news...</div>
          <div className="text-xs text-[#4a6680]">AI is curating relevant articles for your field</div>
        </div>
      )}

      {/* News Content */}
      {!loading && news && (
        <div className="space-y-5">
          {/* Trend & Hot Skills */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-[#4d9fff]/10 to-[#9b7bff]/10 border border-[#4d9fff]/20 rounded-xl p-4">
              <div className="text-xs font-bold text-[#4d9fff] mb-2">📈 Weekly Trend</div>
              <p className="text-sm text-[#7a96b0] leading-relaxed">{news.weekly_trend}</p>
            </div>
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
              <div className="text-xs font-bold text-[#ff7c4d] mb-2">🔥 Hot Skills This Week</div>
              <div className="flex flex-wrap gap-2">
                {news.hot_skills.map((skill, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-[#ff7c4d15] border border-[#ff7c4d33] text-[#ff7c4d]">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all capitalize ${
                  filter === cat
                    ? 'bg-[#4d9fff] text-white border-[#4d9fff]'
                    : 'bg-[#0c1018] border-[#1e2838] text-[#7a96b0] hover:border-[#263040]'
                }`}>
                {cat === 'all' ? `All (${news.articles.length})` : cat}
              </button>
            ))}
            {saved.length > 0 && (
              <button onClick={() => setFilter('saved')}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  filter === 'saved'
                    ? 'bg-[#ffd84d] text-black border-[#ffd84d]'
                    : 'bg-[#0c1018] border-[#1e2838] text-[#7a96b0] hover:border-[#263040]'
                }`}>
                🔖 Saved ({saved.length})
              </button>
            )}
          </div>

          {/* Articles */}
          <div className="grid grid-cols-2 gap-4">
            {(filter === 'saved'
              ? news.articles.filter(a => saved.includes(a.title))
              : filtered
            ).map((article, i) => {
              const color = CATEGORY_COLORS[article.category] || '#4d9fff'
              const isSaved = saved.includes(article.title)
              return (
                <div key={i} className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-5 hover:border-[#263040] transition-all relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
                        {article.category}
                      </span>
                      <span className="text-[10px] text-[#4a6680]">{article.source}</span>
                    </div>
                    <button onClick={() => toggleSave(article.title)}
                      className={`text-sm transition-all ${isSaved ? 'text-[#ffd84d]' : 'text-[#4a6680] hover:text-[#ffd84d]'}`}
                      title={isSaved ? 'Unsave' : 'Save'}>
                      {isSaved ? '🔖' : '🏷️'}
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-2 leading-snug">{article.title}</h3>
                  <p className="text-xs text-[#7a96b0] leading-relaxed mb-3">{article.summary}</p>

                  {/* Why relevant */}
                  <div className="bg-[#111620] border border-[#1e2838] rounded-lg p-2.5 mb-3">
                    <div className="text-[10px] font-bold text-[#4d9fff] mb-1">🎯 Why it matters to you</div>
                    <p className="text-[10px] text-[#7a96b0] leading-relaxed">{article.why_relevant}</p>
                  </div>

                  {/* Key takeaway */}
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-[10px] font-bold text-[#39e87a] flex-shrink-0">💡 Takeaway:</span>
                    <p className="text-[10px] text-[#7a96b0] leading-relaxed">{article.key_takeaway}</p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {article.tags.map((tag, ti) => (
                      <span key={ti} className="text-[9px] px-2 py-0.5 rounded-full bg-[#1e2838] text-[#4a6680]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !news && (
        <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-16 text-center">
          <div className="text-5xl mb-4">📰</div>
          <div className="text-white font-bold text-lg mb-2">Stay ahead of the curve</div>
          <p className="text-[#4a6680] text-sm mb-6">
            Get AI-curated industry news and trends relevant to your skills and career
          </p>
          <button onClick={handleGenerate} disabled={loading || fetching}
            className="bg-[#4d9fff] text-white font-bold px-6 py-3 rounded-lg text-sm disabled:opacity-40">
            📰 Get Latest News
          </button>
        </div>
      )}
    </div>
  )
}