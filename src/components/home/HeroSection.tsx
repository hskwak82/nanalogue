'use client'

import { motion } from 'framer-motion'

const keyPoints = [
  {
    icon: '🗣️',
    title: '대화로 기록',
    description: '질문에 답하듯 말하면 AI가 일기로 정리',
  },
  {
    icon: '📅',
    title: '일정까지 회고',
    description: '오늘을 돌아보고 내일 계획까지',
  },
  {
    icon: '🧠',
    title: '나만의 AI',
    description: '관심사와 습관에 맞춘 질문',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
}

export function HeroSection() {
  return (
    <motion.section
      className="px-4 pt-8 pb-4 sm:pt-12 sm:pb-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Key Points */}
      <motion.div
        className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8"
        variants={itemVariants}
      >
        {keyPoints.map((point) => (
          <div
            key={point.title}
            className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5 sm:px-4 sm:py-2 shadow-sm border border-white/40"
          >
            <span className="text-base sm:text-lg">{point.icon}</span>
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              {point.title}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Main Headline */}
      <motion.h1
        className="text-center text-xl sm:text-2xl lg:text-3xl font-bold text-pastel-purple-dark leading-tight mb-3 sm:mb-4"
        variants={itemVariants}
      >
        말로 하루를 정리하면,
        <br />
        기록은 나날로그가 합니다
      </motion.h1>

      {/* Sub Headline */}
      <motion.p
        className="text-center text-sm sm:text-base text-gray-600 max-w-md mx-auto"
        variants={itemVariants}
      >
        글 쓰기 싫은 사람을 위한
        <br className="sm:hidden" />
        <span className="hidden sm:inline"> </span>
        <span className="font-medium text-pastel-purple">
          AI 대화형 일기 서비스
        </span>
      </motion.p>
    </motion.section>
  )
}
