-- ============================================================================
-- Migration 0041 — unique (projeto_id, nome) em personagens — 11/06/2026
-- Necessária para o upsert da decupagem (F7 / Sprint 4C). Sem ela, o
-- on_conflict do Supabase falha com "no unique or exclusion constraint".
-- APLICAR COLANDO NO SQL EDITOR. Idempotente.
-- ============================================================================

-- 1) Remove duplicados existentes (mantém o mais antigo de cada nome)
delete from public.personagens a
using public.personagens b
where a.projeto_id = b.projeto_id
  and lower(a.nome) = lower(b.nome)
  and a.criado_em > b.criado_em;

-- 2) Índice único (case-sensitive, igual ao on_conflict do front)
create unique index if not exists personagens_projeto_nome_unq
  on public.personagens (projeto_id, nome);

notify pgrst, 'reload schema';
