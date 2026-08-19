-- Migration: Add lembrete_enviado_em column to public.apresentacoes
-- Date: 2026-08-19 14:52:00

ALTER TABLE public.apresentacoes
  ADD COLUMN IF NOT EXISTS lembrete_enviado_em timestamp with time zone NULL;
