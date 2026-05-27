-- ============================================================
-- CINEFLOW — Migration 0005 (B2): OD autônoma com seções por depto
-- ============================================================
-- 1) Torna ordens_do_dia.dia_id nullable + adiciona projeto_id, data, tipo, titulo
-- 2) Cria od_secoes (campos livres por departamento)
-- 3) Cria od_cenas (lista de cenas da OD)
-- 4) RLS nas duas tabelas novas
-- ============================================================

-- 1) Adapta ordens_do_dia
alter table public.ordens_do_dia
  alter column dia_id drop not null;

alter table public.ordens_do_dia
  add column if not exists projeto_id uuid references public.projetos(id) on delete cascade,
  add column if not exists data date,
  add column if not exists tipo text
    check (tipo in ('filmagem','ensaio','reuniao','pesquisa','outro'))
    default 'filmagem',
  add column if not exists titulo text;

-- Backfill: para cada OD existente, herda projeto_id e data do dia atrelado
update public.ordens_do_dia od
set projeto_id = d.projeto_id,
    data = d.data,
    titulo = coalesce(od.titulo, 'OD de ' || to_char(d.data, 'DD/MM/YYYY'))
from public.dias_filmagem d
where od.dia_id = d.id and od.projeto_id is null;

-- Agora torna projeto_id obrigatório (depois do backfill)
alter table public.ordens_do_dia
  alter column projeto_id set not null;

create index if not exists ordens_do_dia_projeto_idx on public.ordens_do_dia(projeto_id);
create index if not exists ordens_do_dia_tipo_idx on public.ordens_do_dia(tipo);

-- 2) Seções por departamento (campos livres)
create table if not exists public.od_secoes (
  id uuid primary key default gen_random_uuid(),
  od_id uuid not null references public.ordens_do_dia(id) on delete cascade,
  departamento text not null,
  titulo text,
  conteudo text,
  ordem int default 0,
  criado_em timestamptz default now()
);
create index if not exists od_secoes_od_idx on public.od_secoes(od_id);

alter table public.od_secoes enable row level security;
drop policy if exists "od_secoes select" on public.od_secoes;
create policy "od_secoes select" on public.od_secoes for select using (
  od_id in (
    select id from public.ordens_do_dia
    where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))
  )
);
drop policy if exists "od_secoes insert" on public.od_secoes;
create policy "od_secoes insert" on public.od_secoes for insert with check (
  od_id in (
    select id from public.ordens_do_dia
    where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))
  )
);
drop policy if exists "od_secoes update" on public.od_secoes;
create policy "od_secoes update" on public.od_secoes for update using (
  od_id in (
    select id from public.ordens_do_dia
    where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))
  )
);
drop policy if exists "od_secoes delete" on public.od_secoes;
create policy "od_secoes delete" on public.od_secoes for delete using (
  od_id in (
    select id from public.ordens_do_dia
    where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))
  )
);

-- 3) Cenas da OD
create table if not exists public.od_cenas (
  id uuid primary key default gen_random_uuid(),
  od_id uuid not null references public.ordens_do_dia(id) on delete cascade,
  numero text,
  descricao text,
  tempo_estimado_min int,
  ordem int default 0,
  criado_em timestamptz default now()
);
create index if not exists od_cenas_od_idx on public.od_cenas(od_id);

alter table public.od_cenas enable row level security;
drop policy if exists "od_cenas select" on public.od_cenas;
create policy "od_cenas select" on public.od_cenas for select using (
  od_id in (
    select id from public.ordens_do_dia
    where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))
  )
);
drop policy if exists "od_cenas insert" on public.od_cenas;
create policy "od_cenas insert" on public.od_cenas for insert with check (
  od_id in (
    select id from public.ordens_do_dia
    where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))
  )
);
drop policy if exists "od_cenas update" on public.od_cenas;
create policy "od_cenas update" on public.od_cenas for update using (
  od_id in (
    select id from public.ordens_do_dia
    where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))
  )
);
drop policy if exists "od_cenas delete" on public.od_cenas;
create policy "od_cenas delete" on public.od_cenas for delete using (
  od_id in (
    select id from public.ordens_do_dia
    where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))
  )
);

-- ============================================================
-- Verificação:
--   select column_name from information_schema.columns
--     where table_name='ordens_do_dia' and column_name in ('projeto_id','data','tipo','titulo');
--   select count(*) from public.od_secoes;
--   select count(*) from public.od_cenas;
-- ============================================================
