'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { DiaryWithTemplates } from '@/types/diary'
import { UnifiedBookshelf } from '@/components/bookshelf/UnifiedBookshelf'

interface DiaryEntry {
  id: string
  entry_date: string
  summary: string | null
  emotions: string[] | null
  diary_id: string
}

interface DiaryListClientProps {
  diaries: DiaryWithTemplates[]
  entries: DiaryEntry[]
  initialDiaryId?: string | null
}

export function DiaryListClient({
  diaries,
  entries,
  initialDiaryId
}: DiaryListClientProps) {
  // Find diary containing current date
  const findDiaryForCurrentDate = () => {
    const today = new Date().toISOString().split('T')[0]

    // First, check if there's an entry for today
    const todayEntry = entries.find(e => e.entry_date === today)
    if (todayEntry) {
      return todayEntry.diary_id
    }

    // Otherwise, find active diary
    const activeDiary = diaries.find(d => d.status === 'active')
    if (activeDiary) {
      return activeDiary.id
    }

    // Find diary whose date range contains today
    for (const diary of diaries) {
      const startDate = diary.start_date
      const endDate = diary.end_date || today
      if (startDate <= today && today <= endDate) {
        return diary.id
      }
    }

    // Fallback to first diary
    return diaries[0]?.id || null
  }

  const [selectedDiaryId, setSelectedDiaryId] = useState<string | null>(
    initialDiaryId || findDiaryForCurrentDate()
  )

  const selectedDiary = diaries.find(d => d.id === selectedDiaryId)
  const activeDiaryId = diaries.find(d => d.status === 'active')?.id

  // Filter entries by selected diary
  const filteredEntries = useMemo(() => {
    if (!selectedDiaryId) return entries
    return entries.filter(e => e.diary_id === selectedDiaryId)
  }, [entries, selectedDiaryId])

  // Group filtered entries by month
  const entriesByMonth = useMemo(() => {
    const grouped: Record<string, DiaryEntry[]> = {}
    filteredEntries.forEach((entry) => {
      const monthKey = entry.entry_date.substring(0, 7)
      if (!grouped[monthKey]) {
        grouped[monthKey] = []
      }
      grouped[monthKey].push(entry)
    })
    return grouped
  }, [filteredEntries])

  if (diaries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">아직 일기장이 없습니다.</p>
        <Link
          href="/session?entry=true"
          className="inline-flex items-center justify-center rounded-full bg-pastel-purple px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-pastel-purple-dark transition-all"
        >
          첫 일기 작성하기
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Bookshelf */}
      <UnifiedBookshelf
        diaries={diaries}
        selectedDiaryId={selectedDiaryId}
        activeDiaryId={activeDiaryId}
        onSelectDiary={(diary) => setSelectedDiaryId(diary.id)}
        showCustomizeLink
        layoutId="diary-list"
      />

      {/* Entries List */}
      {filteredEntries.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(entriesByMonth).map(([monthKey, monthEntries]) => (
            <div key={monthKey}>
              <h2 className="mb-4 text-lg font-semibold text-pastel-purple-dark">
                {new Date(monthKey + '-01').toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                })}
              </h2>
              <div className="space-y-3">
                {monthEntries.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/diary/${entry.entry_date}`}
                    className="block rounded-2xl bg-white/70 backdrop-blur-sm p-5 shadow-sm border border-pastel-pink/30 hover:shadow-md hover:bg-white/80 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-700">
                          {new Date(entry.entry_date).toLocaleDateString(
                            'ko-KR',
                            {
                              month: 'long',
                              day: 'numeric',
                              weekday: 'long',
                            }
                          )}
                        </p>
                        {entry.summary && (
                          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                            {entry.summary}
                          </p>
                        )}
                        {entry.emotions &&
                          Array.isArray(entry.emotions) &&
                          entry.emotions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {entry.emotions.slice(0, 3).map((emotion, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-full bg-pastel-purple-light px-2 py-0.5 text-xs text-pastel-purple-dark"
                                >
                                  {emotion}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {selectedDiary
              ? `${selectedDiary.title || `${selectedDiary.volume_number}권`}에 작성된 일기가 없습니다.`
              : '아직 작성된 일기가 없습니다.'}
          </p>
          <Link
            href="/session?entry=true"
            className="inline-flex items-center justify-center rounded-full bg-pastel-purple px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-pastel-purple-dark transition-all"
          >
            일기 작성하기
          </Link>
        </div>
      )}
    </div>
  )
}
