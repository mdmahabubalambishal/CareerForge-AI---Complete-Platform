'use client'
// app/profile/[slug]/page.tsx
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface PublicProfile {
  name: string
  title: string
  bio: string
  location: string
  linkedin: string
  github: string
  website: string
  show_stats: boolean
  show_skills: boolean
  show_achievements: boolean
}

export default function PublicProfilePage() {
  const params = useParams()
  const slug = params?.slug as string
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/profile/${slug}`)
        const data = await res.json()
        if (data.error || !data.profile) { setNotFound(true); return }
        setProfile(data.profile)
      } catch { setNotFound(true) }
      finally { setLoading(false) }
    }
    if (slug) load()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06080d] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🌐</div>
          <div className="text-white font-bold">Loading profile...</div>
        </div>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-[#06080d] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-xl font-bold text-white mb-2">Profile Not Found</h1>
          <p className="text-[#4a6680] text-sm mb-6">
            This profile doesn't exist or is set to private.
          </p>
          <a href="/" className="bg-[#00f0c8] text-black font-bold px-6 py-2.5 rounded-lg text-sm">
            Go Home
          </a>
        </div>
      </div>
    )
  }

  const levelColor = (l: number) => l >= 80 ? '#39e87a' : l >= 60 ? '#00f0c8' : l >= 40 ? '#ffd84d' : '#ff7c4d'
  const levelLabel = (l: number) => l >= 80 ? 'Expert' : l >= 60 ? 'Advanced' : l >= 40 ? 'Intermediate' : 'Beginner'
  const initials = profile.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="min-h-screen bg-[#06080d] py-10 px-6" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div className="max-w-2xl mx-auto">

        {/* Profile Card */}
        <div className="bg-gradient-to-br from-[#0c1018] to-[#111620] border border-[#1e2838] rounded-2xl overflow-hidden mb-6">
          {/* Banner */}
          <div className="h-24 bg-gradient-to-r from-[#00f0c8] via-[#9b7bff] to-[#ff7c4d] opacity-60" />

          <div className="px-6 pb-6">
            <div className="-mt-10 mb-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00f0c8] to-[#9b7bff] flex items-center justify-center text-black font-bold text-2xl border-4 border-[#0c1018]">
                {initials}
              </div>
            </div>

            <h1 className="text-xl font-bold text-white">{profile.name}</h1>
            {profile.title && <div className="text-sm text-[#00f0c8] mt-0.5">{profile.title}</div>}
            {profile.location && <div className="text-xs text-[#4a6680] mt-1">📍 {profile.location}</div>}
            {profile.bio && <p className="text-sm text-[#7a96b0] mt-3 leading-relaxed">{profile.bio}</p>}

            {/* Links */}
            {(profile.linkedin || profile.github || profile.website) && (
              <div className="flex gap-3 mt-4 flex-wrap">
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

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#1e2838] flex items-center justify-between">
            <div className="text-xs text-[#4a6680]">Powered by <span className="text-[#00f0c8] font-bold">CareerForge AI</span></div>
            <div className="text-xs text-[#4a6680]">/{slug}</div>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center">
          <a href="https://careerforge.ai" className="text-xs text-[#4a6680] hover:text-[#00f0c8]">
            Create your own CareerForge profile →
          </a>
        </div>
      </div>
    </div>
  )
}