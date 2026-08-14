-- Migration: Remove column ativo from public.clientes
-- Date: 2026-08-14 14:02:00

ALTER TABLE public.clientes
  DROP COLUMN IF EXISTS ativo;
