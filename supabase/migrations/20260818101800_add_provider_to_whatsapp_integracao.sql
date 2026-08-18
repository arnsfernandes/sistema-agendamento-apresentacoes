-- Migration: Add provider column to public.whatsapp_integracao table
-- Date: 2026-08-18 10:18:00

ALTER TABLE public.whatsapp_integracao ADD COLUMN provider TEXT NOT NULL DEFAULT 'uazapi';
