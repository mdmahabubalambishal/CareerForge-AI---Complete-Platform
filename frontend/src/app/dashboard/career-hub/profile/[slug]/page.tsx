'use client'
// app/profile/[slug]/page.tsx
// This is the PUBLIC profile page anyone can view

export default function PublicProfilePage({ params }: { params: { slug: string } }) {
  return (
    <div className="min-h-screen bg-[#06080d] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🌐</div>
          <h1 className="text-xl font-bold text-white">Public Profile</h1>
          <p className="text-[#4a6680] text-sm mt-1">/{params.slug}</p>
        </div>

        <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-8 text-center">
          <div className="text-3xl mb-4">🚧</div>
          <div className="text-white font-bold text-lg mb-2">Coming Soon</div>
          <p className="text-[#4a6680] text-sm">
            Public profile pages will be available once backend support is added.
            <br />
            For now, use the preview in your dashboard to see how your profile looks.
          </p>
          <a href="/dashboard/career-hub"
            className="inline-block mt-6 bg-[#00f0c8] text-black font-bold px-6 py-2.5 rounded-lg text-sm hover:brightness-110 transition-all">
            ← Back to Career Hub
          </a>
        </div>

        <div className="text-center mt-6">
          <span className="text-xs text-[#4a6680]">Powered by </span>
          <span className="text-xs font-bold text-[#00f0c8]">CareerForge AI</span>
        </div>
      </div>
    </div>
  )
}