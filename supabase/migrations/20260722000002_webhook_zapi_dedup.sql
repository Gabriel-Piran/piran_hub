-- Idempotência do webhook Z-API: a Z-API reenvia o mesmo evento quando não
-- recebe 200 rápido o suficiente, o que fazia o n8n processar (e a IA
-- responder) a mesma mensagem mais de uma vez ("duas instâncias na mesma
-- conversa"). Esta tabela registra o messageId já processado; um segundo
-- envio do mesmo messageId é ignorado antes de chegar ao n8n.

CREATE TABLE IF NOT EXISTS webhook_zapi_eventos (
  message_id TEXT PRIMARY KEY,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
