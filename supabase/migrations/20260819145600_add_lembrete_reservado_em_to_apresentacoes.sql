-- Migration: Add lembrete_reservado_em column to public.apresentacoes
-- Date: 2026-08-19 14:56:00

ALTER TABLE public.apresentacoes
  ADD COLUMN IF NOT EXISTS lembrete_reservado_em timestamp with time zone NULL;
