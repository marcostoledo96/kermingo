export function SolDeMayo({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {[...Array(16)].map((_, i) => {
        const angle = ((i * 22.5) * Math.PI) / 180
        const isLong = i % 2 === 0
        const length = isLong ? 46 : 36
        const x1 = 50 + Math.cos(angle) * 21
        const y1 = 50 + Math.sin(angle) * 21
        const x2 = 50 + Math.cos(angle) * length
        const y2 = 50 + Math.sin(angle) * length
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#F6B21A"
            strokeWidth={isLong ? '3' : '2'}
            strokeLinecap="round"
          />
        )
      })}
      <circle cx="50" cy="50" r="19" fill="#F6B21A" />
      <circle cx="50" cy="50" r="19" fill="none" stroke="#003B73" strokeWidth="1.5" strokeOpacity="0.3" />
      <ellipse cx="44" cy="47" rx="2.5" ry="3.2" fill="#003B73" />
      <ellipse cx="56" cy="47" rx="2.5" ry="3.2" fill="#003B73" />
      <path d="M 42 54 Q 50 62 58 54" fill="none" stroke="#003B73" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
