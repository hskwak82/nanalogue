'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface NewDiaryModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (title: string, inheritFromPrevious: boolean) => Promise<void>
  nextVolumeNumber: number
}

export function NewDiaryModal({
  isOpen,
  onClose,
  onConfirm,
  nextVolumeNumber,
}: NewDiaryModalProps) {
  const [title, setTitle] = useState(`${nextVolumeNumber}권`)
  const [inheritFromPrevious, setInheritFromPrevious] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm(title, inheritFromPrevious)
      onClose()
    } catch (error) {
      console.error('Failed to create diary:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md pointer-events-auto">
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-800">새 일기장 만들기</h2>
                <p className="text-sm text-gray-500 mt-1">
                  새로운 일기장을 시작합니다
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Title input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    일기장 이름
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`${nextVolumeNumber}권`}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-pastel-purple focus:ring-2 focus:ring-pastel-purple/20 outline-none transition-all"
                  />
                </div>

                {/* Volume number display */}
                <div className="flex items-center gap-2 p-3 bg-pastel-cream rounded-lg">
                  <span className="text-sm text-gray-600">권 번호:</span>
                  <span className="font-semibold text-pastel-purple">{nextVolumeNumber}권</span>
                </div>

                {/* Inherit settings */}
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={inheritFromPrevious}
                    onChange={(e) => setInheritFromPrevious(e.target.checked)}
                    className="w-4 h-4 text-pastel-purple rounded focus:ring-pastel-purple"
                  />
                  <span className="text-sm text-gray-700">
                    이전 일기장 디자인 이어받기
                  </span>
                </label>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-5 py-2.5 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-pastel-purple text-white rounded-full hover:bg-pastel-purple-dark transition-colors disabled:opacity-50"
                >
                  {isLoading ? '만드는 중...' : '일기장 만들기'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
