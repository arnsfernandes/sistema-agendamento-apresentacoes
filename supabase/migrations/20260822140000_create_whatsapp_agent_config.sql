-- Migration: Create public.whatsapp_agent_config table and RLS policies
-- Date: 2026-08-22 14:00:00

CREATE TABLE IF NOT EXISTS public.whatsapp_agent_config (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  model_name TEXT NOT NULL DEFAULT 'gpt-4o-mini'
    CONSTRAINT chk_model_name CHECK (model_name IN ('gpt-4o-mini', 'gpt-4o')),
  tom_agente TEXT NOT NULL DEFAULT 'profissional'
    CONSTRAINT chk_tom_agente CHECK (tom_agente IN ('profissional', 'amigavel', 'conciso', 'formal')),
  tempo_contexto_minutos INTEGER NOT NULL DEFAULT 30
    CONSTRAINT chk_tempo_contexto CHECK (tempo_contexto_minutos BETWEEN 5 AND 1440),
  cap_gerenciar_reunioes BOOLEAN NOT NULL DEFAULT true,
  cap_participacoes BOOLEAN NOT NULL DEFAULT true,
  cap_clientes BOOLEAN NOT NULL DEFAULT true,
  cap_lembretes_pessoais BOOLEAN NOT NULL DEFAULT true,
  msg_aviso_inativo TEXT NOT NULL DEFAULT 'Olá! Nosso assistente virtual está temporariamente desativado.',
  msg_erro_generico TEXT NOT NULL DEFAULT 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente em instantes.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_agent_config ENABLE ROW LEVEL SECURITY;

-- Policy for select/insert/update/delete based on user_id
DROP POLICY IF EXISTS "Whatsapp_agent_config isolation policy" ON public.whatsapp_agent_config;
CREATE POLICY "Whatsapp_agent_config isolation policy" ON public.whatsapp_agent_config
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
