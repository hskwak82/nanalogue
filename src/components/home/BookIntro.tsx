'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Book3D } from './Book3D'
import type { DiaryWithTemplates } from '@/types/diary'

interface LatestEntry {
  date: string
  content: string
}

interface BookIntroProps {
  diary: DiaryWithTemplates | null
  userName?: string
  latestEntry?: LatestEntry
}

export function BookIntro({ diary, userName, latestEntry }: BookIntroProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<'enter' | 'float' | 'opening' | 'exit'>('enter')
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
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [phase, hasAnimated])

  const handleBookClick = () => {
    if (phase !== 'float') return

    setPhase('opening')

    // Wait for opening animation, show opened state, then navigate
    setTimeout(() => {
      setPhase('exit')
      setTimeout(() => {
        router.push('/dashboard')
      }, 400)
    }, 1800)
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
    exit: {
      opacity: 0,
      scale: 1.1,
      transition: {
        duration: 0.3,
      },
    },
  }

  const bookVariants = {
    enter: {
      y: -150,
      rotateX: -30,
      opacity: 0,
    },
    visible: {
      y: 0,
      rotateX: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        duration: 1.2,
        bounce: 0.3,
        delay: 0.3,
      },
    },
    float: {
      y: [0, -12, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
  }

  const textVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 1.2,
        duration: 0.5,
      },
    },
  }

  const hintVariants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: [0, 1, 0],
      transition: {
        delay: 2,
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="book-intro"
        className="min-h-[50vh] flex flex-col items-center justify-center px-4 pb-12"
        variants={containerVariants}
        initial="enter"
        animate={phase === 'exit' ? 'exit' : 'visible'}
        exit="exit"
        onClick={handleQuickNav}
      >
        {/* Title */}
        <motion.div
          className="text-center mb-6"
          variants={textVariants}
          initial="hidden"
          animate="visible"
        >
          <h2 className="text-xl font-semibold text-pastel-purple-dark">
            {userName ? `${userName}님의 일기장` : '나의 일기장'}
          </h2>
          {diary?.title && (
            <p className="text-sm text-gray-500 mt-1">{diary.title}</p>
          )}
        </motion.div>

        {/* 3D Book */}
        <motion.div
          variants={bookVariants}
          initial={hasAnimated ? 'visible' : 'enter'}
          animate={phase === 'float' ? ['visible', 'float'] : 'visible'}
          className="relative"
        >
          <Book3D
            diary={diary}
            isOpening={phase === 'opening'}
            onClick={handleBookClick}
            latestEntry={latestEntry}
          />
        </motion.div>

        {/* Hint text */}
        <motion.p
          className="mt-12 text-sm text-gray-400"
          variants={hintVariants}
          initial="hidden"
          animate={phase === 'float' ? 'visible' : 'hidden'}
        >
          눌러서 시작하기
        </motion.p>

        {/* Volume info */}
        {diary && (
          <motion.div
            className="absolute bottom-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 1.5 }}
          >
            <p className="text-xs text-gray-400">
              Vol. {diary.volume_number} | {new Date(diary.start_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' })} ~
            </p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
