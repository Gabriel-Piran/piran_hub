-- O workflow "06 - Contrato Assinado" (n8n) descobria qual lead assinou
-- um contrato fazendo um LIKE '%document_id%' em cima do texto de uma
-- mensagem de log — frágil: se o formato dessa mensagem mudar, a
-- detecção de "contrato assinado" quebra silenciosamente. Guarda o
-- document_id da Autentique direto no lead, e os workflows 05/06 passam
-- a gravar/ler por essa coluna.
-- Rode este arquivo no SQL Editor do Supabase do projeto Piran Hub.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS autentique_document_id TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_autentique_document_id ON leads(autentique_document_id);
