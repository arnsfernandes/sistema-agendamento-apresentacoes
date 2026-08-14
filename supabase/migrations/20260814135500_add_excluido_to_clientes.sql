-- Migration: Add column excluido to public.clientes
-- Date: 2026-08-14 13:55:00

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS excluido BOOLEAN NOT NULL DEFAULT false;
