-- Migration: Add pending_action to public.whatsapp_agent_context table
-- Date: 2026-08-20 14:19:00

ALTER TABLE public.whatsapp_agent_context
  ADD COLUMN IF NOT EXISTS pending_action JSONB DEFAULT null;
