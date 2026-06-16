-- ============================================================
-- Migration 0049 — Preparação da Agenda (Sprint 5)
--   1) dias_filmagem.tipo: renomeia o valor 'dia_filmagem' -> 'dia_gravacao'
--   2) agenda_eventos.departamento (para o filtro de visibilidade C3/C4)
-- Idempotente. COLAR NO SQL EDITOR DO SUPABASE (nunca `supabase db push`).
--
-- ⚠️ SEQUÊNCIA: rode esta migração JUNTO com o deploy do Bloco C4 (fusão da
--    Agenda). O front atual ainda agrupa por 'dia_filmagem' até a fusão; se
--    rodar antes e houver dias cadastrados, eles somem do Planejamento atual
--    até o C4 entrar. Se os projetos forem zerados antes dos testes, é indiferente.
-- ============================================================

-- 1) dias_filmagem.tipo ------------------------------------------------------

-- 1a) derruba o check constraint atual (nome auto-gerado) de forma dinâmica
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.dias_filmagem'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%tipo%dia_filmagem%'
  loop
    execute format('alter table public.dias_filmagem drop constraint %I', c);
  end loop;
end $$;
alter table public.dias_filmagem drop constraint if exists dias_filmagem_tipo_check;

-- 1b) migra os registros existentes
update public.dias_filmagem set tipo = 'dia_gravacao' where tipo = 'dia_filmagem';

-- 1c) novo default + novo check com os 4 valores finais do "Período de Produção"
alter table public.dias_filmagem alter column tipo set default 'dia_gravacao';
alter table public.dias_filmagem
  add constraint dias_filmagem_tipo_check
  check (tipo in ('pre_producao','producao','dia_gravacao','pos_producao'));

-- 2) agenda_eventos.departamento --------------------------------------------
-- Nullable, sem check estrito (o vocabulário de depto varia entre módulos do app).
-- Usado pelo filtro: evento visível se participante OU departamento = depto do usuário.
alter table public.agenda_eventos
  add column if not exists departamento text;

create index if not exists idx_agenda_eventos_departamento
  on public.agenda_eventos(departamento);

-- Verificação:
--   select tipo, count(*) from public.dias_filmagem group by tipo;
--   select column_name from information_schema.columns
--     where table_name = 'agenda_eventos' and column_name = 'departamento';
