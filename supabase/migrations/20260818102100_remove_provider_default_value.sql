-- Migration: Remove default value for provider column in public.whatsapp_integracao table
-- Date: 2026-08-18 10:21:00

ALTER TABLE public.whatsapp_integracao ALTER COLUMN provider DROP DEFAULT;
