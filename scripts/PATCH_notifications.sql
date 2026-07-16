-- ================================================================
-- PATCH: Add notification preferences to users table
-- ================================================================

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS lesson_reminders_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS payment_alerts_enabled BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.bot_notification_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  recipient_telegram_id BIGINT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_type, entity_id, recipient_telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_bot_notification_events_sent_at
  ON public.bot_notification_events(sent_at);

ALTER TABLE public.bot_notification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bot_notification_events_service_role ON public.bot_notification_events;
CREATE POLICY bot_notification_events_service_role ON public.bot_notification_events
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
