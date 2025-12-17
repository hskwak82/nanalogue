-- Update existing diaries with reasonable spine_position values
-- spine_position: 35 is roughly center of the allowed range (0-70%)

-- Update diaries that have spine_position = 0 (default) to a better centered value
UPDATE diaries
SET spine_position = 35
WHERE spine_position = 0 OR spine_position IS NULL;

-- Ensure spine_width has a reasonable default
UPDATE diaries
SET spine_width = 0.30
WHERE spine_width IS NULL;
