interface Props {
  matched?: string[]
  missing?: string[]
  partial?: string[]
}

export default function KeywordPanel({ matched = [], missing = [], partial = [] }: Props) {
  return (
    <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
      <div className="text-sm font-bold text-white mb-3">Keywords</div>
      <div className="flex flex-wrap gap-1 mb-3">
        {matched.map(k => (
          <span key={k} className="text-xs px-2 py-0.5 rounded bg-[#00f0c8]/10 border border-[#00f0c8]/20 text-[#00f0c8]">✓ {k}</span>
        ))}
      </div>
      {partial.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {partial.map(k => (
            <span key={k} className="text-xs px-2 py-0.5 rounded bg-[#ffd84d]/10 border border-[#ffd84d]/20 text-[#ffd84d]">~ {k}</span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {missing.map(k => (
          <span key={k} className="text-xs px-2 py-0.5 rounded bg-[#ff5c9c]/10 border border-[#ff5c9c]/20 text-[#ff5c9c]">✗ {k}</span>
        ))}
      </div>
    </div>
  )
}