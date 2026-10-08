export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flex: 'none' }}>
      <defs>
        <linearGradient id="cn-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c5cff" /><stop offset="1" stopColor="#ff7a59" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#cn-g)" />
      <path d="M43 22.5A14 14 0 1 0 43 41.5" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="45" cy="21" r="5" fill="#fff" /><circle cx="45" cy="43" r="5" fill="#fff" />
    </svg>
  )
}
