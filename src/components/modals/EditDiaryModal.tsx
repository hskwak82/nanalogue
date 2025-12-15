'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DiaryWithTemplates } from '@/types/diary'

interface EditDiaryModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (title: string) => Promise<void>
  diary: DiaryWithTemplates | null
}

export function EditDiaryModal({
  isOpen,
  onClose,
  onConfirm,
  diary,
}: EditDiaryModalProps) {
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (diary) {
      setTitle(diary.title || `${diary.volume_number}권`)
    }
  }, [diary])

  if (!diary) return null

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm(title)
      onClose()
    } catch (error) {
      console.error('Failed to update diary:', error)
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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm pointer-events-auto">
              {/* Header */}
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">일기장 이름 수정</h2>
              </div>

              {/* Content */}
              <div className="p-5">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`${diary.volume_number}권`}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-pastel-purple focus:ring-2 focus:ring-pastel-purple/20 outline-none transition-all"
                  autoFocus
                />
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading || !title.trim()}
                  className="px-4 py-2 bg-pastel-purple text-white rounded-full hover:bg-pastel-purple-dark transition-colors disabled:opacity-50"
                >
                  {isLoading ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
