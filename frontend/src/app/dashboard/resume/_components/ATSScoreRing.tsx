interface Props { score: number; grade?: string }

export default function ATSScoreRing({ score, grade }: Props) {
  const r = 40
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? '#00f0c8' : score >= 60 ? '#ffd84d' : '#ff7c4d'

  return (
    <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5 text-center">
      <div className="text-xs text-[#4a6680] uppercase tracking-wide mb-4">ATS Score</div>
      <div className="relative w-24 h-24 mx-auto">
        <svg viewBox="0 0 100 100" className="rotate-[-90deg]">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#1e2838" strokeWidth="8" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{score || '—'}</span>
          <span className="text-[10px] text-[#4a6680] uppercase">ATS</span>
        </div>
      </div>
      {grade && <div className="text-xs font-bold text-[#39e87a] mt-3">Grade: {grade}</div>}
    </div>
  )
}