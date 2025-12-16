// Payment and Subscription Types

// Subscription plan from database (price configurable by admin)
export interface SubscriptionPlan {
  id: string // 'free', 'pro'
  name: string
  price: number
  features: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// User's subscription status
export interface UserSubscription {
  id: string
  user_id: string
  plan: 'free' | 'pro'
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  toss_billing_key: string | null
  toss_customer_key: string | null
  card_company: string | null
  card_number: string | null // Last 4 digits
  next_billing_date: string | null
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

// Payment history record
export interface PaymentHistory {
  id: string
  user_id: string
  plan_id: string
  payment_key: string | null
  order_id: string
  amount: number
  status: 'PENDING' | 'DONE' | 'CANCELED' | 'FAILED'
  failure_reason: string | null
  paid_at: string | null
  created_at: string
}

// Toss Payments API Response Types
export interface TossBillingKeyResponse {
  mId: string
  customerKey: string
  authenticatedAt: string
  method: string
  billingKey: string
  card: {
    issuerCode: string
    acquirerCode: string
    number: string
    cardType: string
    ownerType: string
  }
}

export interface TossPaymentResponse {
  mId: string
  version: string
  paymentKey: string
  status: 'DONE' | 'CANCELED' | 'ABORTED' | 'EXPIRED'
  orderId: string
  orderName: string
  requestedAt: string
  approvedAt: string
  card: {
    amount: number
    issuerCode: string
    acquirerCode: string
    number: string
    cardType: string
    ownerType: string
  }
  totalAmount: number
  balanceAmount: number
  method: string
}

export interface TossErrorResponse {
  code: string
  message: string
}

// API Request/Response types
export interface SubscribeRequest {
  authKey: string
  customerKey: string
  planId: string
}

export interface SubscribeResponse {
  success: boolean
  testMode?: boolean
  subscription?: UserSubscription
  error?: string
}

export interface CancelSubscriptionResponse {
  success: boolean
  message?: string
  error?: string
}

// Premium feature types
export type PremiumFeature =
  | 'unlimited_photos'
  | 'premium_shapes'
  | 'lasso_crop'
  | 'premium_templates'
  | 'premium_stickers'

// Test mode flag
export const IS_TEST_MODE = true // Set to false for production
