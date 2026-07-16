-- ================================================================
-- Migration: Deduplicate bot_notification_events and add UNIQUE constraint
-- ================================================================

-- 1. Identify and keep only the oldest record for each duplicate group
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY event_type, entity_id, recipient_telegram_id 
      ORDER BY created_at ASC
    ) as row_num
  FROM public.bot_notification_events
)
-- 2. Delete all rows that are not the first (oldest) in their group
DELETE FROM public.bot_notification_events
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE row_num > 1
);

-- 3. Now that duplicates are gone, we can safely add the UNIQUE constraint
ALTER TABLE public.bot_notification_events
ADD CONSTRAINT bot_notification_events_unique_claim 
UNIQUE (event_type, entity_id, recipient_telegram_id);
