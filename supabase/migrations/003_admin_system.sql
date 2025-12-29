-- ============================================
-- 003: Admin System & Announcements
-- Consolidated from: admin_system, announcements
-- ============================================

-- ============================================
-- ADMIN USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view admin_users" ON admin_users
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

CREATE POLICY "Only super_admins can insert admin_users" ON admin_users
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE role = 'super_admin')
  );

CREATE POLICY "Only super_admins can delete admin_users" ON admin_users
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE role = 'super_admin')
  );

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- ============================================
-- ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'important', 'event')),
  is_active BOOLEAN DEFAULT true,
  is_popup BOOLEAN DEFAULT false,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'free', 'pro')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active announcements" ON announcements
  FOR SELECT USING (
    is_active = true
    AND starts_at <= NOW()
    AND (ends_at IS NULL OR ends_at > NOW())
  );

-- ============================================
-- ANNOUNCEMENT_READS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, announcement_id)
);

ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own announcement reads" ON announcement_reads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark announcements as read" ON announcement_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON announcement_reads(announcement_id);

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
