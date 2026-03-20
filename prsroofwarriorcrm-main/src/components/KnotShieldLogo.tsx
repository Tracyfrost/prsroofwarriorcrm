export function KnotShieldLogo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shield shape */}
      <path
        d="M32 4L8 16V32C8 46.4 18.4 58.8 32 62C45.6 58.8 56 46.4 56 32V16L32 4Z"
        fill="url(#shieldGrad)"
        stroke="hsl(38 92% 50%)"
        strokeWidth="2"
      />
      {/* Celtic knot - simplified interlocking pattern */}
      <g stroke="hsl(38 92% 50%)" strokeWidth="2.5" strokeLinecap="round" fill="none">
        {/* Horizontal infinity/knot */}
        <path d="M20 32C20 26 26 22 32 28C38 22 44 26 44 32C44 38 38 42 32 36C26 42 20 38 20 32Z" />
        {/* Vertical cross through knot */}
        <path d="M32 18V28M32 36V48" />
        {/* Side arms */}
        <path d="M22 24L28 28M36 36L42 40" />
        <path d="M42 24L36 28M28 36L22 40" />
      </g>
      <defs>
        <linearGradient id="shieldGrad" x1="8" y1="4" x2="56" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(210 30% 18%)" />
          <stop offset="50%" stopColor="hsl(85 25% 25%)" />
          <stop offset="100%" stopColor="hsl(210 30% 14%)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
