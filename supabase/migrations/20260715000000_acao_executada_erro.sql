-- Migração: permite marcar uma mensagem agendada como 'erro' quando o envio
-- via Z-API falha, em vez de forçar 'enviado' mesmo com falha no envio.
-- Rode este arquivo no SQL Editor do Supabase do projeto Piran Hub.

ALTER TABLE mensagens DROP CONSTRAINT IF EXISTS mensagens_acao_executada_check;
ALTER TABLE mensagens ADD CONSTRAINT mensagens_acao_executada_check
  CHECK (acao_executada IN ('enviado', 'cancelado', 'ignorado', 'erro') OR acao_executada IS NULL);
