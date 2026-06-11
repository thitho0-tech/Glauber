-- ============================================================================
-- Migration 0043 — check constraint de pessoas.departamento — 11/06/2026
-- O form de Equipe (4B) oferece departamentos novos (desenvolvimento,
-- fotografia, logistica, pos_producao) que o check antigo (0001) rejeita →
-- "pessoa não fica salva". Amplia a lista aceita.
-- APLICAR COLANDO NO SQL EDITOR. Idempotente.
-- ============================================================================

alter table public.pessoas drop constraint if exists pessoas_departamento_check;
alter table public.pessoas add constraint pessoas_departamento_check check (
  departamento is null or departamento in (
    'desenvolvimento','producao','direcao','roteiro','camera','fotografia',
    'arte','som','figurino','maquiagem','elenco','logistica','pos',
    'pos_producao','outros'
  )
);

notify pgrst, 'reload schema';
