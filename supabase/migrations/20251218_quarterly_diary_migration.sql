-- ============================================
-- Quarterly Diary Migration
-- Purpose: Convert existing diaries to quarterly format based on entry dates
-- ============================================

-- This migration updates existing diary titles to quarterly format
-- and normalizes their start_date/end_date to quarter boundaries

-- ============================================
-- STEP 1: Update diary titles to quarterly format
-- Based on the earliest entry date (or start_date if no entries)
-- ============================================

WITH diary_reference_dates AS (
  -- Get reference date for each diary (earliest entry date or start_date)
  SELECT
    d.id as diary_id,
    d.title as current_title,
    COALESCE(
      (SELECT MIN(entry_date) FROM diary_entries WHERE diary_id = d.id),
      d.start_date,
      d.created_at::date
    ) as reference_date
  FROM diaries d
),
diary_quarters AS (
  -- Calculate quarter info for each diary
  SELECT
    diary_id,
    current_title,
    reference_date,
    EXTRACT(YEAR FROM reference_date)::INT as year,
    CEIL(EXTRACT(MONTH FROM reference_date)::DECIMAL / 3)::INT as quarter
  FROM diary_reference_dates
)
-- Update titles to quarterly format (only if not already in that format)
UPDATE diaries d
SET
  title = dq.year || '년 ' || dq.quarter || '분기',
  updated_at = NOW()
FROM diary_quarters dq
WHERE d.id = dq.diary_id
  AND d.title NOT LIKE '%분기';

-- ============================================
-- STEP 2: Normalize start_date to quarter start
-- ============================================

WITH diary_reference_dates AS (
  SELECT
    d.id as diary_id,
    COALESCE(
      (SELECT MIN(entry_date) FROM diary_entries WHERE diary_id = d.id),
      d.start_date,
      d.created_at::date
    ) as reference_date
  FROM diaries d
)
UPDATE diaries d
SET
  start_date = DATE_TRUNC('quarter', drd.reference_date)::DATE,
  updated_at = NOW()
FROM diary_reference_dates drd
WHERE d.id = drd.diary_id
  AND d.start_date IS DISTINCT FROM DATE_TRUNC('quarter', drd.reference_date)::DATE;

-- ============================================
-- STEP 3: Set end_date for completed diaries (last day of their quarter)
-- ============================================

UPDATE diaries
SET
  end_date = (DATE_TRUNC('quarter', start_date) + INTERVAL '3 months' - INTERVAL '1 day')::DATE,
  updated_at = NOW()
WHERE status = 'completed'
  AND end_date IS NULL
  AND start_date IS NOT NULL;

-- ============================================
-- STEP 4: Mark all but the most recent diary as completed
-- (for users with multiple active diaries)
-- ============================================

WITH ranked_diaries AS (
  SELECT
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY volume_number DESC) as rn
  FROM diaries
  WHERE status = 'active'
)
UPDATE diaries d
SET
  status = 'completed',
  end_date = COALESCE(d.end_date, (DATE_TRUNC('quarter', d.start_date) + INTERVAL '3 months' - INTERVAL '1 day')::DATE),
  updated_at = NOW()
FROM ranked_diaries rd
WHERE d.id = rd.id
  AND rd.rn > 1;

-- ============================================
-- Verification query (for manual check after migration)
-- Run this to verify the migration results:
-- ============================================
-- SELECT
--   id,
--   user_id,
--   volume_number,
--   title,
--   status,
--   start_date,
--   end_date,
--   created_at
-- FROM diaries
-- ORDER BY user_id, volume_number;
