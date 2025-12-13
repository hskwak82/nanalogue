'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface DiaryActionsProps {
  date: string
  sessionId: string | null
}

export function DiaryActions({ date, sessionId }: DiaryActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // 대화 이어하기 - 기존 세션을 active로 변경하고 대화 계속
  async function handleContinue() {
    if (!sessionId) return
    setLoading(true)

    try {
      await supabase
        .from('daily_sessions')
        .update({ status: 'active', completed_at: null })
        .eq('id', sessionId)

      router.push('/session')
    } catch (error) {
      console.error('Failed to continue session:', error)
      alert('대화를 이어가는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 새로 작성하기 - 기존 세션과 일기 삭제 후 새로 시작
  async function handleRewrite() {
    if (!confirm('기존 일기가 삭제됩니다. 새로 작성하시겠습니까?')) return
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 일기 삭제
      await supabase
        .from('diary_entries')
        .delete()
        .eq('user_id', user.id)
        .eq('entry_date', date)

      // 세션 삭제
      await supabase
        .from('daily_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('session_date', date)

      router.push('/session')
    } catch (error) {
      console.error('Failed to rewrite:', error)
      alert('새로 작성하기에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={handleContinue}
        disabled={loading || !sessionId}
        className="inline-flex items-center rounded-lg border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
      >
        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        대화 추가하기
      </button>
      <button
        onClick={handleRewrite}
        disabled={loading}
        className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        새로 작성하기
      </button>
    </div>
  )
}
