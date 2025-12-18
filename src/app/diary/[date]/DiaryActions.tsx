'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast, useConfirm } from '@/components/ui'
import { cleanupWebRTC } from '@/lib/webrtc-cleanup'

interface DiaryActionsProps {
  date: string
  sessionId: string | null
}

export function DiaryActions({ date, sessionId }: DiaryActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { confirm } = useConfirm()

  // Clean up any lingering WebRTC resources when this page loads
  useEffect(() => {
    console.log('[DiaryActions] Cleaning up WebRTC on mount')
    cleanupWebRTC()
  }, [])

  // 대화 이어하기 - 기존 세션을 active로 변경하고 대화 계속
  async function handleContinue() {
    if (!sessionId) return
    setLoading(true)

    try {
      await supabase
        .from('daily_sessions')
        .update({ status: 'active', completed_at: null })
        .eq('id', sessionId)

      router.push('/session?entry=true')
    } catch (error) {
      console.error('Failed to continue session:', error)
      toast.error('대화를 이어가는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 새로 작성하기 - 기존 세션과 일기 삭제 후 새로 시작
  async function handleRewrite() {
    const confirmed = await confirm({
      title: '새로 작성하기',
      message: '기존 일기가 삭제됩니다. 새로 작성하시겠습니까?',
      confirmText: '새로 작성',
      variant: 'warning',
    })
    if (!confirmed) return
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

      router.push('/session?entry=true')
    } catch (error) {
      console.error('Failed to rewrite:', error)
      toast.error('새로 작성하기에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={handleContinue}
        disabled={loading || !sessionId}
        className="inline-flex items-center rounded-full border border-pastel-purple px-4 py-2 text-sm font-medium text-pastel-purple hover:bg-pastel-purple-light transition-all disabled:opacity-50"
      >
        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        대화 추가하기
      </button>
      <button
        onClick={handleRewrite}
        disabled={loading}
        className="inline-flex items-center rounded-full border border-pastel-pink px-4 py-2 text-sm font-medium text-gray-600 hover:bg-pastel-pink-light transition-all disabled:opacity-50"
      >
        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        새로 작성하기
      </button>
    </div>
  )
}
