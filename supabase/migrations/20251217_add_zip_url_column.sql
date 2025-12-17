-- Add zip_url column to diary_publish_jobs table
-- This allows storing all publishing PDFs in a single ZIP file for better storage efficiency

ALTER TABLE diary_publish_jobs
ADD COLUMN IF NOT EXISTS zip_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN diary_publish_jobs.zip_url IS 'URL to ZIP file containing all publishing PDFs (front cover, back cover, spine, inner pages)';
