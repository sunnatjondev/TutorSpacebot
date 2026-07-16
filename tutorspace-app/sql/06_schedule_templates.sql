-- Add schedule_template column to groups
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS schedule_template JSONB DEFAULT '[]'::jsonb;
