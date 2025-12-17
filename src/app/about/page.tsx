'use client'

import { motion } from 'framer-motion'
import { Navigation } from '@/components/Navigation'
import Link from 'next/link'

const features = [
  {
    id: 'conversation',
    icon: '🗣️',
    title: '대화로 기록',
    shortDesc: '말하듯 기록하세요',
    description: '질문에 답하듯 말하면, AI가 하루를 정리해 일기로 남깁니다.',
    details: [
      '복잡한 글쓰기 없이 대화만으로 일기 완성',
      'AI가 맥락을 이해하고 자연스럽게 질문',
      '감정, 사건, 생각을 체계적으로 정리',
    ],
    gradient: 'from-pastel-pink to-pastel-peach',
  },
  {
    id: 'schedule',
    icon: '📅',
    title: '일정까지 회고',
    shortDesc: '하루를 돌아보세요',
    description: '오늘 일정이 어땠는지 돌아보고, 내일 계획까지 자연스럽게 이어집니다.',
    details: [
      '캘린더 연동으로 일정 기반 회고',
      '완료한 일, 미룬 일, 새로운 할 일 정리',
      '내일 계획까지 한 번에 설정',
    ],
    gradient: 'from-pastel-blue to-pastel-mint',
  },
  {
    id: 'personalized',
    icon: '🧠',
    title: '나만의 AI',
    shortDesc: '당신을 이해합니다',
    description: '관심사와 습관에 따라 질문과 정리 방식이 달라집니다.',
    details: [
      '대화할수록 나를 더 잘 이해하는 AI',
      '관심사에 맞춘 맞춤형 질문',
      '나만의 기록 스타일로 정리',
    ],
    gradient: 'from-pastel-purple to-pastel-pink',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
}

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
}

export default function AboutPage() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pastel-cream via-pastel-pink-light/20 to-pastel-cream">
      <Navigation user={null} />

      {/* Hero Section */}
      <section className="px-4 pt-12 pb-8 sm:pt-16 sm:pb-12">
        <motion.div
          className="max-w-2xl mx-auto text-center mb-10 sm:mb-14"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-pastel-purple-dark mb-4">
            나날로그는 이렇게 다릅니다
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            글 쓰기 싫은 사람을 위한 AI 대화형 일기 서비스
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {features.map((feature) => (
            <motion.button
              key={feature.id}
              onClick={() => scrollToSection(feature.id)}
              className={`group relative overflow-hidden rounded-2xl p-6 sm:p-8 text-left bg-gradient-to-br ${feature.gradient} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
              variants={cardVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative z-10">
                <span className="text-4xl sm:text-5xl block mb-4">{feature.icon}</span>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-white/80 text-sm">
                  {feature.shortDesc}
                </p>
              </div>
              {/* Decorative circle */}
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full" />
              {/* Scroll hint */}
              <div className="absolute bottom-3 right-3 text-white/60 text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                자세히 보기 ↓
              </div>
            </motion.button>
          ))}
        </motion.div>
      </section>

      {/* Detailed Sections */}
      <section className="px-4 py-12 sm:py-20">
        <div className="max-w-3xl mx-auto space-y-16 sm:space-y-24">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              id={feature.id}
              className="scroll-mt-24"
              variants={sectionVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              <div className={`flex flex-col ${index % 2 === 1 ? 'sm:flex-row-reverse' : 'sm:flex-row'} gap-6 sm:gap-10 items-center`}>
                {/* Icon & Title */}
                <div className={`flex-shrink-0 w-full sm:w-1/3 text-center sm:text-left ${index % 2 === 1 ? 'sm:text-right' : ''}`}>
                  <span className="text-6xl sm:text-7xl block mb-4">{feature.icon}</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-pastel-purple-dark">
                    {feature.title}
                  </h2>
                </div>

                {/* Content */}
                <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-sm border border-white/50">
                  <p className="text-gray-700 text-base sm:text-lg mb-6 leading-relaxed">
                    {feature.description}
                  </p>
                  <ul className="space-y-3">
                    {feature.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-600 text-sm sm:text-base">
                        <span className="text-pastel-purple mt-0.5">✓</span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-12 sm:py-16">
        <motion.div
          className="max-w-xl mx-auto text-center bg-gradient-to-r from-pastel-purple to-pastel-pink rounded-3xl p-8 sm:p-12 shadow-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
            오늘 하루, 말로 정리해보세요
          </h2>
          <p className="text-white/80 text-sm sm:text-base mb-6">
            하루 5분, 대화만으로 일기가 완성됩니다
          </p>
          <Link
            href="/home"
            className="inline-block bg-white text-pastel-purple-dark font-semibold px-8 py-3 rounded-full shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            시작하기
          </Link>
        </motion.div>
      </section>

      {/* Footer spacing */}
      <div className="h-12" />
    </div>
  )
}
