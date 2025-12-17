'use client'

import { motion } from 'framer-motion'

const keyPoints = [
  {
    icon: '🗣️',
    title: '대화로 기록',
    description: '편하게 대화하면 AI가 일기로 정리',
  },
  {
    icon: '📅',
    title: '일정 회고',
    description: '오늘을 돌아보고 내일 계획까지',
  },
  {
    icon: '✨',
    title: '일기장 꾸미기',
    description: '아날로그 감성으로 나만의 일기장',
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
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut' as const,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.25,
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
      {/* Key Points - Card Style */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-2xl mx-auto mb-6 sm:mb-8"
        variants={itemVariants}
      >
        {keyPoints.map((point, index) => (
          <motion.div
            key={point.title}
            className="flex flex-col items-center text-center bg-white/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-sm border border-white/50 hover:shadow-md transition-shadow"
            variants={cardVariants}
            custom={index}
          >
            <span className="text-2xl sm:text-3xl mb-2">{point.icon}</span>
            <span className="text-xs sm:text-sm font-semibold text-pastel-purple-dark mb-1">
              {point.title}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-500 leading-tight">
              {point.description}
            </span>
          </motion.div>
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
