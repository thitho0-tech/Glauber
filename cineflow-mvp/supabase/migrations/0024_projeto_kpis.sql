-- ============================================================
-- Migration 0024 — projeto_kpis (Sprint 1A Command Center)
-- Nomes reais das tabelas do projeto:
--   dias_filmagem  (status: 'concluido' = filmado)
--   despesas       (valor, projeto_id)
--   editais        (vencimento, projeto_id)
--   papel_no_projeto() já existe para RLS
-- ============================================================

-- ── Tabela principal ─────────────────────────────────────────
create table if not exists projeto_kpis (
  id                         uuid primary key default gen_random_uuid(),
  projeto_id                 uuid not null references projetos(id) on delete cascade,
  roteiro_filmado_pct        decimal(5,2) default 0,
  orcamento_comprometido_pct decimal(5,2) default 0,
  prazos_criticos            jsonb default '[]'::jsonb,
  proximos_eventos           jsonb default '[]'::jsonb,
  updated_at                 timestamptz default now(),
  updated_by                 uuid references auth.users(id),
  constraint projeto_kpis_pct_check check (
    roteiro_filmado_pct between 0 and 100
    and orcamento_comprometido_pct between 0 and 100
  ),
  constraint projeto_kpis_projeto_unique unique (projeto_id)
);

create index if not exists idx_projeto_kpis_projeto_id on projeto_kpis(projeto_id);
create index if not exists idx_projeto_kpis_updated_at on projeto_kpis(updated_at desc);

-- ── Trigger 1: roteiro_filmado_pct via dias_filmagem ─────────
-- dias filmados com status='concluido' / total de dias do projeto
create or replace function fn_recalcular_roteiro_filmado_pct()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_total   int;
  v_feitos  int;
begin
  select count(*) into v_total
  from dias_filmagem where projeto_id = new.projeto_id;

  select count(*) into v_feitos
  from dias_filmagem where projeto_id = new.projeto_id and status = 'concluido';

  insert into projeto_kpis (projeto_id, roteiro_filmado_pct, updated_at)
  values (
    new.projeto_id,
    case when v_total = 0 then 0
         else round((v_feitos::numeric / v_total::numeric) * 100, 2)
    end,
    now()
  )
  on conflict (projeto_id) do update
    set roteiro_filmado_pct = excluded.roteiro_filmado_pct,
        updated_at          = now();

  return new;
end;
$$;

drop trigger if exists trg_kpi_roteiro on dias_filmagem;
create trigger trg_kpi_roteiro
  after insert or update on dias_filmagem
  for each row execute function fn_recalcular_roteiro_filmado_pct();

-- ── Trigger 2: orcamento_comprometido_pct via despesas ────────
create or replace function fn_recalcular_orcamento_comprometido_pct()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_orcamento numeric;
  v_gasto     numeric;
begin
  select coalesce(orcamento_total, 0) into v_orcamento
  from projetos where id = new.projeto_id;

  select coalesce(sum(valor), 0) into v_gasto
  from despesas where projeto_id = new.projeto_id;

  insert into projeto_kpis (projeto_id, orcamento_comprometido_pct, updated_at)
  values (
    new.projeto_id,
    case when v_orcamento = 0 then 0
         else round((v_gasto / v_orcamento) * 100, 2)
    end,
    now()
  )
  on conflict (projeto_id) do update
    set orcamento_comprometido_pct = excluded.orcamento_comprometido_pct,
        updated_at                 = now();

  return new;
end;
$$;

drop trigger if exists trg_kpi_orcamento on despesas;
create trigger trg_kpi_orcamento
  after insert or update on despesas
  for each row execute function fn_recalcular_orcamento_comprometido_pct();

-- ── Trigger 3: prazos_criticos via editais ────────────────────
create or replace function fn_atualizar_prazos_criticos()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into projeto_kpis (projeto_id, prazos_criticos, updated_at)
  values (
    new.projeto_id,
    coalesce(
      (select jsonb_agg(vencimento::text order by vencimento)
       from editais
       where projeto_id = new.projeto_id and vencimento > now()),
      '[]'::jsonb
    ),
    now()
  )
  on conflict (projeto_id) do update
    set prazos_criticos = excluded.prazos_criticos,
        updated_at      = now();

  return new;
end;
$$;

drop trigger if exists trg_kpi_prazos on editais;
create trigger trg_kpi_prazos
  after insert or update on editais
  for each row execute function fn_atualizar_prazos_criticos();

-- ── Row-Level Security ────────────────────────────────────────
-- Usa papel_no_projeto() que já existe (0016_c3_c4_rbac.sql)
alter table projeto_kpis enable row level security;

drop policy if exists "usuarios_veem_proprios_kpis" on projeto_kpis;
create policy "usuarios_veem_proprios_kpis"
  on projeto_kpis for select
  using (public.papel_no_projeto(projeto_id) is not null);

drop policy if exists "sistema_atualiza_kpis" on projeto_kpis;
create policy "sistema_atualiza_kpis"
  on projeto_kpis for all
  using (auth.role() = 'service_role');

-- ── Realtime ─────────────────────────────────────────────────
alter table projeto_kpis replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'projeto_kpis'
  ) then
    alter publication supabase_realtime add table projeto_kpis;
  end if;
end;
$$;

-- ── Seed: linha kpis para projetos já existentes ─────────────
insert into projeto_kpis (projeto_id)
select id from projetos
on conflict (projeto_id) do nothing;
