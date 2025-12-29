'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { DiaryWithTemplates } from '@/types/diary'

interface BookIntroProps {
  diary: DiaryWithTemplates | null
  userName?: string
}

// Parse cover image_url which can be gradient, solid, or actual URL
function parseImageUrl(imageUrl: string): {
  type: 'gradient' | 'solid' | 'image'
  value: string
} {
  if (imageUrl.startsWith('gradient:')) {
    return { type: 'gradient', value: imageUrl.replace('gradient:', '') }
  }
  if (imageUrl.startsWith('solid:')) {
    return { type: 'solid', value: imageUrl.replace('solid:', '') }
  }
  return { type: 'image', value: imageUrl }
}

export function BookIntro({ diary, userName }: BookIntroProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<'enter' | 'float'>('enter')
  const [hasAnimated, setHasAnimated] = useState(false)

  // Check if we should skip animation (returning user)
  useEffect(() => {
    const hasVisited = sessionStorage.getItem('home-intro-shown')
    if (hasVisited) {
      setHasAnimated(true)
      setPhase('float')
    }
  }, [])

  // Transition to float phase after enter animation
  useEffect(() => {
    if (phase === 'enter' && !hasAnimated) {
      const timer = setTimeout(() => {
        setPhase('float')
        sessionStorage.setItem('home-intro-shown', 'true')
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [phase, hasAnimated])

  const handleBookClick = () => {
    if (phase !== 'float') return
    router.push('/dashboard')
  }

  // Skip animation on quick tap
  const handleQuickNav = () => {
    if (phase === 'enter') {
      router.push('/dashboard')
    }
  }

  const containerVariants = {
    enter: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  }

  const bookVariants = {
    enter: {
      y: -100,
      opacity: 0,
      scale: 0.9,
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring' as const,
        duration: 1,
        bounce: 0.3,
        delay: 0.2,
      },
    },
    float: {
      y: [0, -6, 0],
      rotate: [0, 1, 0, -1, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
  }

  const hintVariants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: [0, 0.7, 0],
      transition: {
        delay: 1.5,
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
  }

  // Default cover style
  const defaultStyle = {
    background: 'linear-gradient(135deg, #E8E0F0 0%, #D4C5E2 50%, #C9B8DA 100%)',
  }

  // Parse template image URL for cover style
  const coverStyle = diary?.cover_template
    ? (() => {
        const parsed = parseImageUrl(diary.cover_template.image_url)
        switch (parsed.type) {
          case 'gradient':
            return { background: parsed.value }
          case 'solid':
            return { backgroundColor: parsed.value }
          case 'image':
            return { backgroundImage: `url(${parsed.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        }
      })()
    : defaultStyle

  const diaryTitle = diary?.title || `일기장 Vol.${diary?.volume_number || 1}`

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="book-intro"
        className="min-h-[50vh] flex flex-col items-center justify-center px-4 pb-12"
        variants={containerVariants}
        initial="enter"
        animate="visible"
        onClick={handleQuickNav}
      >
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <h2 className="text-xl font-semibold text-pastel-purple-dark">
            {userName ? `${userName}님의 일기장` : '나의 일기장'}
          </h2>
        </motion.div>

        {/* Book Cover with Title - moves together */}
        <motion.div
          variants={bookVariants}
          initial={hasAnimated ? 'visible' : 'enter'}
          animate={phase === 'float' ? ['visible', 'float'] : 'visible'}
          className="flex flex-col items-center cursor-pointer"
          onClick={handleBookClick}
        >
          {/* Cover Image */}
          <div
            className="relative w-48 h-64 rounded-lg shadow-xl overflow-hidden"
            style={diary?.cover_image_url ? {} : coverStyle}
          >
            {/* Use pre-rendered cover image if available */}
            {diary?.cover_image_url ? (
              <img
                src={diary.cover_image_url}
                alt="Cover"
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0" style={coverStyle} />
            )}

            {/* Subtle shine effect */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.03) 100%)',
              }}
            />

            {/* Border highlight */}
            <div className="absolute inset-0 rounded-lg border border-white/20 pointer-events-none" />
          </div>

          {/* Diary Title - below cover, moves together */}
          <p className="mt-4 text-sm font-medium text-gray-600">
            {diaryTitle}
          </p>
        </motion.div>

        {/* Hint text */}
        <motion.p
          className="mt-10 text-sm text-gray-400"
          variants={hintVariants}
          initial="hidden"
          animate={phase === 'float' ? 'visible' : 'hidden'}
        >
          눌러서 시작하기
        </motion.p>
      </motion.div>
    </AnimatePresence>
  )
}
