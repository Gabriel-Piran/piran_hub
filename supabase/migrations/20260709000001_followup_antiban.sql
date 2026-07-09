-- Migração: follow-up fracionado anti-banimento
-- Rode este arquivo no SQL Editor do Supabase do projeto Piran Hub.

ALTER TABLE followup_regras ADD COLUMN IF NOT EXISTS horario_inicio TIME DEFAULT '08:00';
ALTER TABLE followup_regras ADD COLUMN IF NOT EXISTS horario_fim TIME DEFAULT '18:00';
ALTER TABLE followup_regras ADD COLUMN IF NOT EXISTS intervalo_minutos_min INTEGER DEFAULT 1;
ALTER TABLE followup_regras ADD COLUMN IF NOT EXISTS intervalo_minutos_max INTEGER DEFAULT 5;
ALTER TABLE followup_regras ADD COLUMN IF NOT EXISTS dias_semana TEXT[] DEFAULT '{1,2,3,4,5}';

CREATE TABLE IF NOT EXISTS followup_fila (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  regra_id UUID REFERENCES followup_regras(id),
  mensagem_texto TEXT,
  midia_url TEXT,
  tipo TEXT DEFAULT 'texto',
  agendado_para TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','erro','cancelado')),
  tentativas INTEGER DEFAULT 0,
  erro_mensagem TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  enviado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_followup_fila_agendado ON followup_fila(agendado_para) WHERE status='pendente';
