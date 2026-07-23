-- Impede a criação de leads duplicados para o mesmo número de WhatsApp
-- (bug "duas instâncias na mesma conversa": corrida entre chamadas
-- concorrentes de POST /api/leads/iniciar podia criar dois registros de
-- lead para o mesmo numero_whatsapp, e cada um seguia sendo processado
-- de forma independente).
--
-- Se este bloco falhar com "numeros_whatsapp_duplicados", já existem leads
-- duplicados no banco. Rode a query abaixo para identificá-los, decida
-- manualmente qual registro de cada grupo deve ser mantido (e para onde
-- migrar mensagens/fila de follow-up dos demais) antes de tentar aplicar
-- esta migration novamente:
--
--   SELECT numero_whatsapp, count(*), array_agg(id ORDER BY criado_em)
--   FROM leads
--   GROUP BY numero_whatsapp
--   HAVING count(*) > 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM leads
    GROUP BY numero_whatsapp
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'numeros_whatsapp_duplicados: existem leads duplicados para o mesmo numero_whatsapp; resolva manualmente antes de aplicar esta migration.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_numero_whatsapp_key'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_numero_whatsapp_key UNIQUE (numero_whatsapp);
  END IF;
END $$;
