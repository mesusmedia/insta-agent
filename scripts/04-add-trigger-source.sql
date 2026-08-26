-- Migration: add trigger_source column to automations table
-- Run this in Supabase SQL Editor if the column doesn't exist yet

ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS trigger_source TEXT NOT NULL DEFAULT 'comment'
    CHECK (trigger_source IN ('comment', 'dm', 'story'));

-- Backfill existing rows: treat any automation with trigger_type=mention/reaction/reply as story
UPDATE public.automations
SET trigger_source = 'story'
WHERE trigger_source = 'comment'
  AND trigger_type IN ('mention', 'reaction', 'reply');

-- Index for filtering by source
CREATE INDEX IF NOT EXISTS idx_automations_trigger_source ON public.automations(trigger_source);
CREATE INDEX IF NOT EXISTS idx_automations_user_source   ON public.automations(user_id, trigger_source);
