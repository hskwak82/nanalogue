// Point System Core Functions

import { createClient as createServiceClient } from '@supabase/supabase-js'
import type {
  UserPoints,
  PointTransaction,
  PointSetting,
  PointSettingKey,
  PointTransactionReason,
  EarnPointsResult,
  PointsResponse,
  DEFAULT_POINT_SETTINGS,
  STREAK_MILESTONES,
} from '@/types/points'

// Get service client for point operations (bypasses RLS)
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// Get all point settings
export async function getPointSettings(): Promise<Record<PointSettingKey, number>> {
  const supabase = getServiceClient()

  const { data } = await supabase
    .from('point_settings')
    .select('key, value')

  const settings: Record<string, number> = {}

  // Use defaults as base
  const defaults: Record<string, number> = {
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

  // Apply defaults
  Object.assign(settings, defaults)

  // Override with database values
  if (data) {
    for (const item of data) {
      settings[item.key] = item.value
    }
  }

  return settings as Record<PointSettingKey, number>
}

// Get a specific setting
export async function getPointSetting(key: PointSettingKey): Promise<number> {
  const settings = await getPointSettings()
  return settings[key]
}

// Update a point setting (admin only)
export async function updatePointSetting(
  key: PointSettingKey,
  value: number,
  updatedBy: string
): Promise<boolean> {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from('point_settings')
    .upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    }, { onConflict: 'key' })

  return !error
}

// Get user's point data
export async function getUserPoints(userId: string): Promise<UserPoints | null> {
  const supabase = getServiceClient()

  const { data } = await supabase
    .from('user_points')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  return data as UserPoints | null
}

// Initialize user points (called when user first needs points)
export async function initializeUserPoints(userId: string): Promise<UserPoints> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('user_points')
    .upsert({
      user_id: userId,
      balance: 0,
      total_earned: 0,
      total_spent: 0,
      current_streak: 0,
      longest_streak: 0,
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw error
  return data as UserPoints
}

// Get user points with initialization if needed
export async function getOrCreateUserPoints(userId: string): Promise<UserPoints> {
  let points = await getUserPoints(userId)
  if (!points) {
    points = await initializeUserPoints(userId)
  }
  return points
}

// Record a point transaction
async function recordTransaction(
  userId: string,
  type: 'earn' | 'spend' | 'bonus' | 'admin',
  amount: number,
  balanceAfter: number,
  reason: PointTransactionReason,
  referenceId?: string,
  description?: string
): Promise<void> {
  const supabase = getServiceClient()

  await supabase.from('point_transactions').insert({
    user_id: userId,
    type,
    amount,
    balance_after: balanceAfter,
    reason,
    reference_id: referenceId || null,
    description: description || null,
  })
}

// Calculate streak based on dates
function calculateStreak(lastDiaryDate: string | null, todayStr: string): {
  newStreak: number
  isConsecutive: boolean
} {
  if (!lastDiaryDate) {
    return { newStreak: 1, isConsecutive: false }
  }

  const today = new Date(todayStr)
  const lastDate = new Date(lastDiaryDate)
  const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    // Same day - already earned today
    return { newStreak: 0, isConsecutive: true }
  } else if (diffDays === 1) {
    // Consecutive day
    return { newStreak: 1, isConsecutive: true }
  } else {
    // Streak broken
    return { newStreak: 1, isConsecutive: false }
  }
}

// Earn points from writing a diary
export async function earnDiaryPoints(
  userId: string,
  diaryEntryId: string,
  entryDate: string
): Promise<EarnPointsResult | null> {
  const supabase = getServiceClient()
  const settings = await getPointSettings()

  // Check if points system is enabled
  if (!settings.points_enabled) {
    return null
  }

  // Get current user points
  const userPoints = await getOrCreateUserPoints(userId)

  // Check if already earned points for this date
  if (userPoints.last_diary_date === entryDate) {
    return null // Already earned for today
  }

  const bonuses: { reason: PointTransactionReason; amount: number }[] = []
  let totalEarned = 0

  // 1. Basic diary write points
  const diaryPoints = settings.diary_write_points
  totalEarned += diaryPoints
  bonuses.push({ reason: 'diary_write', amount: diaryPoints })

  // 2. First diary bonus (one-time)
  if (!userPoints.first_diary_earned && settings.first_diary_bonus > 0) {
    totalEarned += settings.first_diary_bonus
    bonuses.push({ reason: 'first_diary', amount: settings.first_diary_bonus })
  }

  // 3. Calculate streak
  const { newStreak, isConsecutive } = calculateStreak(userPoints.last_diary_date, entryDate)

  let currentStreak: number
  if (newStreak === 0) {
    // Already earned today
    return null
  } else if (isConsecutive) {
    currentStreak = userPoints.current_streak + 1
  } else {
    currentStreak = 1
  }

  // 4. Check streak bonuses
  if (settings.streak_enabled) {
    const streakMilestones: [number, PointSettingKey, PointTransactionReason][] = [
      [7, 'streak_7_bonus', 'streak_7'],
      [14, 'streak_14_bonus', 'streak_14'],
      [30, 'streak_30_bonus', 'streak_30'],
      [60, 'streak_60_bonus', 'streak_60'],
      [100, 'streak_100_bonus', 'streak_100'],
    ]

    for (const [milestone, settingKey, reason] of streakMilestones) {
      if (currentStreak === milestone && settings[settingKey] > 0) {
        totalEarned += settings[settingKey]
        bonuses.push({ reason, amount: settings[settingKey] })
      }
    }
  }

  // 5. Update user points
  const newBalance = userPoints.balance + totalEarned
  const newLongestStreak = Math.max(userPoints.longest_streak, currentStreak)

  const { error } = await supabase
    .from('user_points')
    .update({
      balance: newBalance,
      total_earned: userPoints.total_earned + totalEarned,
      current_streak: currentStreak,
      longest_streak: newLongestStreak,
      last_diary_date: entryDate,
      first_diary_earned: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) throw error

  // 6. Record transactions
  let runningBalance = userPoints.balance
  for (const bonus of bonuses) {
    runningBalance += bonus.amount
    await recordTransaction(
      userId,
      bonus.reason === 'diary_write' ? 'earn' : 'bonus',
      bonus.amount,
      runningBalance,
      bonus.reason,
      diaryEntryId
    )
  }

  return {
    points_earned: totalEarned,
    new_balance: newBalance,
    streak: currentStreak,
    bonuses,
  }
}

// Use points for payment
export async function usePointsForPayment(
  userId: string,
  amount: number,
  paymentId: string
): Promise<{ success: boolean; new_balance: number; error?: string }> {
  const supabase = getServiceClient()
  const settings = await getPointSettings()

  // Check if points system is enabled
  if (!settings.points_enabled) {
    return { success: false, new_balance: 0, error: '포인트 시스템이 비활성화되어 있습니다.' }
  }

  // Get current user points
  const userPoints = await getOrCreateUserPoints(userId)

  // Check sufficient balance
  if (userPoints.balance < amount) {
    return {
      success: false,
      new_balance: userPoints.balance,
      error: '포인트가 부족합니다.',
    }
  }

  // Deduct points
  const newBalance = userPoints.balance - amount

  const { error } = await supabase
    .from('user_points')
    .update({
      balance: newBalance,
      total_spent: userPoints.total_spent + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    return { success: false, new_balance: userPoints.balance, error: error.message }
  }

  // Record transaction
  await recordTransaction(
    userId,
    'spend',
    -amount,
    newBalance,
    'payment',
    paymentId
  )

  return { success: true, new_balance: newBalance }
}

// Admin grant points
export async function adminGrantPoints(
  userId: string,
  amount: number,
  adminId: string,
  description?: string
): Promise<{ success: boolean; new_balance: number; error?: string }> {
  const supabase = getServiceClient()

  // Get current user points
  const userPoints = await getOrCreateUserPoints(userId)

  const newBalance = userPoints.balance + amount

  const { error } = await supabase
    .from('user_points')
    .update({
      balance: newBalance,
      total_earned: userPoints.total_earned + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    return { success: false, new_balance: userPoints.balance, error: error.message }
  }

  // Record transaction
  await recordTransaction(
    userId,
    'admin',
    amount,
    newBalance,
    'admin_grant',
    adminId,
    description
  )

  return { success: true, new_balance: newBalance }
}

// Admin deduct points
export async function adminDeductPoints(
  userId: string,
  amount: number,
  adminId: string,
  description?: string
): Promise<{ success: boolean; new_balance: number; error?: string }> {
  const supabase = getServiceClient()

  // Get current user points
  const userPoints = await getOrCreateUserPoints(userId)

  // Check sufficient balance
  if (userPoints.balance < amount) {
    return {
      success: false,
      new_balance: userPoints.balance,
      error: '사용자의 포인트가 부족합니다.',
    }
  }

  const newBalance = userPoints.balance - amount

  const { error } = await supabase
    .from('user_points')
    .update({
      balance: newBalance,
      total_spent: userPoints.total_spent + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    return { success: false, new_balance: userPoints.balance, error: error.message }
  }

  // Record transaction
  await recordTransaction(
    userId,
    'admin',
    -amount,
    newBalance,
    'admin_deduct',
    adminId,
    description
  )

  return { success: true, new_balance: newBalance }
}

// Filter options for transactions
export interface TransactionFilter {
  type?: 'earn' | 'spend' | 'bonus' | 'admin' | 'all'
  startDate?: string
  endDate?: string
}

// Get point transactions for a user with filters
export async function getPointTransactions(
  userId: string,
  page: number = 1,
  limit: number = 20,
  filter?: TransactionFilter
): Promise<{ transactions: PointTransaction[]; total: number; hasMore: boolean }> {
  const supabase = getServiceClient()
  const offset = (page - 1) * limit

  // Build base query
  let countQuery = supabase
    .from('point_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  let dataQuery = supabase
    .from('point_transactions')
    .select('*')
    .eq('user_id', userId)

  // Apply filters
  if (filter) {
    if (filter.type && filter.type !== 'all') {
      countQuery = countQuery.eq('type', filter.type)
      dataQuery = dataQuery.eq('type', filter.type)
    }
    if (filter.startDate) {
      countQuery = countQuery.gte('created_at', filter.startDate)
      dataQuery = dataQuery.gte('created_at', filter.startDate)
    }
    if (filter.endDate) {
      // Add 1 day to include the end date fully
      const endDate = new Date(filter.endDate)
      endDate.setDate(endDate.getDate() + 1)
      countQuery = countQuery.lt('created_at', endDate.toISOString())
      dataQuery = dataQuery.lt('created_at', endDate.toISOString())
    }
  }

  // Get total count
  const { count } = await countQuery

  // Get transactions with ordering and pagination
  const { data } = await dataQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const total = count || 0
  const hasMore = offset + limit < total

  return {
    transactions: (data || []) as PointTransaction[],
    total,
    hasMore,
  }
}

// Get points response for API
export async function getPointsResponse(userId: string): Promise<PointsResponse> {
  const userPoints = await getOrCreateUserPoints(userId)
  const settings = await getPointSettings()

  // Calculate next streak bonus
  let nextStreakBonus: PointsResponse['next_streak_bonus'] = null

  if (settings.streak_enabled) {
    const streakMilestones: [number, PointSettingKey][] = [
      [7, 'streak_7_bonus'],
      [14, 'streak_14_bonus'],
      [30, 'streak_30_bonus'],
      [60, 'streak_60_bonus'],
      [100, 'streak_100_bonus'],
    ]

    for (const [milestone, settingKey] of streakMilestones) {
      if (userPoints.current_streak < milestone && settings[settingKey] > 0) {
        nextStreakBonus = {
          days_until: milestone - userPoints.current_streak,
          milestone,
          bonus_amount: settings[settingKey],
        }
        break
      }
    }
  }

  return {
    balance: userPoints.balance,
    current_streak: userPoints.current_streak,
    longest_streak: userPoints.longest_streak,
    total_earned: userPoints.total_earned,
    total_spent: userPoints.total_spent,
    last_diary_date: userPoints.last_diary_date,
    next_streak_bonus: nextStreakBonus,
  }
}
