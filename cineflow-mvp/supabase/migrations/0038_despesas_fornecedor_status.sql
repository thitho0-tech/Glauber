-- ============================================================
-- GLAUBER — Migration 0038 (Sprint 3B): Despesa × Fornecedor + status 'paga'
-- ============================================================
-- Resolve duas observações de uso do Financeiro:
--   obs 09 — erro "Could not find the 'fornecedor_id' column of 'despesas'
--            in the schema cache": a coluna não existia. Criamos agora + FK.
--   obs 11 — status da despesa precisa incluir 'paga' (além de
--            pendente/aprovada/rejeitada). Default continua 'pendente'.
-- ============================================================

-- 1) Vínculo despesa → fornecedor (fornecedores é org-scoped; FK só por id)
alter table public.despesas
  add column if not exists fornecedor_id uuid references public.fornecedores(id);

create index if not exists despesas_fornecedor_idx
  on public.despesas(fornecedor_id);

-- 2) Ampliar o check de status para incluir 'paga'
--    (constraint inline original gerada como despesas_status_check)
alter table public.despesas
  drop constraint if exists despesas_status_check;

alter table public.despesas
  add constraint despesas_status_check
  check (status in ('pendente','aprovada','rejeitada','paga'));

-- garante o default explícito
alter table public.despesas
  alter column status set default 'pendente';

-- 3) Forçar o PostgREST a recarregar o schema cache (cura o erro da obs 09
--    imediatamente, sem esperar reload automático)
notify pgrst, 'reload schema';

-- ============================================================
-- Verificação:
--   select column_name from information_schema.columns
--     where table_name = 'despesas' and column_name = 'fornecedor_id';   -- 1 linha
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--     where conname = 'despesas_status_check';                            -- inclui 'paga'
-- ============================================================
