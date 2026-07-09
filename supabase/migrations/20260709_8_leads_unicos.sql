-- Migração: Criação da view leads_unicos para a sidebar de conversas
-- Rode este arquivo no SQL Editor do Supabase do projeto Piran Hub.

CREATE OR REPLACE VIEW leads_unicos AS
WITH ultimas_mensagens AS (
  SELECT DISTINCT ON (lead_id) lead_id, conteudo, enviado_em
  FROM mensagens
  ORDER BY lead_id, enviado_em DESC
)
SELECT DISTINCT ON (l.numero_whatsapp)
  l.*,
  m.conteudo AS ultima_mensagem_conteudo,
  m.enviado_em AS ultima_mensagem_enviado_em
FROM leads l
LEFT JOIN ultimas_mensagens m ON m.lead_id = l.id
ORDER BY l.numero_whatsapp, l.atualizado_em DESC;
