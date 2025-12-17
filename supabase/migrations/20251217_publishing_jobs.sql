-- Publishing jobs table for diary book publishing feature
-- Tracks PDF generation jobs for admin-initiated publishing

CREATE TABLE IF NOT EXISTS diary_publish_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diary_id UUID NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- Generated PDF URLs (stored in Supabase storage)
  front_cover_url TEXT,
  back_cover_url TEXT,
  spine_url TEXT,
  inner_pages_url TEXT,
  complete_package_url TEXT, -- ZIP file with all PDFs

  -- Job metadata
  error_message TEXT,
  page_count INTEGER, -- Number of inner pages generated

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Index for efficient queries
  CONSTRAINT unique_pending_job_per_diary UNIQUE (diary_id, status)
    DEFERRABLE INITIALLY DEFERRED -- Allow only one pending/processing job per diary
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_publish_jobs_diary_id ON diary_publish_jobs(diary_id);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_admin_user_id ON diary_publish_jobs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_status ON diary_publish_jobs(status);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_created_at ON diary_publish_jobs(created_at DESC);

-- Add print_aspect_ratio to diaries table for future use
ALTER TABLE diaries ADD COLUMN IF NOT EXISTS print_aspect_ratio DECIMAL(3,2) DEFAULT 0.72;

-- RLS policies for publish jobs (admin only)
ALTER TABLE diary_publish_jobs ENABLE ROW LEVEL SECURITY;

-- Admin users can manage all publish jobs
CREATE POLICY "Admin users can manage publish jobs" ON diary_publish_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Comment for documentation
COMMENT ON TABLE diary_publish_jobs IS 'Tracks PDF generation jobs for diary book publishing. Stores URLs to generated PDF files (covers, spine, inner pages) in Supabase storage.';
COMMENT ON COLUMN diary_publish_jobs.status IS 'Job status: pending (queued), processing (generating), completed (ready for download), failed (error occurred)';
COMMENT ON COLUMN diaries.print_aspect_ratio IS 'Aspect ratio for print: 0.72 (180x250mm)';
