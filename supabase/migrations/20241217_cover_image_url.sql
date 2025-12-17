-- Add cover_image_url column to diaries table
-- This stores a pre-rendered image of the cover for fast display in dashboard/home

ALTER TABLE public.diaries
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.diaries.cover_image_url IS 'Pre-rendered cover image URL for fast display in dashboard/home views';
