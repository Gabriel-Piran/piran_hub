-- BUG: o lock atômico da fila da IA (node "Busca Mensagem Pendente" do
-- workflow n8n "03 - Agente Aline") passou a gravar acao_executada =
-- 'PROCESSANDO' como reivindicação temporária da mensagem, para impedir
-- que o Cron 10s e o Webhook aciona-aline processem a mesma mensagem em
-- paralelo (causa da IA respondendo em duplicidade). Esse valor não
-- constava na constraint, que hoje é mais ampla do que as migrations
-- anteriores registravam (drift: valores como 'MUDAR_ESTAGIO' e
-- 'TRANSFERIR_HUMANO' já foram adicionados direto via SQL Editor sem
-- migration correspondente). Este arquivo documenta o estado real atual
-- e adiciona 'PROCESSANDO' a ele.
-- Rode este arquivo no SQL Editor do Supabase do projeto Piran Hub.

ALTER TABLE mensagens DROP CONSTRAINT IF EXISTS mensagens_acao_executada_check;
ALTER TABLE mensagens ADD CONSTRAINT mensagens_acao_executada_check
  CHECK (acao_executada IN (
    'enviado',
    'cancelado',
    'ignorado',
    'erro',
    'NENHUMA',
    'MUDAR_ESTAGIO',
    'TRANSFERIR_HUMANO',
    'FUP_ENVIADO',
    'OCR_EXECUTADO',
    'CONTRATO_ENVIADO',
    'CONTRATO_ASSINADO',
    'PROCESSANDO'
  ) OR acao_executada IS NULL);
