'use client'

import { useState } from 'react'
import { updateProfileName } from './actions'

interface ProfileSectionProps {
  userId: string
  email: string
  initialName: string | null
}

export function ProfileSection({ userId, email, initialName }: ProfileSectionProps) {
  const [name, setName] = useState(initialName || '')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setLoading(true)
    setMessage(null)

    const result = await updateProfileName(name)

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
      setLoading(false)
    } else {
      setMessage({ type: 'success', text: '저장되었습니다.' })
      setIsEditing(false)
      setLoading(false)
      // Refresh the page to update navigation
      setTimeout(() => window.location.reload(), 500)
    }
  }

  const handleCancel = () => {
    setName(initialName || '')
    setIsEditing(false)
    setMessage(null)
  }

  return (
    <section className="mb-8 rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
      <h2 className="mb-4 text-lg font-semibold text-gray-700">프로필</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-500">
            이메일
          </label>
          <p className="mt-1 text-gray-700">{email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">
            이름
          </label>
          {isEditing ? (
            <div className="mt-1 space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full rounded-xl border border-pastel-pink px-3 py-2 text-gray-700 focus:border-pastel-purple focus:outline-none focus:ring-1 focus:ring-pastel-purple"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-pastel-purple text-white text-sm font-medium rounded-lg hover:bg-pastel-purple-dark transition-colors disabled:opacity-50"
                >
                  {loading ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-1 flex items-center justify-between">
              <p className="text-gray-700">{initialName || '-'}</p>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-pastel-purple hover:text-pastel-purple-dark font-medium"
              >
                수정
              </button>
            </div>
          )}
        </div>
        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}
      </div>
    </section>
  )
}
