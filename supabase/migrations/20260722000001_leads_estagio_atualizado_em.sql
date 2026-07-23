-- Corrige o bug "follow-up não dispara pela regra": a regra usava
-- leads.atualizado_em como proxy de "tempo parado no estágio", mas esse
-- campo é tocado por qualquer edição do lead (transferência, edição de
-- dados, mudança de modo de atendimento, cada mensagem processada pelo
-- n8n, etc.), então o cronômetro do follow-up era resetado mesmo sem o
-- lead mudar de estágio.
--
-- estagio_atualizado_em só muda quando o estágio de fato muda, via
-- trigger no banco — isso cobre tanto as rotas deste repo quanto
-- qualquer UPDATE feito diretamente pelo n8n via Supabase.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS estagio_atualizado_em TIMESTAMPTZ;

UPDATE leads SET estagio_atualizado_em = atualizado_em WHERE estagio_atualizado_em IS NULL;

ALTER TABLE leads ALTER COLUMN estagio_atualizado_em SET DEFAULT now();
ALTER TABLE leads ALTER COLUMN estagio_atualizado_em SET NOT NULL;

CREATE OR REPLACE FUNCTION set_leads_estagio_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estagio IS DISTINCT FROM OLD.estagio THEN
    NEW.estagio_atualizado_em := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_estagio_atualizado_em ON leads;
CREATE TRIGGER trg_leads_estagio_atualizado_em
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_leads_estagio_atualizado_em();
