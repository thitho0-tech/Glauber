-- Migration: 0026_fornecedores.sql
-- Sprint 1B — Tabela fornecedores com RLS

create table if not exists public.fornecedores (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.orgs(id) on delete cascade,
  nome            text not null,
  cnpj            text,
  cpf             text,
  tipo            text check (tipo in ('pj','pf','mei','outro')) default 'pj',
  email           text,
  telefone        text,
  dados_bancarios jsonb default '{}'::jsonb,
  ativo           boolean default true,
  criado_em       timestamptz default now(),
  constraint fornecedores_doc_check check (cnpj is not null or cpf is not null)
);

create index if not exists idx_fornecedores_org  on fornecedores(org_id);
create index if not exists idx_fornecedores_cnpj on fornecedores(cnpj) where cnpj is not null;

alter table fornecedores enable row level security;

create policy "fornecedores_org" on fornecedores for all
  using (org_id in (
    select org_id from memberships
    where user_id = auth.uid() and ativo
  ));
