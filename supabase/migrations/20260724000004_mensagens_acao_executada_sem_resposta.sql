-- Mesmo padrão dos bugs anteriores: a nova ação [ACAO: SEM_RESPOSTA]
-- (fallback de dúvida fora da base de conhecimento) também não estava
-- na lista de valores permitidos, quebrando "Salva Resposta IA" com
-- violação de constraint assim que a IA usava essa ação.
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
    'FUP_TRABALHANDO',
    'SEM_RESPOSTA'
  ) OR acao_executada IS NULL);
