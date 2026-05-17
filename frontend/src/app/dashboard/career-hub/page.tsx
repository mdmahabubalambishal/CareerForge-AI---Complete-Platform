'use client'
import { useRouter } from 'next/navigation'

const features = [
  {
    icon: '🔥',
    title: 'Resume Roaster',
    desc: 'Upload your resume and AI will brutally tell you what\'s weak',
    path: '/dashboard/career-hub/resume-roaster',
    color: '#ff7c4d',
    ready: true,
  },
  {
    icon: '📝',
    title: 'Resume Optimizer',
    desc: 'Upload resume + paste JD — AI optimizes it for maximum ATS score',
    path: '/dashboard/career-hub/resume-optimizer',
    color: '#9b7bff',
    ready: true,
  },
  {
    icon: '🧭',
    title: 'Career Path Suggester',
    desc: 'AI analyzes your skills and suggests the best career paths for you',
    path: '/dashboard/career-hub/career-path',
    color: '#00f0c8',
    ready: true,
  },
  {
    icon: '🧠',
    title: 'AI Career Coach',
    desc: 'Chat with AI for personalized career guidance and advice',
    path: '/dashboard/career-hub/ai-coach',
    color: '#ff7c4d',
    ready: true,
  },
  {
    icon: '🔍',
    title: 'Job Recommender',
    desc: 'AI analyzes your skills and recommends the most relevant jobs',
    path: '/dashboard/career-hub/job-recommender',
    color: '#00f0c8',
    ready: true,
  },
  {
    icon: '📋',
    title: 'Pipeline Board',
    desc: 'Kanban-style drag & drop board to track your applications',
    path: '/dashboard/career-hub/pipeline',
    color: '#4d9fff',
    ready: true,
  },
  {
    icon: '🎓',
    title: 'Learning Path',
    desc: 'AI recommends courses and certifications based on your goals',
    path: '/dashboard/career-hub/learning-path',
    color: '#ffd84d',
    ready: true,
  },
  {
    icon: '📰',
    title: 'Industry News',
    desc: 'Latest news and trends from your industry powered by AI',
    path: '/dashboard/career-hub/industry-news',
    color: '#4d9fff',
    ready: true,
  },
  {
    icon: '⏱️',
    title: 'Focus Mode',
    desc: 'Job search timer and interview countdown to stay productive',
    path: '/dashboard/career-hub/focus',
    color: '#39e87a',
    ready: true,
  },
  {
    icon: '💡',
    title: 'LinkedIn Generator',
    desc: 'AI generates LinkedIn posts from your weekly career progress',
    path: '/dashboard/career-hub/linkedin',
    color: '#0a66c2',
    ready: true,
  },
  {
    icon: '📝',
    title: 'Templates',
    desc: 'Save cover letter and application templates for quick reuse',
    path: '/dashboard/career-hub/templates',
    color: '#ffd84d',
    ready: true,
  },
  {
    icon: '📊',
    title: 'Smart Dashboard',
    desc: 'AI-powered daily personalized career tips and insights',
    path: '/dashboard/career-hub/smart-dashboard',
    color: '#39e87a',
    ready: true,
  },
  {
    icon: '📈',
    title: 'Insights',
    desc: 'Weekly comparison and rejection analysis to improve your strategy',
    path: '/dashboard/career-hub/insights',
    color: '#9b7bff',
    ready: true,
  },
  {
    icon: '🌐',
    title: 'My Profile',
    desc: 'Share your job search progress with a public shareable link',
    path: '/dashboard/career-hub/profile',
    color: '#ff5c9c',
    ready: true,
  },
]

export default function CareerHubPage() {
  const router = useRouter()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🎯</span>
          <h1 className="text-2xl font-bold text-white">Career Hub</h1>
        </div>
        <p className="text-[#4a6680] text-sm ml-12">All your career growth tools in one place</p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-3 gap-4">
        {features.map((f) => (
          <div
            key={f.title}
            onClick={() => f.ready && router.push(f.path)}
            className={`bg-[#0c1018] border border-[#1e2838] rounded-2xl p-5 relative overflow-hidden transition-all group ${
              f.ready
                ? 'cursor-pointer hover:border-[#263040] hover:-translate-y-0.5'
                : 'opacity-60 cursor-not-allowed'
            }`}
          >
            {/* Color accent */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: f.color }} />

            {/* Coming soon badge */}
            {!f.ready && (
              <div className="absolute top-3 right-3 bg-[#1e2838] text-[#4a6680] text-[10px] font-bold px-2 py-0.5 rounded-full">
                Soon
              </div>
            )}

            <div className="text-3xl mb-3">{f.icon}</div>
            <div className="text-sm font-bold text-white mb-1">{f.title}</div>
            <div className="text-xs text-[#4a6680] leading-relaxed">{f.desc}</div>

            {f.ready && (
              <div className="mt-4 text-xs font-bold" style={{ color: f.color }}>
                Open →
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}