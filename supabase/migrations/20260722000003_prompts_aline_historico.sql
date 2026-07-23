-- Histórico de versões dos prompts da Aline: cada PATCH em prompts_aline
-- salva o estado anterior aqui antes de sobrescrever, permitindo consultar
-- o que mudou e reverter para uma versão anterior pelo painel /dashboard/aline.

CREATE TABLE IF NOT EXISTS prompts_aline_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts_aline(id) ON DELETE CASCADE,
  estagio TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  conteudo TEXT NOT NULL DEFAULT '',
  ativo BOOLEAN DEFAULT true,
  editado_por TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompts_aline_historico_prompt_id
  ON prompts_aline_historico(prompt_id, criado_em DESC);

ALTER TABLE prompts_aline_historico ENABLE ROW LEVEL SECURITY;
