-- Announcements System Migration
-- Created: 2024-12-16

-- ============================================
-- ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'important', 'event')),
  is_active BOOLEAN DEFAULT true,
  is_popup BOOLEAN DEFAULT false, -- Show as popup modal
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'free', 'pro')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Public can read active announcements
CREATE POLICY "Anyone can view active announcements" ON announcements
  FOR SELECT USING (
    is_active = true
    AND starts_at <= NOW()
    AND (ends_at IS NULL OR ends_at > NOW())
  );

-- Only admins can manage announcements (using service role)

-- ============================================
-- ANNOUNCEMENT_READS TABLE (Track which users have read which announcements)
-- ============================================
CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, announcement_id)
);

-- Enable RLS
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Users can view and insert their own reads
CREATE POLICY "Users can view own announcement reads" ON announcement_reads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark announcements as read" ON announcement_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON announcement_reads(announcement_id);

-- ============================================
-- TRIGGER for updated_at
-- ============================================
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
