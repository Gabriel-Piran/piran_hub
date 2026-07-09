-- Gestão de prompts da Aline (assistente de WhatsApp) pelo Piran Hub.
-- Rode este arquivo no SQL Editor do Supabase (ou via `supabase db push`).

create table if not exists prompts_aline (
  id uuid primary key default gen_random_uuid(),
  estagio text not null unique check (estagio in (
    'RECEPCAO',
    'TRIAGEM_DOMESTICO',
    'QUALIFICACAO_SALARIO',
    'QUALIFICACAO_TEMPO',
    'QUALIFICACAO_SAIDA',
    'QUALIFICACAO_DATA',
    'PROPOSTA',
    'COLETA_RG',
    'COLETA_ENDERECO',
    'CONTRATO',
    'AGUARDANDO'
  )),
  titulo text not null,
  descricao text default '',
  conteudo text not null default '',
  ativo boolean default true,
  atualizado_em timestamptz default now()
);

-- RLS ligado sem policies: só o backend (service_role, que ignora RLS) acessa esta tabela.
alter table prompts_aline enable row level security;

-- Scaffolding: uma linha por estágio do funil, conteúdo vazio para o
-- Dr. Gabriel preencher pela página /dashboard/aline. Não inventamos
-- texto de prompt aqui.
insert into prompts_aline (estagio, titulo, descricao, conteudo, ativo)
values
  ('RECEPCAO', 'Recepção', '', '', true),
  ('TRIAGEM_DOMESTICO', 'Triagem doméstico', '', '', true),
  ('QUALIFICACAO_SALARIO', 'Qualificação de salário', '', '', true),
  ('QUALIFICACAO_TEMPO', 'Qualificação de tempo', '', '', true),
  ('QUALIFICACAO_SAIDA', 'Qualificação de saída', '', '', true),
  ('QUALIFICACAO_DATA', 'Qualificação de data', '', '', true),
  ('PROPOSTA', 'Proposta', '', '', true),
  ('COLETA_RG', 'Coleta de RG', '', '', true),
  ('COLETA_ENDERECO', 'Coleta de endereço', '', '', true),
  ('CONTRATO', 'Contrato enviado', '', '', true),
  ('AGUARDANDO', 'Aguardando assinatura', '', '', true)
on conflict (estagio) do nothing;
