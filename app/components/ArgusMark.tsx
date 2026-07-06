export function ArgusMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <defs>
        <linearGradient id="argus-ring" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="argus-a" x1="14" y1="12" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5eead4" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#18181b" stroke="url(#argus-ring)" strokeWidth="1.25" />
      <path
        d="M12.5 27.5L20 13l7.5 14.5"
        stroke="url(#argus-a)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15.25 22h9.5" stroke="url(#argus-a)" strokeWidth="2.75" strokeLinecap="round" />
      <circle cx="20" cy="13" r="1.25" fill="#2dd4bf" opacity="0.9" />
    </svg>
  );
}
