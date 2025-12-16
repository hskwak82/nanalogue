-- Toss Payments Integration Migration
-- Created: 2024-12-16

-- ============================================
-- SUBSCRIPTION PLANS TABLE (Admin configurable)
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY, -- 'free', 'pro'
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Public read access for plans
CREATE POLICY "Anyone can view active plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- Insert default plans
INSERT INTO subscription_plans (id, name, price, features) VALUES
('free', '무료', 0, '["기본 템플릿", "사진 5개 제한", "기본 모양 크롭"]'::jsonb),
('pro', '프로', 4900, '["모든 템플릿", "무제한 사진", "하트/별 모양", "라쏘 크롭", "프리미엄 스티커"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ADD TOSS BILLING FIELDS TO SUBSCRIPTIONS
-- ============================================
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS toss_billing_key TEXT,
ADD COLUMN IF NOT EXISTS toss_customer_key TEXT,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS card_company TEXT,
ADD COLUMN IF NOT EXISTS card_number TEXT; -- Last 4 digits only

-- ============================================
-- PAYMENT HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id TEXT REFERENCES subscription_plans(id),
  payment_key TEXT,
  order_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'DONE', 'CANCELED', 'FAILED'
  failure_reason TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own payment history
CREATE POLICY "Users can view own payment history" ON payment_history
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_order_id ON payment_history(order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_key ON subscriptions(toss_billing_key);
