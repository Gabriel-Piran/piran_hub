-- Migração: 7 funcionalidades novas do Piran Hub
-- Rode este arquivo inteiro no SQL Editor do Supabase do projeto Piran Hub.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Feature 1: modo de atendimento (IA / humano / pendente) + departamento no lead
ALTER TABLE leads ADD COLUMN IF NOT EXISTS modo_atendimento TEXT NOT NULL DEFAULT 'ia'
  CHECK (modo_atendimento IN ('ia', 'humano', 'pendente'));

-- Feature 7: departamentos (criada antes por causa da FK abaixo)
CREATE TABLE IF NOT EXISTS departamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#c9a84c',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS departamento_id UUID REFERENCES departamentos(id);

CREATE TABLE IF NOT EXISTS usuarios_departamentos (
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  departamento_id UUID REFERENCES departamentos(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, departamento_id)
);

-- Feature 5/6: agendamento de mensagens e notas internas
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS agendado_para TIMESTAMPTZ;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS nota_interna BOOLEAN DEFAULT false;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS enviado_em_real TIMESTAMPTZ;
-- Necessário além do pedido original: marca o desfecho de uma mensagem agendada
-- ('enviado' | 'cancelado'), usado pelo endpoint que o n8n consulta a cada minuto
-- para não reprocessar a mesma mensagem depois de enviada/cancelada.
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS acao_executada TEXT
  CHECK (acao_executada IN ('enviado', 'cancelado'));

-- Feature 2: mensagens rápidas
CREATE TABLE IF NOT EXISTS mensagens_rapidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('texto', 'audio', 'video', 'imagem')),
  conteudo TEXT,
  midia_url TEXT,
  atalho TEXT UNIQUE,
  departamento_id UUID REFERENCES departamentos(id),
  ativo BOOLEAN DEFAULT true,
  criado_por TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Feature 3: estágios customizáveis
CREATE TABLE IF NOT EXISTS estagios_customizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cor TEXT DEFAULT '#6b7280',
  icone TEXT,
  ordem INTEGER NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Feature 4: regras de follow-up automático
CREATE TABLE IF NOT EXISTS followup_regras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  estagio_gatilho TEXT NOT NULL,
  dias_espera INTEGER NOT NULL DEFAULT 1,
  hora_envio TIME DEFAULT '09:00',
  mensagem_rapida_id UUID REFERENCES mensagens_rapidas(id),
  mensagem_texto TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Necessário além do pedido original: garante idempotência do follow-up
-- (sem isso, /api/followup-processar reenviaria a mesma regra pro mesmo lead
-- a cada chamada do cron do n8n).
CREATE TABLE IF NOT EXISTS followups_enviados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  regra_id UUID REFERENCES followup_regras(id) ON DELETE CASCADE,
  enviado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lead_id, regra_id)
);

-- Dados iniciais
INSERT INTO departamentos (nome, descricao, cor) VALUES
  ('Comercial', 'Atendimento e qualificação de novos leads', '#c9a84c'),
  ('Pós-venda', 'Acompanhamento de clientes com contrato assinado', '#6b7280')
ON CONFLICT DO NOTHING;

INSERT INTO estagios_customizados (nome, slug, cor, ordem) VALUES
  ('Recepção', 'RECEPCAO', '#6b7280', 1),
  ('Triagem', 'TRIAGEM_DOMESTICO', '#6b7280', 2),
  ('Qualificação', 'QUALIFICACAO_SALARIO', '#3b82f6', 3),
  ('Proposta', 'PROPOSTA', '#f59e0b', 4),
  ('Coleta Docs', 'COLETA_RG', '#8b5cf6', 5),
  ('Contrato', 'CONTRATO', '#c9a84c', 6),
  ('Aguardando', 'AGUARDANDO', '#10b981', 7)
ON CONFLICT (slug) DO NOTHING;
