'use client'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 48, text: 'text-3xl' },
  }

  const { icon, text } = sizes[size]

  return (
    <div className="flex items-center gap-2">
      {/* Logo Icon - Book with sparkle */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Book base */}
        <path
          d="M8 12C8 9.79086 9.79086 8 12 8H36C38.2091 8 40 9.79086 40 12V38C40 40.2091 38.2091 42 36 42H12C9.79086 42 8 40.2091 8 38V12Z"
          fill="url(#bookGradient)"
        />
        {/* Book spine highlight */}
        <path
          d="M8 12C8 9.79086 9.79086 8 12 8H14V42H12C9.79086 42 8 40.2091 8 38V12Z"
          fill="url(#spineGradient)"
        />
        {/* Page lines */}
        <path
          d="M18 16H34"
          stroke="#E8D5E0"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M18 22H34"
          stroke="#E8D5E0"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M18 28H28"
          stroke="#E8D5E0"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Sparkle/Star */}
        <path
          d="M36 6L37.5 10.5L42 12L37.5 13.5L36 18L34.5 13.5L30 12L34.5 10.5L36 6Z"
          fill="url(#sparkleGradient)"
        />
        {/* Small sparkle */}
        <circle cx="32" cy="36" r="2" fill="#B8D4E3" opacity="0.8" />

        <defs>
          <linearGradient id="bookGradient" x1="8" y1="8" x2="40" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C9B8D9" />
            <stop offset="1" stopColor="#E8D5E0" />
          </linearGradient>
          <linearGradient id="spineGradient" x1="8" y1="8" x2="14" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A89BC4" />
            <stop offset="1" stopColor="#C9B8D9" />
          </linearGradient>
          <linearGradient id="sparkleGradient" x1="30" y1="6" x2="42" y2="18" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5D0C5" />
            <stop offset="1" stopColor="#D4A5A5" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`${text} font-bold text-pastel-purple`}>
            나날로그
          </span>
          <span className="text-[10px] tracking-wider text-pastel-purple/60 font-medium">
            NANALOGUE
          </span>
        </div>
      )}
    </div>
  )
}
