-- Novo estágio AGENDAMENTO: fica entre CONTRATO e AGUARDANDO no fluxo.
-- Depois que o lead confirma que assinou o contrato, a Aline passa a
-- pedir para marcar um horário (link do Google Calendar já cadastrado
-- em mensagens_rapidas) antes de cair em AGUARDANDO (apoio/espera).
-- Mesmo padrão de bug dos constraints anteriores: leads.estagio e
-- prompts_aline.estagio têm CHECK constraints com lista fixa de
-- valores permitidos — sem esta migration, MUDAR_ESTAGIO=AGENDAMENTO
-- quebra "Salva Resposta IA" e a linha de prompt não pode ser criada.
-- Rode este arquivo no SQL Editor do Supabase do projeto Piran Hub.

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_estagio_check;
ALTER TABLE leads ADD CONSTRAINT leads_estagio_check
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
    'AGENDAMENTO'::text,
    'AGUARDANDO'::text
  ]) OR estagio IS NULL);

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
    'AGENDAMENTO'::text,
    'AGUARDANDO'::text,
    'FUP_TRABALHANDO'::text,
    'DESQUALIFICAR'::text,
    'TRANSFERIR_HUMANO'::text
  ]));

-- A linha de prompts_aline para AGENDAMENTO é inserida à parte (via API),
-- logo depois que esta constraint for aplicada.
