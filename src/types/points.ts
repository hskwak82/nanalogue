// Point System Types
// 1 point = 1 won

export interface UserPoints {
  id: string
  user_id: string
  balance: number
  total_earned: number
  total_spent: number
  current_streak: number
  longest_streak: number
  last_diary_date: string | null
  first_diary_earned: boolean
  created_at: string
  updated_at: string
}

export type PointTransactionType = 'earn' | 'spend' | 'bonus' | 'admin'

export type PointTransactionReason =
  | 'diary_write'
  | 'first_diary'
  | 'streak_7'
  | 'streak_14'
  | 'streak_30'
  | 'streak_60'
  | 'streak_100'
  | 'payment'
  | 'admin_grant'
  | 'admin_deduct'

export interface PointTransaction {
  id: string
  user_id: string
  type: PointTransactionType
  amount: number
  balance_after: number
  reason: PointTransactionReason
  reference_id: string | null
  description: string | null
  created_at: string
}

export interface PointSetting {
  id: string
  key: string
  value: number
  description: string | null
  updated_at: string
  updated_by: string | null
}

// Settings keys
export type PointSettingKey =
  | 'points_enabled'
  | 'streak_enabled'
  | 'diary_write_points'
  | 'first_diary_bonus'
  | 'streak_7_bonus'
  | 'streak_14_bonus'
  | 'streak_30_bonus'
  | 'streak_60_bonus'
  | 'streak_100_bonus'

// Default settings values
export const DEFAULT_POINT_SETTINGS: Record<PointSettingKey, number> = {
  points_enabled: 1,
  streak_enabled: 1,
  diary_write_points: 100,
  first_diary_bonus: 500,
  streak_7_bonus: 300,
  streak_14_bonus: 700,
  streak_30_bonus: 1500,
  streak_60_bonus: 3500,
  streak_100_bonus: 7000,
}

// Streak milestones
export const STREAK_MILESTONES = [7, 14, 30, 60, 100] as const

// API Response types
export interface PointsResponse {
  balance: number
  current_streak: number
  longest_streak: number
  total_earned: number
  total_spent: number
  last_diary_date: string | null
  next_streak_bonus: {
    days_until: number
    milestone: number
    bonus_amount: number
  } | null
}

export interface PointHistoryResponse {
  transactions: PointTransaction[]
  total: number
  page: number
  limit: number
}

export interface EarnPointsResult {
  points_earned: number
  new_balance: number
  streak: number
  bonuses: {
    reason: PointTransactionReason
    amount: number
  }[]
}

// Helper to get reason label in Korean
export function getReasonLabel(reason: PointTransactionReason): string {
  const labels: Record<PointTransactionReason, string> = {
    diary_write: '일기 작성',
    first_diary: '첫 일기 보너스',
    streak_7: '7일 연속 보너스',
    streak_14: '14일 연속 보너스',
    streak_30: '30일 연속 보너스',
    streak_60: '60일 연속 보너스',
    streak_100: '100일 연속 보너스',
    payment: '구독 결제 사용',
    admin_grant: '관리자 지급',
    admin_deduct: '관리자 차감',
  }
  return labels[reason] || reason
}

// Helper to get transaction type label
export function getTypeLabel(type: PointTransactionType): string {
  const labels: Record<PointTransactionType, string> = {
    earn: '적립',
    spend: '사용',
    bonus: '보너스',
    admin: '관리자',
  }
  return labels[type] || type
}
