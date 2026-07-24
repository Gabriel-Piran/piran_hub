-- BUG CRÍTICO: a constraint de mensagens.acao_executada nunca incluiu
-- vários valores que a IA (Aline) de fato usa em [ACAO: X] — DESQUALIFICAR,
-- ENVIAR_AUDIO, ENVIAR_CONTRATO, REENVIAR_CONTRATO, FUP_TRABALHANDO. Toda
-- vez que uma dessas ações acontecia, o INSERT em "Salva Resposta IA"
-- (workflow n8n "03 - Agente Aline") quebrava com violação de constraint,
-- derrubando a execução inteira e, por acúmulo de erros, desativando o
-- workflow sozinho — travando a IA para TODOS os leads, não só o afetado.
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
    'PROCESSANDO',
    'DESQUALIFICAR',
    'ENVIAR_AUDIO',
    'ENVIAR_CONTRATO',
    'REENVIAR_CONTRATO',
    'FUP_TRABALHANDO'
  ) OR acao_executada IS NULL);
