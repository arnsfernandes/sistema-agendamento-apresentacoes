-- Migration: Create public.usuario_whatsapp table and migrate existing data
-- Date: 2026-08-20 09:39:00

CREATE TABLE IF NOT EXISTS public.usuario_whatsapp (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usuario_whatsapp ENABLE ROW LEVEL SECURITY;

-- Create policy for user access
DROP POLICY IF EXISTS "Usuario_whatsapp isolation policy" ON public.usuario_whatsapp;
CREATE POLICY "Usuario_whatsapp isolation policy" ON public.usuario_whatsapp
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Migrate existing data
DO $$
DECLARE
  v_dup_count INT;
BEGIN
  -- Check for duplicates before migrating
  SELECT count(*) INTO v_dup_count
  FROM (
    SELECT raw_user_meta_data->>'whatsapp_number'
    FROM auth.users
    WHERE raw_user_meta_data->>'whatsapp_number' IS NOT NULL
    GROUP BY raw_user_meta_data->>'whatsapp_number'
    HAVING count(*) > 1
  ) AS dups;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'Erro de migração: existem números de WhatsApp duplicados entre usuários.';
  END IF;

  -- Insert non-duplicate records
  INSERT INTO public.usuario_whatsapp (user_id, whatsapp_number)
  SELECT id, raw_user_meta_data->>'whatsapp_number'
  FROM auth.users
  WHERE raw_user_meta_data->>'whatsapp_number' IS NOT NULL
  ON CONFLICT (user_id) DO UPDATE 
  SET whatsapp_number = EXCLUDED.whatsapp_number,
      updated_at = now();
END $$;
