export function Banderines({ className = "" }: { className?: string }) {
  const colors = [
    '#75AADB', '#FFFFFF', '#F6B21A',
    '#75AADB', '#FFFFFF', '#F6B21A',
    '#75AADB', '#FFFFFF', '#F6B21A',
    '#75AADB', '#FFFFFF', '#F6B21A',
    '#75AADB', '#FFFFFF',
  ]

  return (
    <div className={`w-full overflow-hidden ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 420 44"
        className="w-full h-10"
        preserveAspectRatio="none"
      >
        {/* cuerda colgante */}
        <path
          d="M0 5 Q210 18 420 5"
          fill="none"
          stroke="#003B73"
          strokeWidth="1.5"
          opacity="0.5"
        />
        {colors.map((color, i) => {
          const x = i * 30 + 4
          // leve descuelgue siguiendo la curva
          const droop = Math.sin((i / (colors.length - 1)) * Math.PI) * 11
          const top = 6 + droop
          return (
            <g key={i}>
              <polygon
                points={`${x},${top} ${x + 26},${top} ${x + 13},${top + 24}`}
                fill={color}
                stroke="#003B73"
                strokeWidth="0.75"
                strokeOpacity="0.25"
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
