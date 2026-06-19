-- ============================================================
-- Migration 0062 — C4: Calendário unificado (Agenda + Planejamento)
--
-- 1) agenda_participantes: confirmado_em + dia_id (período de produção)
-- 2) dias_filmagem: titulo, descricao, departamento + unifica status vocabulary
-- 3) agenda_eventos: observacoes
-- 4) 0049 rename dia_filmagem→dia_gravacao (idempotente)
-- 5) RLS update policy para agenda_participantes
--
-- Colar no SQL Editor. Idempotente.
-- ============================================================

begin;

-- ── 1. agenda_participantes ──────────────────────────────────────────────────

-- Permite evento_id nulo (quando ligado a um dia de produção via dia_id)
alter table public.agenda_participantes alter column evento_id drop not null;

-- dia_id: FK para dias_filmagem (nullable; preencher quando categoria = período)
alter table public.agenda_participantes
  add column if not exists dia_id uuid references public.dias_filmagem(id) on delete cascade;

-- confirmado_em: timestamp de confirmação de visualização
alter table public.agenda_participantes
  add column if not exists confirmado_em timestamptz;

-- Policy UPDATE (necessária para confirmar visualização)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'agenda_participantes' and policyname = 'agenda_participantes_update'
  ) then
    execute $pol$
      create policy "agenda_participantes_update" on public.agenda_participantes
        for update using (true)
    $pol$;
  end if;
end $$;

create index if not exists idx_agenda_participantes_dia
  on public.agenda_participantes(dia_id);

-- ── 2. dias_filmagem: novos campos ──────────────────────────────────────────

alter table public.dias_filmagem add column if not exists titulo     text;
alter table public.dias_filmagem add column if not exists descricao  text;
alter table public.dias_filmagem add column if not exists departamento text;

-- Unifica vocabulary de status para agendado/realizado/cancelado
update public.dias_filmagem set status = 'agendado'  where status in ('planejado','confirmado');
update public.dias_filmagem set status = 'realizado' where status in ('em_filmagem','concluido');
update public.dias_filmagem set status = 'cancelado' where status = 'adiado';

alter table public.dias_filmagem drop constraint if exists dias_filmagem_status_check;
alter table public.dias_filmagem
  add constraint dias_filmagem_status_check
  check (status in ('agendado','realizado','cancelado'));
alter table public.dias_filmagem alter column status set default 'agendado';

-- ── 3. agenda_eventos: campo observacoes ────────────────────────────────────

alter table public.agenda_eventos add column if not exists observacoes text;

-- ── 4. 0049 rename dia_filmagem→dia_gravacao (idempotente) ──────────────────

update public.dias_filmagem set tipo = 'dia_gravacao' where tipo = 'dia_filmagem';

do $$ declare c text; begin
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
alter table public.dias_filmagem alter column tipo set default 'dia_gravacao';
alter table public.dias_filmagem
  add constraint dias_filmagem_tipo_check
  check (tipo in ('pre_producao','producao','dia_gravacao','pos_producao'));

notify pgrst, 'reload schema';

commit;
