-- Sistema de autenticação multi-usuário do Piran Hub
-- Rode este arquivo no SQL Editor do Supabase (ou via `supabase db push`).

create extension if not exists pgcrypto;

create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text unique not null,
  senha_hash text not null,
  perfil text not null check (perfil in ('admin', 'advogado', 'secretaria', 'estagio')),
  ativo boolean default true,
  criado_em timestamptz default now(),
  ultimo_acesso timestamptz,
  reset_token text,
  reset_token_expiry timestamptz,
  sessao_token text
);

create index if not exists usuarios_email_idx on usuarios (email);

-- RLS ligado sem policies: só o backend (service_role, que ignora RLS) acessa esta tabela.
alter table usuarios enable row level security;

-- Usuário admin inicial. A senha é hasheada com bcrypt (bf) via pgcrypto,
-- compatível com a verificação feita em runtime pela lib bcryptjs.
insert into usuarios (nome, email, senha_hash, perfil)
values (
  'Dr. Gabriel Piran',
  'gabriel@piran.adv.br',
  crypt('Piran@2026', gen_salt('bf')),
  'admin'
)
on conflict (email) do nothing;
