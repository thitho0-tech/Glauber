-- Migration: 0028_audit_log.sql
-- Sprint 1B — Audit log imutável + trigger em despesas

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  tabela      text not null,
  registro_id uuid,
  operacao    text not null check (operacao in ('insert','update','delete')),
  dados_antes jsonb,
  dados_depois jsonb,
  user_id     uuid references auth.users(id),
  projeto_id  uuid,
  criado_em   timestamptz default now()
);

create index if not exists idx_audit_tabela  on audit_log(tabela, registro_id);
create index if not exists idx_audit_projeto on audit_log(projeto_id, criado_em desc);
create index if not exists idx_audit_user    on audit_log(user_id, criado_em desc);

alter table audit_log enable row level security;

-- SELECT: quem tem papel no projeto pode ver
create policy "audit_select" on audit_log for select
  using (public.papel_no_projeto(projeto_id) is not null);

-- INSERT: só via trigger (security definer)
create policy "audit_insert_system" on audit_log for insert
  with check (true);

-- Sem UPDATE nem DELETE para usuários — audit é imutável

-- Trigger em despesas
create or replace function fn_audit_despesas()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (tabela, registro_id, operacao, dados_antes, dados_depois, user_id, projeto_id)
  values (
    'despesas',
    coalesce(new.id, old.id),
    lower(tg_op),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    auth.uid(),
    coalesce(new.projeto_id, old.projeto_id)
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_despesas on despesas;
create trigger trg_audit_despesas
  after insert or update or delete on despesas
  for each row execute function fn_audit_despesas();
