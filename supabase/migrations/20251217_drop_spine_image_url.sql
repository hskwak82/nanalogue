-- Drop spine_image_url column from diaries table
-- This column is no longer needed since we now use cover_image_url + spine_position for dynamic cropping

ALTER TABLE diaries DROP COLUMN IF EXISTS spine_image_url;
