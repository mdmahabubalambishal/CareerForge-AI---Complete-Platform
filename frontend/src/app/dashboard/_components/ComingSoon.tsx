interface Props {
  icon: string
  title: string
  description: string
  phase: string
}

export default function ComingSoon({ icon, title, description, phase }: Props) {
  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">{icon}</div>
        <h1 className="text-2xl font-bold text-white mb-3">{title}</h1>
        <p className="text-[#4a6680] text-sm mb-6 leading-relaxed">{description}</p>
        <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl px-6 py-3 inline-block">
          <span className="text-xs text-[#4a6680] uppercase tracking-wide">Coming in </span>
          <span className="text-[#00f0c8] font-bold text-sm">{phase}</span>
        </div>
      </div>
    </div>
  )
}