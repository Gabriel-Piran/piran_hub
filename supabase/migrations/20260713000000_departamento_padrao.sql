-- Migração: departamento padrão para roteamento automático de novos leads
-- Rode este arquivo no SQL Editor do Supabase do projeto Piran Hub.

ALTER TABLE departamentos ADD COLUMN IF NOT EXISTS padrao BOOLEAN DEFAULT false;

-- Garante um único departamento padrão por vez.
CREATE UNIQUE INDEX IF NOT EXISTS departamentos_unico_padrao
  ON departamentos (padrao)
  WHERE padrao = true;

UPDATE departamentos SET padrao = false WHERE padrao = true AND nome <> 'Comercial';
UPDATE departamentos SET padrao = true WHERE nome = 'Comercial';

-- Necessário além do pedido original: o Fluxo 01 do n8n (Upsert Lead) insere
-- direto na tabela `leads` sem passar por uma API própria, então o roteamento
-- automático é aplicado aqui via trigger (cobre n8n e qualquer outro inserter
-- futuro) em vez de em um endpoint POST /api/leads que hoje não existe.
CREATE OR REPLACE FUNCTION set_departamento_padrao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.departamento_id IS NULL THEN
    SELECT id INTO NEW.departamento_id FROM departamentos WHERE padrao = true LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_departamento_padrao ON leads;
CREATE TRIGGER trg_set_departamento_padrao
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_departamento_padrao();
