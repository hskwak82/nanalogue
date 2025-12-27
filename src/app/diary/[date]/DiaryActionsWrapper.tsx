'use client'

import dynamic from 'next/dynamic'

// Dynamic import with ssr: false to ensure client-side only rendering
const DiaryActions = dynamic(
  () => import('./DiaryActions').then(mod => ({ default: mod.DiaryActions })),
  { ssr: false }
)

interface DiaryActionsWrapperProps {
  date: string
  sessionId: string | null
}

export function DiaryActionsWrapper({ date, sessionId }: DiaryActionsWrapperProps) {
  return <DiaryActions date={date} sessionId={sessionId} />
}
