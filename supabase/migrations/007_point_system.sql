-- ============================================
-- 007: Point Reward System
-- Consolidated from: point_reward_system
-- 1 point = 1 won
-- ============================================

-- ============================================
-- USER_POINTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_diary_date DATE,
  first_diary_earned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);

-- ============================================
-- POINT_TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'spend', 'bonus', 'admin')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(type);

-- ============================================
-- POINT_SETTINGS TABLE
-- ============================================
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
  ('points_enabled', 1, '포인트 시스템 활성화 여부 (0: 비활성, 1: 활성)'),
  ('streak_enabled', 1, '스트릭 보너스 활성화 여부'),
  ('diary_write_points', 100, '일기 작성 시 기본 적립 포인트'),
  ('first_diary_bonus', 500, '첫 일기 작성 보너스 (1회)'),
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

-- RLS Policies
CREATE POLICY "Users can view own points" ON user_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all points" ON user_points
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view own transactions" ON point_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all transactions" ON point_transactions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Anyone can read settings" ON point_settings
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage settings" ON point_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION update_user_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_points_updated_at ON user_points;
CREATE TRIGGER user_points_updated_at
  BEFORE UPDATE ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_updated_at();

-- Auto-create user_points for new users
CREATE OR REPLACE FUNCTION initialize_user_points()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_points (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
