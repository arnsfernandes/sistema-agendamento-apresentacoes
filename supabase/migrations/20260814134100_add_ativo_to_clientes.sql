-- Migration: Add column ativo to public.clientes
-- Date: 2026-08-14 13:41:00

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;
