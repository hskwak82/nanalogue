// Premium Feature Utilities

import { createClient } from '@/lib/supabase/server'
import type { PremiumFeature, UserSubscription, SubscriptionPlan } from '@/types/payment'

// Check if user has premium subscription
export async function isPremiumUser(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .single()

  if (!subscription) return false

  return subscription.plan === 'pro' && subscription.status === 'active'
}

// Get user's subscription details
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  return data as UserSubscription | null
}

// Get all active subscription plans from database
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })

  return (data || []) as SubscriptionPlan[]
}

// Get specific plan by ID
export async function getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .eq('is_active', true)
    .single()

  return data as SubscriptionPlan | null
}

// Check if user has access to a specific premium feature
export async function checkFeatureAccess(
  userId: string,
  feature: PremiumFeature
): Promise<boolean> {
  const isPremium = await isPremiumUser(userId)

  // All features require premium
  const premiumFeatures: PremiumFeature[] = [
    'unlimited_photos',
    'premium_shapes',
    'lasso_crop',
    'premium_templates',
    'premium_stickers',
  ]

  if (premiumFeatures.includes(feature)) {
    return isPremium
  }

  // Default: allow access
  return true
}

// Get photo limit for user
export async function getPhotoLimit(userId: string): Promise<number> {
  const isPremium = await isPremiumUser(userId)
  return isPremium ? Infinity : 5 // Free users: 5 photos per diary
}

// Check if a shape is available for user
export async function canUseShape(userId: string, shapeId: string): Promise<boolean> {
  const freeShapes = ['circle', 'square', 'diamond']
  const premiumShapes = ['heart', 'star']

  if (freeShapes.includes(shapeId)) {
    return true
  }

  if (premiumShapes.includes(shapeId)) {
    return await isPremiumUser(userId)
  }

  return true
}

// Check if lasso crop is available for user
export async function canUseLassoCrop(userId: string): Promise<boolean> {
  return await isPremiumUser(userId)
}

// Client-side helper: Format price for display
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(price)
}
