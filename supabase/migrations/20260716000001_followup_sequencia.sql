-- Suporte a sequências de follow-up: quantas mensagens uma regra dispara
-- para o mesmo lead, e em qual posição da sequência cada item da fila está.
ALTER TABLE followup_regras ADD COLUMN IF NOT EXISTS max_sequencias INTEGER NOT NULL DEFAULT 1;
ALTER TABLE followup_fila ADD COLUMN IF NOT EXISTS sequencia_atual INTEGER NOT NULL DEFAULT 1;

-- FUP_ENVIADO marca, na tabela mensagens, o log de um follow-up automático
-- disparado por /api/followup/processar (distinto de 'enviado', usado pelas
-- mensagens agendadas manualmente pelo atendente).
ALTER TABLE mensagens DROP CONSTRAINT IF EXISTS mensagens_acao_executada_check;
ALTER TABLE mensagens ADD CONSTRAINT mensagens_acao_executada_check
  CHECK (acao_executada IN ('enviado', 'cancelado', 'ignorado', 'erro', 'FUP_ENVIADO') OR acao_executada IS NULL);
