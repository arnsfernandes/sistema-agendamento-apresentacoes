-- Migration: Adapt public.whatsapp_integracao to support single global master WhatsApp integration
-- Date: 2026-08-18 09:58:00

-- 1. Drop the user-isolated SELECT RLS policy first (so column user_id has no dependencies)
DROP POLICY IF EXISTS "Whatsapp integracao isolation select policy" ON public.whatsapp_integracao;

-- 2. Drop the foreign key constraint that references auth.users
ALTER TABLE public.whatsapp_integracao DROP CONSTRAINT IF EXISTS whatsapp_integracao_user_id_fkey;

-- 3. Drop user_id column
ALTER TABLE public.whatsapp_integracao DROP COLUMN IF EXISTS user_id;

-- 4. Drop the old partial unique index which was user-scoped
DROP INDEX IF EXISTS public.unique_active_whatsapp_integration_per_user;

-- 5. Create a new global unique index to enforce at most 1 active WhatsApp integration in the entire database
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_global_whatsapp_integration
  ON public.whatsapp_integracao ((1))
  WHERE (ativo = true);
