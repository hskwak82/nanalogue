-- Update spine_width from old default (0.30) to print-accurate ratio (0.0667)
-- 12mm spine / 180mm cover = 6.67%

-- Update existing diaries that have the old default spine_width
UPDATE diaries
SET spine_width = 0.0667
WHERE spine_width = 0.30 OR spine_width IS NULL;

-- Update the default value for new diaries
ALTER TABLE diaries ALTER COLUMN spine_width SET DEFAULT 0.0667;
