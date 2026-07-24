-- BUG CRÍTICO: a view leads_unicos usa "l.*", mas o Postgres fixa a
-- lista de colunas no momento da criação — colunas adicionadas depois
-- em leads (foto_perfil_url, autentique_document_id, etc.) não entram
-- sozinhas na view. Como /api/leads consulta leads_unicos primeiro,
-- isso estava quebrando o endpoint inteiro com "column does not exist"
-- assim que uma dessas colunas passou a ser pedida no SELECT.
-- Basta recriar a view (mesma definição) para ela reabsorver as
-- colunas atuais de leads. Rode este arquivo no SQL Editor do Supabase
-- do projeto Piran Hub sempre que adicionar coluna nova em leads.

DROP VIEW IF EXISTS leads_unicos;

CREATE VIEW leads_unicos AS
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
