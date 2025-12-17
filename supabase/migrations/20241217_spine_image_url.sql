-- Add spine_image_url column to diaries table
-- This stores the user-selected portion of the cover to show on the bookshelf spine

ALTER TABLE diaries
ADD COLUMN IF NOT EXISTS spine_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN diaries.spine_image_url IS 'Pre-rendered spine image URL (user-selected region from cover)';
