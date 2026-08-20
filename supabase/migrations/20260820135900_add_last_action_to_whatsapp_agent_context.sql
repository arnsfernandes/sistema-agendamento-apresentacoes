-- Migration: Add last_action to public.whatsapp_agent_context table
-- Date: 2026-08-20 13:59:00

ALTER TABLE public.whatsapp_agent_context
  ADD COLUMN IF NOT EXISTS last_action TEXT;
