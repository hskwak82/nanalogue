'use client'

import { useMemo } from 'react'
import type { DiaryWithTemplates } from '@/types/diary'
import {
  SPINE_MIN_WIDTH,
  SPINE_MAX_WIDTH,
  SPINE_HEIGHT,
  ENTRIES_PER_PX,
  extractSpineColor,
  getContrastTextColor,
} from '@/types/diary'

export interface SpineCalculationResult {
  width: number
  height: number
  color: string
  gradient: string | null
  textColor: string
}

export function useSpineCalculations(diary: DiaryWithTemplates): SpineCalculationResult {
  return useMemo(() => {
    // Calculate width based on entry count
    const entryCount = diary.entry_count || 0
    const extraWidth = Math.floor(entryCount / ENTRIES_PER_PX)
    const width = Math.min(SPINE_MIN_WIDTH + extraWidth, SPINE_MAX_WIDTH)

    // Get spine color
    let color = diary.spine_color
    let gradient = diary.spine_gradient

    // If no explicit spine color, extract from cover template
    if (!color) {
      color = extractSpineColor(diary.cover_template?.image_url)
    }

    // Build gradient from cover template if spine_gradient not set
    if (!gradient && diary.cover_template?.image_url?.startsWith('gradient:')) {
      gradient = diary.cover_template.image_url.replace('gradient:', '')
    }

    // Calculate contrasting text color
    const textColor = getContrastTextColor(color)

    return {
      width,
      height: SPINE_HEIGHT,
      color,
      gradient,
      textColor,
    }
  }, [diary])
}

// Hook for multiple diaries (batch calculation)
export function useSpineCalculationsBatch(diaries: DiaryWithTemplates[]): SpineCalculationResult[] {
  return useMemo(() => {
    return diaries.map(diary => {
      const entryCount = diary.entry_count || 0
      const extraWidth = Math.floor(entryCount / ENTRIES_PER_PX)
      const width = Math.min(SPINE_MIN_WIDTH + extraWidth, SPINE_MAX_WIDTH)

      let color = diary.spine_color
      let gradient = diary.spine_gradient

      if (!color) {
        color = extractSpineColor(diary.cover_template?.image_url)
      }

      if (!gradient && diary.cover_template?.image_url?.startsWith('gradient:')) {
        gradient = diary.cover_template.image_url.replace('gradient:', '')
      }

      const textColor = getContrastTextColor(color)

      return { width, height: SPINE_HEIGHT, color, gradient, textColor }
    })
  }, [diaries])
}
