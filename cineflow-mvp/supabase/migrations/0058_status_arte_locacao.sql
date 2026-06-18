-- ============================================================
-- Migration 0058 — Status operacional de Arte e Locação
-- (5) figurinos/arte_objetos: status nasce 'sugestao'; após aprovado o usuário
--     escolhe entre 'pendente' | 'adquirido' | 'devolvido'.
-- (6) locacoes: status de contato pós-aprovação 'contato_pendente' | 'contrato_ok'.
-- Colar no SQL Editor. Idempotente. Em transação.
-- ============================================================
begin;

-- ── (5) FIGURINOS: reformula o status operacional ──
-- derruba o check antigo do status (identificado por conter 'previsto')
do $$ declare c text; begin
  for c in select conname from pg_constraint
           where conrelid='public.figurinos'::regclass and contype='c'
             and pg_get_constraintdef(oid) ilike '%previsto%'
  loop execute format('alter table public.figurinos drop constraint %I', c); end loop;
end $$;
-- mapeia valores antigos p/ o novo conjunto
update public.figurinos set status = case status
  when 'previsto' then 'sugestao'
  when 'retirado' then 'adquirido'
  when 'adquirido' then 'adquirido'
  when 'devolvido' then 'devolvido'
  else 'sugestao' end;
alter table public.figurinos alter column status set default 'sugestao';
alter table public.figurinos add constraint figurinos_status_chk
  check (status in ('sugestao','pendente','adquirido','devolvido'));

-- ── (5) ARTE_OBJETOS: idem ──
do $$ declare c text; begin
  for c in select conname from pg_constraint
           where conrelid='public.arte_objetos'::regclass and contype='c'
             and pg_get_constraintdef(oid) ilike '%previsto%'
  loop execute format('alter table public.arte_objetos drop constraint %I', c); end loop;
end $$;
update public.arte_objetos set status = case status
  when 'previsto' then 'sugestao'
  when 'em_set' then 'adquirido'
  when 'adquirido' then 'adquirido'
  when 'devolvido' then 'devolvido'
  else 'sugestao' end;
alter table public.arte_objetos alter column status set default 'sugestao';
alter table public.arte_objetos add constraint arte_objetos_status_chk
  check (status in ('sugestao','pendente','adquirido','devolvido'));

-- ── (6) LOCACOES: status de contato (editável após aprovada) ──
alter table public.locacoes add column if not exists contato_status text default 'contato_pendente'
  check (contato_status in ('contato_pendente','contrato_ok'));

notify pgrst,'reload schema';
commit;

-- Verificação:
-- select status, count(*) from public.figurinos group by 1;
-- select status, count(*) from public.arte_objetos group by 1;
-- select column_name from information_schema.columns where table_name='locacoes' and column_name='contato_status';
