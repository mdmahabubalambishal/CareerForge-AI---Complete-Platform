interface Props {
  resumes: any[]
  onSelect: (id: string) => void
  onNew: () => void
}

export default function ResumeList({ resumes, onSelect, onNew }: Props) {
  if (!resumes.length) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">📄</div>
      <div className="text-white font-bold text-lg mb-2">No resumes yet</div>
      <p className="text-[#4a6680] text-sm mb-6">Generate your first AI-powered, ATS-optimized resume</p>
      <button onClick={onNew} className="bg-[#00f0c8] text-black font-bold px-6 py-3 rounded-lg hover:bg-white transition-colors">
        ✨ Generate First Resume
      </button>
    </div>
  )

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        {resumes.map(r => (
          <div
            key={r.id}
            onClick={() => onSelect(r.id)}
            className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5 cursor-pointer hover:border-[#263040] hover:-translate-y-0.5 transition-all"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="text-sm font-bold text-white">{r.title}</div>
              <div className="text-lg font-bold" style={{ color: r.ats_score >= 80 ? '#00f0c8' : r.ats_score >= 60 ? '#ffd84d' : r.ats_score > 0 ? '#ff7c4d' : '#4a6680' }}>
                {r.ats_score > 0 ? `${r.ats_score}%` : '—'}
              </div>
            </div>
            <div className="text-xs text-[#4a6680] mb-1">{r.target_role || 'No target role'}</div>
            <div className="text-xs text-[#2a3848]">v{r.version_number} · {new Date(r.updated_at).toLocaleDateString()}</div>
          </div>
        ))}
        <div
          onClick={onNew}
          className="bg-[#0c1018] border border-dashed border-[#1e2838] rounded-xl p-5 cursor-pointer hover:border-[#00f0c8]/40 transition-all flex flex-col items-center justify-center gap-2 text-[#4a6680] hover:text-[#00f0c8]"
        >
          <span className="text-3xl">+</span>
          <span className="text-sm font-medium">New Resume</span>
        </div>
      </div>
    </div>
  )
}