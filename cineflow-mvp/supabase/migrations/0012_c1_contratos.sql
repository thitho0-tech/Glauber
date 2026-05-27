-- ============================================================
-- CINEFLOW - Migration 0012 (C1): Contrato unico por projeto
-- ============================================================
-- Cada projeto tem 1 contrato (stub para MVP). Campos minimos:
--   numero, objeto, valor, data_assinatura, vigencia_fim, status, arquivo_url
-- Storage de arquivo fica como URL externa por enquanto (upload em fase 2).
-- ============================================================

create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null unique references public.projetos(id) on delete cascade,
  numero text,
  objeto text,
  valor numeric(14,2),
  data_assinatura date,
  vigencia_inicio date,
  vigencia_fim date,
  status text not null check (status in ('rascunho','vigente','encerrado','cancelado')) default 'rascunho',
  arquivo_url text,
  observacoes text,
  criado_por uuid references auth.users(id),
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

create index if not exists contratos_projeto_idx on public.contratos(projeto_id);

alter table public.contratos enable row level security;

drop policy if exists "contratos select org" on public.contratos;
create policy "contratos select org" on public.contratos for select using (
  projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
);

drop policy if exists "contratos insert org" on public.contratos;
create policy "contratos insert org" on public.contratos for insert with check (
  projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
);

drop policy if exists "contratos update org" on public.contratos;
create policy "contratos update org" on public.contratos for update using (
  projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
);

drop policy if exists "contratos delete org" on public.contratos;
create policy "contratos delete org" on public.contratos for delete using (
  projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
);

-- Trigger de atualizado_em
create or replace function public.trg_contratos_touch()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists contratos_touch on public.contratos;
create trigger contratos_touch before update on public.contratos
  for each row execute procedure public.trg_contratos_touch();

-- ============================================================
-- Verificacao:
--   select count(*) from information_schema.tables where table_name='contratos';
-- ============================================================
