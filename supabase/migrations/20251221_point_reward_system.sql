-- Point Reward System Migration
-- 1 point = 1 won

-- User Points Table (stores current balance and streak info)
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),  -- Current point balance
  total_earned INTEGER DEFAULT 0,  -- Total points earned
  total_spent INTEGER DEFAULT 0,  -- Total points spent
  current_streak INTEGER DEFAULT 0,  -- Current consecutive days
  longest_streak INTEGER DEFAULT 0,  -- Longest streak ever
  last_diary_date DATE,  -- Last diary written date
  first_diary_earned BOOLEAN DEFAULT FALSE,  -- First diary bonus claimed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for user lookup
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);

-- Point Transactions Table (logs all point changes)
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'spend', 'bonus', 'admin')),
  amount INTEGER NOT NULL,  -- Positive: earn, Negative: spend
  balance_after INTEGER NOT NULL,  -- Balance after transaction
  reason VARCHAR(100) NOT NULL,  -- diary_write, streak_7, streak_30, payment, admin_grant, admin_deduct
  reference_id UUID,  -- diary_entry_id or payment_history_id
  description TEXT,  -- Optional description (for admin actions)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for transaction queries
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(type);

-- Point Settings Table (admin-configurable)
CREATE TABLE IF NOT EXISTS point_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) UNIQUE NOT NULL,
  value INTEGER NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO point_settings (key, value, description) VALUES
  -- System settings
  ('points_enabled', 1, '포인트 시스템 활성화 여부 (0: 비활성, 1: 활성)'),
  ('streak_enabled', 1, '스트릭 보너스 활성화 여부'),

  -- Basic earning
  ('diary_write_points', 100, '일기 작성 시 기본 적립 포인트'),
  ('first_diary_bonus', 500, '첫 일기 작성 보너스 (1회)'),

  -- Streak bonuses
  ('streak_7_bonus', 300, '7일 연속 달성 보너스'),
  ('streak_14_bonus', 700, '14일 연속 달성 보너스'),
  ('streak_30_bonus', 1500, '30일 연속 달성 보너스'),
  ('streak_60_bonus', 3500, '60일 연속 달성 보너스'),
  ('streak_100_bonus', 7000, '100일 연속 달성 보너스')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_points
CREATE POLICY "Users can view own points" ON user_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all points" ON user_points
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for point_transactions
CREATE POLICY "Users can view own transactions" ON point_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all transactions" ON point_transactions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for point_settings
CREATE POLICY "Anyone can read settings" ON point_settings
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage settings" ON point_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS user_points_updated_at ON user_points;
CREATE TRIGGER user_points_updated_at
  BEFORE UPDATE ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_updated_at();

-- Function to initialize user_points for new users
CREATE OR REPLACE FUNCTION initialize_user_points()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_points (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user_points for new users
DROP TRIGGER IF EXISTS on_auth_user_created_points ON auth.users;
CREATE TRIGGER on_auth_user_created_points
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_points();

-- Initialize points for existing users
INSERT INTO user_points (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_points)
ON CONFLICT (user_id) DO NOTHING;
