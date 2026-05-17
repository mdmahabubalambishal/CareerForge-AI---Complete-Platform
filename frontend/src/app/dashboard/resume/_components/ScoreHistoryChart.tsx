interface Props { history: { score: number; created_at: string }[] }

export default function ScoreHistoryChart({ history }: Props) {
  if (!history.length) return null
  const max = 100
  return (
    <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
      <div className="text-sm font-bold text-white mb-3">Score History</div>
      <div className="flex items-end gap-1 h-16">
        {history.map((h, i) => (
          <div
            key={i}
            title={`${h.score}% · ${new Date(h.created_at).toLocaleDateString()}`}
            className="flex-1 rounded-t transition-all hover:opacity-80"
            style={{
              height: `${(h.score / max) * 100}%`,
              background: h.score >= 80 ? '#00f0c8' : h.score >= 60 ? '#ffd84d' : '#ff7c4d',
              minHeight: '4px',
              opacity: 0.7,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-[#4a6680]">
        <span>Oldest</span>
        <span className="text-[#00f0c8] font-bold">Latest: {history[history.length-1]?.score}%</span>
      </div>
    </div>
  )
}