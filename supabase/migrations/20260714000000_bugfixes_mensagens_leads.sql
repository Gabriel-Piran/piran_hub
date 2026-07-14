-- Migração: correções de bugs reportados no Piran Hub (2026-07-14)
-- Rode este arquivo no SQL Editor do Supabase do projeto Piran Hub.

-- BUG 2: diferencia mensagem de texto enviada pelo atendente de uma
-- notificação genuína de sistema, para o chat renderizar como balão de
-- conversa em vez de pílula centralizada.
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS enviado_por_atendente BOOLEAN DEFAULT false;

-- BUG 7: acao_executada precisa aceitar 'ignorado' para mensagens do lead
-- que chegaram durante atendimento humano/pendente e não devem ser
-- respondidas retroativamente quando o modo volta para IA.
ALTER TABLE mensagens DROP CONSTRAINT IF EXISTS mensagens_acao_executada_check;
ALTER TABLE mensagens ADD CONSTRAINT mensagens_acao_executada_check
  CHECK (acao_executada IN ('enviado', 'cancelado', 'ignorado') OR acao_executada IS NULL);

-- BUG 3: garante que o CHECK constraint de leads.status aceita todos os
-- status usados pela aplicação, incluindo 'arquivado'.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN (
    'ativo',
    'desqualificado',
    'transferido',
    'contrato_enviado',
    'contrato_assinado',
    'arquivado',
    'fup_trabalhando',
    'fup_qualificado'
  ));
