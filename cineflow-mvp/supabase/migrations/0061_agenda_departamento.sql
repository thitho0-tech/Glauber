-- ============================================================
-- Migration 0061 — C3: coluna departamento em agenda_eventos
-- Necessária para o filtro do "Próximos eventos" do Mural (por departamento).
-- (É um subconjunto da 0049; aplicada à parte para NÃO trazer o rename
--  dia_filmagem→dia_gravacao, que é do C4. A 0049 é idempotente quando vier.)
-- Colar no SQL Editor. Idempotente.
-- ============================================================
begin;
alter table public.agenda_eventos add column if not exists departamento text;
create index if not exists idx_agenda_eventos_departamento on public.agenda_eventos(departamento);
notify pgrst,'reload schema';
commit;
