-- Migration 0030: Soft-delete + Lixeira geral
-- Sprint 1D
-- CORRECAO: pessoas NAO tem user_id; vinculo e por email (lower match com auth.users)

-- ==========================================
-- 1. Colunas deleted_at
-- ==========================================
alter table public.projetos         add column if not exists deleted_at timestamptz default null;
alter table public.despesas         add column if not exists deleted_at timestamptz default null;
alter table public.dias_filmagem    add column if not exists deleted_at timestamptz default null;
alter table public.ordens_do_dia    add column if not exists deleted_at timestamptz default null;
alter table public.projeto_pessoas  add column if not exists deleted_at timestamptz default null;
alter table public.locacoes         add column if not exists deleted_at timestamptz default null;

-- ==========================================
-- 2. Indices
-- ==========================================
create index if not exists idx_projetos_deleted_at       on public.projetos(deleted_at)       where deleted_at is not null;
create index if not exists idx_despesas_deleted_at       on public.despesas(deleted_at)       where deleted_at is not null;
create index if not exists idx_dias_filmagem_deleted_at  on public.dias_filmagem(deleted_at)  where deleted_at is not null;
create index if not exists idx_ordens_do_dia_deleted_at  on public.ordens_do_dia(deleted_at)  where deleted_at is not null;
create index if not exists idx_projeto_pessoas_deleted_at on public.projeto_pessoas(deleted_at) where deleted_at is not null;
create index if not exists idx_locacoes_deleted_at       on public.locacoes(deleted_at)       where deleted_at is not null;

-- ==========================================
-- 3. Helper: org_id do usuario logado (via memberships, nao via pessoas)
-- ==========================================
create or replace function public.my_org_id()
returns uuid language sql security definer set search_path = public, pg_temp as $$
  select org_id from public.memberships where user_id = auth.uid() and ativo = true limit 1;
$$;

-- ==========================================
-- 4. RPCs: soft_delete_item, restore_item, purge_item, empty_trash
-- ==========================================

create or replace function public.soft_delete_item(p_tabela text, p_id uuid)
returns void language plpgsql security definer as $$
declare v_org uuid := public.my_org_id();
begin
  if p_tabela = 'projetos' then
    update public.projetos set deleted_at = now()
      where id = p_id and criado_por = auth.uid();
  elsif p_tabela = 'despesas' then
    update public.despesas set deleted_at = now()
      where id = p_id
        and projeto_id in (select id from public.projetos where criado_por = auth.uid());
  elsif p_tabela = 'dias_filmagem' then
    update public.dias_filmagem set deleted_at = now()
      where id = p_id
        and projeto_id in (select id from public.projetos where criado_por = auth.uid());
  elsif p_tabela = 'ordens_do_dia' then
    update public.ordens_do_dia set deleted_at = now()
      where id = p_id
        and projeto_id in (select id from public.projetos where criado_por = auth.uid());
  elsif p_tabela = 'projeto_pessoas' then
    update public.projeto_pessoas set deleted_at = now()
      where id = p_id
        and projeto_id in (select id from public.projetos where criado_por = auth.uid());
  elsif p_tabela = 'locacoes' then
    update public.locacoes set deleted_at = now()
      where id = p_id and org_id = v_org;
  end if;
end;
$$;

create or replace function public.restore_item(p_tabela text, p_id uuid)
returns void language plpgsql security definer as $$
declare v_org uuid := public.my_org_id();
begin
  if p_tabela = 'projetos' then
    update public.projetos set deleted_at = null
      where id = p_id and criado_por = auth.uid();
  elsif p_tabela = 'despesas' then
    update public.despesas set deleted_at = null
      where id = p_id
        and projeto_id in (select id from public.projetos where criado_por = auth.uid());
  elsif p_tabela = 'dias_filmagem' then
    update public.dias_filmagem set deleted_at = null
      where id = p_id
        and projeto_id in (select id from public.projetos where criado_por = auth.uid());
  elsif p_tabela = 'ordens_do_dia' then
    update public.ordens_do_dia set deleted_at = null
      where id = p_id
        and projeto_id in (select id from public.projetos where criado_por = auth.uid());
  elsif p_tabela = 'projeto_pessoas' then
    update public.projeto_pessoas set deleted_at = null
      where id = p_id
        and projeto_id in (select id from public.projetos where criado_por = auth.uid());
  elsif p_tabela = 'locacoes' then
    update public.locacoes set deleted_at = null
      where id = p_id and org_id = v_org;
  end if;
end;
$$;

create or replace function public.purge_item(p_tabela text, p_id uuid)
returns void language plpgsql security definer as $$
declare v_org uuid := public.my_org_id();
begin
  if p_tabela = 'projetos' then
    delete from public.projetos
      where id = p_id and deleted_at is not null and criado_por = auth.uid();
  elsif p_tabela = 'despesas' then
    delete from public.despesas
      where id = p_id and deleted_at is not null
        and projeto_id in (select id from public.projetos where criado_por = auth.uid());
  elsif p_tabela = 'dias_filmagem' then
    delete from public.dias_filmagem
      where id = p_id and deleted_at is not null
        and projeto_id in (select id from public.projetos where criado_por = auth.uid());
  elsif p_tabela = 'ordens_do_dia' then
    delete from public.ordens_do_dia
      where id = p_id and deleted_at is not null
        and projeto_id in (select id from public.projetos where criado_por = auth.uid());
  elsif p_tabela = 'projeto_pessoas' then
    delete from public.projeto_pessoas
      where id = p_id and deleted_at is not null
        and projeto_id in (select id from public.projetos where criado_por = auth.uid());
  elsif p_tabela = 'locacoes' then
    delete from public.locacoes
      where id = p_id and deleted_at is not null and org_id = v_org;
  end if;
end;
$$;

create or replace function public.empty_trash(p_user_id uuid)
returns void language plpgsql security definer as $$
declare v_org uuid;
begin
  select org_id into v_org from public.memberships
    where user_id = p_user_id and ativo = true limit 1;

  delete from public.projeto_pessoas
    where deleted_at is not null
      and projeto_id in (select id from public.projetos where criado_por = p_user_id);
  delete from public.ordens_do_dia
    where deleted_at is not null
      and projeto_id in (select id from public.projetos where criado_por = p_user_id);
  delete from public.dias_filmagem
    where deleted_at is not null
      and projeto_id in (select id from public.projetos where criado_por = p_user_id);
  delete from public.despesas
    where deleted_at is not null
      and projeto_id in (select id from public.projetos where criado_por = p_user_id);
  delete from public.locacoes
    where deleted_at is not null and org_id = v_org;
  delete from public.projetos
    where deleted_at is not null and criado_por = p_user_id;
end;
$$;
