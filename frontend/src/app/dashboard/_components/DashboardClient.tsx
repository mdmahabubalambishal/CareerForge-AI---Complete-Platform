'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  user: any
  profile: any
}

const navItems = [
  { icon: '', label: 'Dashboard', active: true, path: '/dashboard' },
  { icon: '📄', label: 'Resume Builder', path: '/dashboard/resume' },
  { icon: '🌐', label: 'Portfolio', path: '/dashboard/portfolio' },
  { icon: '✍️', label: 'AI Writing', path: '/dashboard/writing' },
  { icon: '💬', label: 'AI Assistant', path: '/dashboard/chat' },

  { icon: '', label: 'CAREER DEVELOPMENT', active: true, path: '/dashboard' },
  { icon: '🧬', label: 'Skill Gap', path: '/dashboard/skills' },
  { icon: '🎤', label: 'Interview Prep', path: '/dashboard/interview' },
  { icon: '💰', label: 'Salary Insights', path: '/dashboard/salary' },
  { icon: '📊', label: 'Analytics', path: '/dashboard/analytics' },

  { icon: '', label: 'JOB SEARCHER', active: true, path: '/dashboard' },
  { icon: '🎯', label: 'Career Hub', path: '/dashboard/career-hub' },
  { icon: '🤖', label: 'AI Agents', path: '/dashboard/agents' },
  { icon: '💼', label: 'Job Tracker', badge: '0', path: '/dashboard/jobs' },
  
  { icon: '', label: 'NETWORK MANAGER', active: true, path: '/dashboard' },
  { icon: '🤝', label: 'Networking', path: '/dashboard/networking' },
  { icon: '💳', label: 'Billing', path: '/dashboard/billing' },
]

const statCards = [
  { label: 'ATS Score', value: '—', color: '#00f0c8', change: 'Upload a resume to start' },
  { label: 'Applications', value: '0', color: '#9b7bff', change: 'Track your first job' },
  { label: 'Interviews', value: '0', color: '#ff7c4d', change: 'No upcoming interviews' },
  { label: 'Skill Match', value: '—', color: '#39e87a', change: 'Set a target role' },
]

export default function DashboardClient({ user, profile }: Props) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User'
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="flex h-screen bg-[#06080d] text-white overflow-hidden" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* SIDEBAR */}
      <aside className="w-60 bg-[#0c1018] border-r border-[#1e2838] flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-[#1e2838]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00f0c8] to-[#4d9fff] flex items-center justify-center text-black font-bold text-xs">⚡</div>
            <span className="font-bold text-sm">Career<span className="text-[#00f0c8]">Forge</span> AI</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <div
              key={item.label}
              onClick={() => router.push(item.path)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all ${
                item.active
                  ? 'bg-[#00f0c8]/10 text-[#00f0c8]'
                  : 'text-[#7a96b0] hover:bg-[#111620] hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="bg-[#1e2838] text-[#4a6680] text-xs px-2 py-0.5 rounded-full">{item.badge}</span>
              )}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-[#1e2838]">
          <div className="bg-[#111620] border border-[#1e2838] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00f0c8] to-[#9b7bff] flex items-center justify-center text-black font-bold text-xs">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{displayName}</div>
                <div className="text-[10px] text-[#4a6680] capitalize">{profile?.plan || 'free'} plan</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[#00f0c8] font-bold text-sm">{profile?.credits ?? 100}</span>
                <span className="text-[#4a6680] text-[10px] ml-1">credits</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-[10px] text-[#4a6680] hover:text-red-400 transition-colors px-2 py-1 rounded"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[#06080d]/90 backdrop-blur border-b border-[#1e2838] px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold">Good morning, {displayName.split(' ')[0]} 👋</h1>
            <p className="text-[#4a6680] text-xs">Let's build your career today</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[#00f0c8]/10 border border-[#00f0c8]/20 text-[#00f0c8] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              {profile?.plan || 'free'}
            </div>
            <button
              onClick={() => router.push('/dashboard/resume')}
              className="bg-[#00f0c8] text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-white transition-colors"
            >
              + New Resume
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {statCards.map((s) => (
              <div key={s.label} className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-5 relative overflow-hidden group hover:border-[#263040] transition-all hover:-translate-y-0.5">
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl" style={{ background: s.color }} />
                <div className="text-[#4a6680] text-xs uppercase tracking-wide mb-3">{s.label}</div>
                <div className="text-3xl font-bold mb-1" style={{ fontFamily: 'monospace', color: s.color }}>{s.value}</div>
                <div className="text-[#4a6680] text-xs">{s.change}</div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-5">
            <h2 className="text-sm font-bold mb-4 text-[#7a96b0] uppercase tracking-wide">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: '📄', title: 'Build Resume', sub: 'AI-optimized for ATS', path: '/dashboard/resume' },
                { icon: '💬', title: 'Ask AI Assistant', sub: 'Career guidance in Bengali/English', path: '/dashboard/chat' },
                { icon: '💼', title: 'Track a Job', sub: 'Add your first application', path: '/dashboard/jobs' },
                { icon: '🧬', title: 'Analyze Skill Gap', sub: 'vs your target role', path: '/dashboard/skills' },
                { icon: '🎤', title: 'Interview Prep', sub: 'Company-specific questions', path: '/dashboard/interview' },
                { icon: '💰', title: 'Check Salary', sub: 'Know your market worth', path: '/dashboard/salary' },
              ].map(a => (
                <div
                  key={a.title}
                  onClick={() => router.push(a.path)}
                  className="bg-[#111620] border border-[#1e2838] rounded-xl p-4 cursor-pointer hover:border-[#263040] hover:-translate-y-0.5 transition-all group"
                >
                  <span className="text-2xl block mb-2">{a.icon}</span>
                  <div className="text-sm font-bold text-white mb-1">{a.title}</div>
                  <div className="text-xs text-[#4a6680]">{a.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Getting Started */}
          <div className="bg-gradient-to-br from-[#00f0c8]/5 to-[#4d9fff]/5 border border-[#00f0c8]/10 rounded-2xl p-6">
            <h2 className="text-base font-bold mb-1">🚀 Getting Started</h2>
            <p className="text-[#4a6680] text-sm mb-5">Complete these steps to unlock the full power of CareerForge AI</p>
            <div className="space-y-3">
              {[
                { num: '1', title: 'Build your first AI resume', path: '/dashboard/resume', action: 'Start →' },
                { num: '2', title: 'Set your target job role', path: '/dashboard/skills', action: 'Set Role →' },
                { num: '3', title: 'Upload a PDF to your knowledge base', path: '/dashboard/chat', action: 'Upload →' },
                { num: '4', title: 'Run a skill gap analysis', path: '/dashboard/skills', action: 'Analyze →' },
              ].map((step) => (
                <div key={step.num} className="flex items-center gap-4 bg-[#0c1018]/80 border border-[#1e2838] rounded-xl px-4 py-3">
                  <div className="w-7 h-7 rounded-full border border-[#1e2838] flex items-center justify-center text-xs text-[#4a6680] flex-shrink-0">
                    {step.num}
                  </div>
                  <span className="flex-1 text-sm text-[#7a96b0]">{step.title}</span>
                  <button
                    onClick={() => router.push(step.path)}
                    className="text-xs text-[#00f0c8] hover:underline"
                  >
                    {step.action}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}