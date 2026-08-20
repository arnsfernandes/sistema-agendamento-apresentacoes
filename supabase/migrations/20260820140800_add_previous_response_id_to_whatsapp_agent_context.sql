-- Migration: Add previous_response_id to public.whatsapp_agent_context table
-- Date: 2026-08-20 14:08:00

ALTER TABLE public.whatsapp_agent_context
  ADD COLUMN IF NOT EXISTS previous_response_id TEXT;
