-- Migração: sistema de Tools/Comandos (ações @ e regras condicionais)
-- Rode este arquivo no SQL Editor do Supabase do projeto Piran Hub.

CREATE TABLE acoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('estagio','status','mensagem','webhook','transferir','arquivar','contrato')),
  configuracao JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE regras_condicionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  estagio_gatilho TEXT,
  palavras_chave TEXT[] NOT NULL,
  acao_id UUID REFERENCES acoes(id),
  prioridade INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO acoes (nome, slug, descricao, tipo, configuracao) VALUES
  ('Transferir para Humano', 'transferir', 'Transfere o atendimento para um atendente humano', 'transferir', '{}'),
  ('Arquivar Conversa', 'arquivar', 'Arquiva a conversa do lead', 'arquivar', '{}'),
  ('Enviar Proposta', 'proposta', 'Muda para estágio PROPOSTA e envia áudio de proposta', 'estagio', '{"estagio":"PROPOSTA"}'),
  ('Desqualificar Lead', 'desqualificar', 'Marca o lead como desqualificado', 'status', '{"status":"desqualificado"}'),
  ('Gerar Contrato', 'contrato', 'Aciona geração de contrato via Autentique', 'contrato', '{}'),
  ('Reiniciar Atendimento', 'restart', 'Zera o atendimento do lead do início', 'estagio', '{"estagio":"RECEPCAO"}');
