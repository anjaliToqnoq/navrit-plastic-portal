export function RecyclingArt() {
  return (
    <svg viewBox="0 0 360 260" className="h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#84cc16" />
        </linearGradient>
        <linearGradient id="g2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#16a34a" floodOpacity="0.18" />
        </filter>
      </defs>

      <rect x="20" y="30" width="320" height="200" rx="28" fill="url(#g1)" opacity="0.08" />

      <g className="spin-slow" style={{ transformOrigin: "180px 130px" }}>
        <path
          d="M180 55c40 0 72 26 78 60"
          fill="none"
          stroke="url(#g1)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M248 145c-12 36-46 60-86 60"
          fill="none"
          stroke="url(#g2)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M112 185c-28-22-36-58-18-88"
          fill="none"
          stroke="#84cc16"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <polygon points="248,100 268,118 236,124" fill="#16a34a" />
        <polygon points="150,205 128,188 158,176" fill="#10b981" />
        <polygon points="118,95 138,78 142,110" fill="#84cc16" />
      </g>

      <g filter="url(#soft)">
        <rect x="128" y="98" width="104" height="68" rx="18" fill="#fff" />
        <text
          x="180"
          y="128"
          textAnchor="middle"
          fontFamily="system-ui,sans-serif"
          fontSize="11"
          fontWeight="700"
          fill="#64748b"
        >
          PET · PP · HDPE
        </text>
        <text
          x="180"
          y="150"
          textAnchor="middle"
          fontFamily="system-ui,sans-serif"
          fontSize="16"
          fontWeight="800"
          fill="#0f172a"
        >
          Live Rates
        </text>
      </g>

      <circle cx="68" cy="78" r="10" fill="#84cc16" opacity="0.7" className="float-card" />
      <circle cx="300" cy="70" r="7" fill="#10b981" opacity="0.6" className="float-card-delay" />
      <circle cx="290" cy="190" r="12" fill="#16a34a" opacity="0.35" className="float-card-late" />
    </svg>
  );
}
