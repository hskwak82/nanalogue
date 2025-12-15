'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DiaryWithTemplates } from '@/types/diary'
import { formatDateRange } from '@/types/diary'

interface CompleteDiaryModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (endDate: string, createNew: boolean, newTitle?: string) => Promise<void>
  diary: DiaryWithTemplates | null
}

export function CompleteDiaryModal({
  isOpen,
  onClose,
  onConfirm,
  diary,
}: CompleteDiaryModalProps) {
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [createNew, setCreateNew] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!diary) return null

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      const title = newTitle || `${diary.volume_number + 1}권`
      await onConfirm(endDate, createNew, title)
      onClose()
    } catch (error) {
      console.error('Failed to complete diary:', error)
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
                <h2 className="text-xl font-semibold text-gray-800">일기장 마무리</h2>
                <p className="text-sm text-gray-500 mt-1">
                  &ldquo;{diary.title || `${diary.volume_number}권`}&rdquo;을 완료합니다
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Date range preview */}
                <div className="p-4 bg-pastel-cream rounded-lg text-center">
                  <div className="text-sm text-gray-600 mb-1">기록 기간</div>
                  <div className="font-semibold text-pastel-purple">
                    {formatDateRange(diary.start_date, endDate)}
                  </div>
                  {diary.entry_count !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      총 {diary.entry_count}개 기록
                    </div>
                  )}
                </div>

                {/* End date picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    종료 날짜
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    min={diary.start_date}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-pastel-purple focus:ring-2 focus:ring-pastel-purple/20 outline-none transition-all"
                  />
                </div>

                {/* Create new diary option */}
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={createNew}
                    onChange={(e) => setCreateNew(e.target.checked)}
                    className="w-4 h-4 text-pastel-purple rounded focus:ring-pastel-purple"
                  />
                  <span className="text-sm text-gray-700">
                    새 일기장 바로 시작하기
                  </span>
                </label>

                {/* New diary title */}
                {createNew && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      새 일기장 이름
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder={`${diary.volume_number + 1}권`}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-pastel-purple focus:ring-2 focus:ring-pastel-purple/20 outline-none transition-all"
                    />
                  </motion.div>
                )}
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
                  {isLoading ? '처리 중...' : '마무리하기'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
