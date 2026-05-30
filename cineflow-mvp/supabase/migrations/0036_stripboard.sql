-- ============================================================
-- Migration 0036 — Stripboard: vincular cenas a dias de filmagem
-- Sprint 2C
-- ============================================================
-- Adiciona dia_id em roteiro_cenas para que cada cena decupada
-- possa ser alocada a um dia de filmagem específico.
-- Um dia pode ter múltiplas cenas; uma cena só pertence a um dia.
-- ============================================================

-- 1. Coluna dia_id em roteiro_cenas (nullable — cena não alocada = sem dia)
alter table public.roteiro_cenas
  add column if not exists dia_id uuid references public.dias_filmagem(id) on delete set null;

-- 2. Índice para busca rápida por dia
create index if not exists roteiro_cenas_dia_idx on public.roteiro_cenas(dia_id);

-- 3. RLS — política de update (herda da tabela roteiros via roteiro_id)
-- A RLS atual já cobre SELECT via roteiro_id → roteiros → projetos.
-- Adicionar policy de UPDATE para permitir alocar cena a dia:
drop policy if exists "roteiro_cenas update" on public.roteiro_cenas;
create policy "roteiro_cenas update" on public.roteiro_cenas for update
  using (
    roteiro_id in (
      select id from public.roteiros
      where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))
    )
  );

-- Verificação:
-- select column_name from information_schema.columns
-- where table_name = 'roteiro_cenas' and column_name = 'dia_id';
