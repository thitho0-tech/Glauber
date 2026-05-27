-- ============================================================
-- CINEFLOW - Migration 0015 (D3): Decupagem tecnica
-- ============================================================
-- Decupagem = lista de planos por cena. Cada plano tem
-- equipamento, descricao tecnica e duracao estimada.
-- ============================================================

create table if not exists public.decupagem (
  id uuid primary key default gen_random_uuid(),
  cena_id uuid not null references public.od_cenas(id) on delete cascade,
  plano_numero int not null default 1,
  descricao text,
  tipo_plano text,                    -- PG, PM, PP, close, contra-plongee, etc.
  movimento text,                     -- estatico, travelling, pan, dolly, drone...
  lente text,
  equipamento text,
  duracao_estimada_seg int,
  observacoes text,
  criado_em timestamptz default now()
);
create index if not exists decupagem_cena_idx on public.decupagem(cena_id, plano_numero);

alter table public.decupagem enable row level security;

-- Acesso via cena -> od -> projeto -> org
drop policy if exists "decupagem select org" on public.decupagem;
create policy "decupagem select org" on public.decupagem for select using (
  cena_id in (
    select c.id from public.od_cenas c
    join public.ordens_do_dia od on od.id = c.od_id
    join public.projetos p on p.id = od.projeto_id
    where p.org_id in (select public.user_orgs())
  )
);
drop policy if exists "decupagem write org" on public.decupagem;
create policy "decupagem write org" on public.decupagem for all using (
  cena_id in (
    select c.id from public.od_cenas c
    join public.ordens_do_dia od on od.id = c.od_id
    join public.projetos p on p.id = od.projeto_id
    where p.org_id in (select public.user_orgs())
  )
) with check (
  cena_id in (
    select c.id from public.od_cenas c
    join public.ordens_do_dia od on od.id = c.od_id
    join public.projetos p on p.id = od.projeto_id
    where p.org_id in (select public.user_orgs())
  )
);

-- Verificacao:
--   select count(*) from information_schema.tables where table_name='decupagem';
