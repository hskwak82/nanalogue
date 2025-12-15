'use client'

import { motion } from 'framer-motion'
import type { BookshelfViewMode } from '@/types/diary'

interface ViewToggleProps {
  mode: BookshelfViewMode
  onChange: (mode: BookshelfViewMode) => void
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-2 bg-white/70 rounded-full p-1 shadow-sm">
      <button
        onClick={() => onChange('covers')}
        className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          mode === 'covers' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        {mode === 'covers' && (
          <motion.div
            layoutId="viewToggleBackground"
            className="absolute inset-0 bg-pastel-purple rounded-full"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-1.5">
          {/* Cover icon */}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="3" y="3" width="7" height="10" rx="1" strokeWidth="2" />
            <rect x="14" y="3" width="7" height="10" rx="1" strokeWidth="2" />
            <rect x="3" y="15" width="7" height="6" rx="1" strokeWidth="2" />
            <rect x="14" y="15" width="7" height="6" rx="1" strokeWidth="2" />
          </svg>
          표지
        </span>
      </button>

      <button
        onClick={() => onChange('spines')}
        className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          mode === 'spines' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        {mode === 'spines' && (
          <motion.div
            layoutId="viewToggleBackground"
            className="absolute inset-0 bg-pastel-purple rounded-full"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-1.5">
          {/* Spine/bookshelf icon */}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="3" y="4" width="3" height="16" rx="0.5" strokeWidth="2" />
            <rect x="8" y="4" width="4" height="16" rx="0.5" strokeWidth="2" />
            <rect x="14" y="4" width="2" height="16" rx="0.5" strokeWidth="2" />
            <rect x="18" y="4" width="3" height="16" rx="0.5" strokeWidth="2" />
          </svg>
          책장
        </span>
      </button>
    </div>
  )
}
