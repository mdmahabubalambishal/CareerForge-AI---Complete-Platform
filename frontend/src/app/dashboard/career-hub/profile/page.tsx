'use client'
import { useState, useEffect } from 'react'
import { analyticsApi } from '@/lib/api'

interface ProfileData {
  name: string
  title: string
  bio: string
  location: string
  linkedin: string
  github: string
  website: string
  isPublic: boolean
  slug: string
  showStats: boolean
  showSkills: boolean
  showAchievements: boolean
}

const DEFAULT_PROFILE: ProfileData = {
  name: '',
  title: '',
  bio: '',
  location: '',
  linkedin: '',
  github: '',
  website: '',
  isPublic: false,
  slug: '',
  showStats: true,
  showSkills: true,
  showAchievements: true,
}

function ls<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6)
}

export default function ShareableProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(() => ls('shareable_profile', DEFAULT_PROFILE))
  const [overview, setOverview] = useState<any>(null)
  const [skills, setSkills] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

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
      finally { setLoading(false) }
    }
    load()
  }, [])

  useEffect(() => {
    localStorage.setItem('shareable_profile', JSON.stringify(profile))
  }, [profile])

  async function handleSave() {
    if (!profile.name) { alert('Please enter your name first.'); return }

    let currentSlug = profile.slug
    if (!currentSlug) {
      currentSlug = generateSlug(profile.name)
      setProfile(p => ({ ...p, slug: currentSlug }))
    }

    try {
      const res = await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: currentSlug,
          name: profile.name,
          title: profile.title,
          bio: profile.bio,
          location: profile.location,
          linkedin: profile.linkedin,
          github: profile.github,
          website: profile.website,
          show_stats: profile.showStats,
          show_skills: profile.showSkills,
          show_achievements: profile.showAchievements,
          is_public: profile.isPublic,
        }),
      })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      alert('Failed to save: ' + e?.message)
    }
  }

  function handleCopyLink() {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${origin}/profile/${profile.slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleRegenerateSlug() {
    setProfile(p => ({ ...p, slug: generateSlug(p.name || 'user') }))
  }

  const inputCls = 'w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors'

  const achievements = [
    { icon: '🚀', label: 'First Step', earned: (overview?.applications?.total || 0) >= 1 },
    { icon: '🔥', label: 'On a Roll', earned: (overview?.applications?.weekly || 0) >= 5 },
    { icon: '💯', label: 'ATS Master', earned: (overview?.resumes?.best?.ats_score || 0) >= 90 },
    { icon: '📬', label: 'Networker', earned: (overview?.applications?.response_rate || 0) >= 20 },
    { icon: '🎯', label: 'Skill Hunter', earned: skills.length >= 5 },
    { icon: '🧙', label: 'Expert', earned: skills.some(s => s.level >= 80) },
    { icon: '📅', label: 'Consistent', earned: (overview?.applications?.total || 0) >= 10 },
    { icon: '🏆', label: 'Interview Pro', earned: !!(overview?.applications?.by_status?.interviewing > 0) },
  ].filter(a => a.earned)

  const levelColor = (l: number) => l >= 80 ? '#39e87a' : l >= 60 ? '#00f0c8' : l >= 40 ? '#ffd84d' : '#ff7c4d'
  const levelLabel = (l: number) => l >= 80 ? 'Expert' : l >= 60 ? 'Advanced' : l >= 40 ? 'Intermediate' : 'Beginner'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🌐</span>
            <h1 className="text-2xl font-bold text-white">My Profile</h1>
          </div>
          <p className="text-[#4a6680] text-sm ml-12">Share your job search journey with a public profile page</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Public toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#4a6680]">{profile.isPublic ? 'Public' : 'Private'}</span>
            <div onClick={() => setProfile(p => ({ ...p, isPublic: !p.isPublic }))}
              className={`w-10 h-5 rounded-full cursor-pointer transition-all relative ${profile.isPublic ? 'bg-[#39e87a]' : 'bg-[#1e2838]'}`}>
              <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${profile.isPublic ? 'left-5' : 'left-0.5'}`} />
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 bg-[#0c1018] border border-[#1e2838] rounded-xl p-1">
            <button onClick={() => setActiveTab('edit')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'edit' ? 'bg-[#00f0c8] text-black' : 'text-[#7a96b0] hover:text-white'}`}>
              ✏️ Edit
            </button>
            <button onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'preview' ? 'bg-[#00f0c8] text-black' : 'text-[#7a96b0] hover:text-white'}`}>
              👁 Preview
            </button>
          </div>
        </div>
      </div>

      {/* EDIT TAB */}
      {activeTab === 'edit' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
              <div className="text-sm font-bold text-white mb-4">👤 Basic Info</div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">Full Name *</label>
                  <input className={inputCls} placeholder="John Doe" value={profile.name}
                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">Title / Role</label>
                  <input className={inputCls} placeholder="e.g. Full Stack Developer" value={profile.title}
                    onChange={e => setProfile(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">Bio</label>
                  <textarea className={inputCls} rows={3}
                    placeholder="A brief description about yourself and your career goals..."
                    value={profile.bio}
                    onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">Location</label>
                  <input className={inputCls} placeholder="e.g. Dhaka, Bangladesh" value={profile.location}
                    onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
              <div className="text-sm font-bold text-white mb-4">🔗 Links</div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">LinkedIn URL</label>
                  <input className={inputCls} placeholder="https://linkedin.com/in/yourname" value={profile.linkedin}
                    onChange={e => setProfile(p => ({ ...p, linkedin: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">GitHub URL</label>
                  <input className={inputCls} placeholder="https://github.com/yourname" value={profile.github}
                    onChange={e => setProfile(p => ({ ...p, github: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[#7a96b0] block mb-1.5">Website / Portfolio</label>
                  <input className={inputCls} placeholder="https://yourwebsite.com" value={profile.website}
                    onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            {/* Visibility */}
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
              <div className="text-sm font-bold text-white mb-4">👁 What to show</div>
              <div className="space-y-3">
                {[
                  { key: 'showStats', label: '📊 Career Stats', desc: 'Applications, response rate, ATS score' },
                  { key: 'showSkills', label: '📈 Skills', desc: 'Your tracked skills and levels' },
                  { key: 'showAchievements', label: '🏆 Achievements', desc: 'Earned badges and milestones' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-[#111620] rounded-lg">
                    <div>
                      <div className="text-xs font-bold text-white">{item.label}</div>
                      <div className="text-[10px] text-[#4a6680]">{item.desc}</div>
                    </div>
                    <div onClick={() => setProfile(p => ({ ...p, [item.key]: !p[item.key as keyof ProfileData] }))}
                      className={`w-10 h-5 rounded-full cursor-pointer transition-all relative flex-shrink-0 ${profile[item.key as keyof ProfileData] ? 'bg-[#00f0c8]' : 'bg-[#1e2838]'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${profile[item.key as keyof ProfileData] ? 'left-5' : 'left-0.5'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* URL Slug */}
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
              <div className="text-sm font-bold text-white mb-4">🔗 Public URL</div>
              <div className="bg-[#111620] border border-[#1e2838] rounded-lg p-3 mb-3">
                <div className="text-xs text-[#4a6680] mb-1">Your profile URL:</div>
                <div className="text-xs text-[#00f0c8] break-all">
                  {profile.slug
                    ? `/profile/${profile.slug}`
                    : 'Save your profile to generate a URL'}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCopyLink} disabled={!profile.slug}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-[#39e87a] text-black' : 'bg-[#111620] border border-[#1e2838] text-white hover:border-[#263040] disabled:opacity-40'}`}>
                  {copied ? '✓ Copied!' : '📋 Copy Link'}
                </button>
                <button onClick={handleRegenerateSlug}
                  className="px-3 py-2 rounded-lg text-xs bg-[#111620] border border-[#1e2838] text-[#7a96b0] hover:text-white hover:border-[#263040]">
                  🔄 New URL
                </button>
              </div>
            </div>

            {/* Save */}
            <button onClick={handleSave}
              className="w-full bg-[#00f0c8] text-black font-bold py-3 rounded-xl text-sm hover:brightness-110 transition-all">
              {saved ? '✓ Saved!' : '💾 Save Profile'}
            </button>

            {/* Status */}
            <div className={`p-4 rounded-xl border text-center ${profile.isPublic ? 'border-[#39e87a44] bg-[#39e87a08]' : 'border-[#1e2838] bg-[#0c1018]'}`}>
              <div className={`text-sm font-bold mb-1 ${profile.isPublic ? 'text-[#39e87a]' : 'text-[#4a6680]'}`}>
                {profile.isPublic ? '🌐 Profile is Public' : '🔒 Profile is Private'}
              </div>
              <div className="text-xs text-[#4a6680]">
                {profile.isPublic ? 'Anyone with the link can view your profile' : 'Only you can see this profile'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW TAB */}
      {activeTab === 'preview' && (
        <div className="max-w-2xl mx-auto">
          {/* Profile Card */}
          <div className="bg-gradient-to-br from-[#0c1018] to-[#111620] border border-[#1e2838] rounded-2xl overflow-hidden">
            {/* Banner */}
            <div className="h-24 bg-gradient-to-r from-[#00f0c8] via-[#9b7bff] to-[#ff7c4d] opacity-60" />

            {/* Avatar & Name */}
            <div className="px-6 pb-6">
              <div className="-mt-10 mb-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00f0c8] to-[#9b7bff] flex items-center justify-center text-black font-bold text-2xl border-4 border-[#0c1018]">
                  {profile.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                </div>
              </div>

              <h2 className="text-xl font-bold text-white">{profile.name || 'Your Name'}</h2>
              <div className="text-sm text-[#00f0c8] mt-0.5">{profile.title || 'Your Title'}</div>
              {profile.location && <div className="text-xs text-[#4a6680] mt-1">📍 {profile.location}</div>}
              {profile.bio && <p className="text-sm text-[#7a96b0] mt-3 leading-relaxed">{profile.bio}</p>}

              {/* Links */}
              {(profile.linkedin || profile.github || profile.website) && (
                <div className="flex gap-3 mt-4">
                  {profile.linkedin && (
                    <a href={profile.linkedin} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg bg-[#0a66c222] border border-[#0a66c244] text-[#0a66c2] hover:bg-[#0a66c233]">
                      LinkedIn
                    </a>
                  )}
                  {profile.github && (
                    <a href={profile.github} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg bg-[#1e2838] border border-[#263040] text-white hover:bg-[#263040]">
                      GitHub
                    </a>
                  )}
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg bg-[#00f0c822] border border-[#00f0c844] text-[#00f0c8] hover:bg-[#00f0c833]">
                      Portfolio
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Stats */}
            {profile.showStats && overview && (
              <div className="px-6 pb-6">
                <div className="text-xs font-bold text-[#4a6680] uppercase tracking-wide mb-3">📊 Career Stats</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Applications', value: overview.applications?.total || 0, color: '#00f0c8' },
                    { label: 'Response Rate', value: `${overview.applications?.response_rate || 0}%`, color: '#9b7bff' },
                    { label: 'Best ATS', value: `${overview.resumes?.best?.ats_score || 0}%`, color: '#ff7c4d' },
                  ].map((s, i) => (
                    <div key={i} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-3 text-center">
                      <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[10px] text-[#4a6680] mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {profile.showSkills && skills.length > 0 && (
              <div className="px-6 pb-6">
                <div className="text-xs font-bold text-[#4a6680] uppercase tracking-wide mb-3">📈 Skills</div>
                <div className="space-y-2">
                  {skills.slice(0, 6).map(s => (
                    <div key={s.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white">{s.skill_name}</span>
                        <span style={{ color: levelColor(s.level) }}>{s.level}% — {levelLabel(s.level)}</span>
                      </div>
                      <div className="h-1.5 bg-[#1e2838] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.level}%`, background: levelColor(s.level) }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements */}
            {profile.showAchievements && achievements.length > 0 && (
              <div className="px-6 pb-6">
                <div className="text-xs font-bold text-[#4a6680] uppercase tracking-wide mb-3">🏆 Achievements</div>
                <div className="flex flex-wrap gap-2">
                  {achievements.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ffd84d15] border border-[#ffd84d33] text-xs">
                      <span>{a.icon}</span>
                      <span className="text-[#ffd84d] font-bold">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#1e2838] flex items-center justify-between">
              <div className="text-xs text-[#4a6680]">Made with CareerForge AI</div>
              {!profile.isPublic && (
                <div className="text-xs text-[#ff5c9c] font-bold">🔒 Private — not visible to others</div>
              )}
            </div>
          </div>

          {/* Share buttons */}
          {profile.isPublic && profile.slug && (
            <div className="mt-4 flex gap-3">
              <button onClick={handleCopyLink}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${copied ? 'bg-[#39e87a] text-black' : 'bg-[#00f0c8] text-black hover:brightness-110'}`}>
                {copied ? '✓ Link Copied!' : '🔗 Copy Profile Link'}
              </button>
              <a href={`/profile/${profile.slug}`} target="_blank" rel="noopener noreferrer"
                className="px-5 py-3 rounded-xl text-sm font-bold bg-[#111620] border border-[#1e2838] text-white hover:border-[#263040] text-center">
                🌐 Open
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}