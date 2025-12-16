'use client'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 48, text: 'text-3xl' },
  }

  const { icon, text } = sizes[size]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Icon - Abstract Leaf (성장과 기록) */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="leafGradient" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B8D4C8" />
            <stop offset="1" stopColor="#A89BC4" />
          </linearGradient>
        </defs>
        {/* Leaf shape */}
        <path
          d="M24 4C24 4 8 16 8 32C8 40 16 44 24 44C32 44 40 40 40 32C40 16 24 4 24 4Z"
          fill="url(#leafGradient)"
        />
        {/* Veins */}
        <path
          d="M24 12V36M24 20L18 26M24 28L30 22"
          stroke="#FAF8F5"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {showText && (
        <span className={`${text} font-semibold text-pastel-purple-dark`}>
          나날로그
        </span>
      )}
    </div>
  )
}
