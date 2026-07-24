-- Base de conhecimento da Aline: tópicos que ela usa como referência
-- pra responder dúvidas comuns do lead. Cada linha é um "tópico" com
-- quando usar, exemplos de como o lead pode perguntar, e o modelo de
-- resposta. Se a dúvida do lead não bater com nenhum tópico ativo aqui
-- (nem com as instruções do estágio atual), a Aline informa que vai
-- transferir para um especialista e aciona TRANSFERIR_HUMANO.
-- Rode este arquivo no SQL Editor do Supabase do projeto Piran Hub.

CREATE TABLE IF NOT EXISTS base_conhecimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  titulo TEXT NOT NULL,
  quando_usar TEXT NOT NULL DEFAULT '',
  exemplos_frases TEXT[] NOT NULL DEFAULT '{}',
  resposta_modelo TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_base_conhecimento_categoria
  ON base_conhecimento(categoria, ordem);
