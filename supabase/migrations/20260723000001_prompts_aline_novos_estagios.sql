-- Adiciona à prompts_aline os 5 estágios que já existiam como texto
-- fixo no código do node "Monta Prompt" (workflow n8n "03 - Agente
-- Aline") mas nunca tiveram linha na tabela — por isso não apareciam
-- nem eram editáveis em /dashboard/aline. COM_CTPS e
-- TRIAGEM_DIAS_DOMESTICO são estágios reais que o lead.estagio assume;
-- FUP_TRABALHANDO, DESQUALIFICAR e TRANSFERIR_HUMANO são usados como
-- chave de prompt mesmo não sendo valores persistidos em leads.estagio.
-- Rode este arquivo no SQL Editor do Supabase do projeto Piran Hub.

ALTER TABLE prompts_aline DROP CONSTRAINT IF EXISTS prompts_aline_estagio_check;
ALTER TABLE prompts_aline ADD CONSTRAINT prompts_aline_estagio_check
  CHECK (estagio = ANY (ARRAY[
    'RECEPCAO'::text,
    'COM_CTPS'::text,
    'TRIAGEM_DOMESTICO'::text,
    'TRIAGEM_DIAS_DOMESTICO'::text,
    'QUALIFICACAO_SALARIO'::text,
    'QUALIFICACAO_TEMPO'::text,
    'QUALIFICACAO_SAIDA'::text,
    'QUALIFICACAO_DATA'::text,
    'PROPOSTA'::text,
    'COLETA_RG'::text,
    'COLETA_ENDERECO'::text,
    'CONTRATO'::text,
    'AGUARDANDO'::text,
    'FUP_TRABALHANDO'::text,
    'DESQUALIFICAR'::text,
    'TRANSFERIR_HUMANO'::text
  ]));

-- As linhas de prompts_aline para esses 5 estágios são inseridas à parte
-- (via API, não neste arquivo) logo depois que esta constraint for
-- aplicada.
