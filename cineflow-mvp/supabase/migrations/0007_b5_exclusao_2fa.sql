-- ============================================================
-- CINEFLOW — Migration 0007 (B5): Exclusão de projeto + 2FA
-- ============================================================
-- 1) Adiciona projetos.criado_por (auth.users.id) e trigger que preenche
-- 2) Tabela delete_confirmations (códigos de 6 dígitos com TTL 15min)
-- 3) RPC request_delete_project — gera código (retorna pra UI mostrar)
-- 4) RPC confirm_delete_project — valida código e deleta
--
-- NOTA: até o SMTP do Supabase estar configurado, o código é RETORNADO
-- pela RPC e exibido ao usuário no front (toast). Quando ativarmos e-mail,
-- criamos Edge Function que envia o código por e-mail e a RPC para de retornar.
-- ============================================================

-- 1) projetos.criado_por
alter table public.projetos
  add column if not exists criado_por uuid references auth.users(id);

-- Backfill: para projetos sem criador, pega o owner mais antigo da org
update public.projetos p
set criado_por = (
  select m.user_id from public.memberships m
  where m.org_id = p.org_id and m.papel = 'owner' and m.ativo
  order by m.criado_em limit 1
)
where p.criado_por is null;

-- Trigger: ao inserir projeto, set criado_por = auth.uid()
create or replace function public.trg_set_criado_por_projeto()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.criado_por is null then
    new.criado_por := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists set_criado_por on public.projetos;
create trigger set_criado_por
  before insert on public.projetos
  for each row execute procedure public.trg_set_criado_por_projeto();

-- 2) Tabela de códigos de confirmação
create table if not exists public.delete_confirmations (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  codigo text not null,
  expira_em timestamptz not null default (now() + interval '15 minutes'),
  consumido_em timestamptz,
  criado_em timestamptz default now()
);
create index if not exists delete_conf_projeto_user_idx
  on public.delete_confirmations(projeto_id, user_id);

alter table public.delete_confirmations enable row level security;
drop policy if exists "delete_conf own" on public.delete_confirmations;
create policy "delete_conf own" on public.delete_confirmations for all
  using (user_id = auth.uid());

-- 3) RPC: gera código (e por enquanto retorna pra UI exibir)
create or replace function public.request_delete_project(p_projeto_id uuid)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_criador uuid;
  v_codigo text;
begin
  if v_user is null then
    raise exception 'Não autenticado';
  end if;
  select criado_por into v_criador from public.projetos where id = p_projeto_id;
  if v_criador is null then
    raise exception 'Projeto não encontrado';
  end if;
  if v_criador <> v_user then
    raise exception 'Apenas o criador do projeto pode excluí-lo';
  end if;

  -- Gera código de 6 dígitos
  v_codigo := lpad((floor(random() * 1000000))::int::text, 6, '0');

  -- Invalida códigos anteriores ainda válidos
  update public.delete_confirmations
    set consumido_em = now()
    where projeto_id = p_projeto_id and user_id = v_user and consumido_em is null;

  insert into public.delete_confirmations (projeto_id, user_id, codigo)
    values (p_projeto_id, v_user, v_codigo);

  -- TODO (quando SMTP estiver ativo): chamar Edge Function send-delete-code
  -- Por enquanto, retorna o código pra UI exibir.
  return v_codigo;
end;
$$;

-- 4) RPC: confirma e deleta
create or replace function public.confirm_delete_project(p_projeto_id uuid, p_codigo text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_conf record;
  v_criador uuid;
begin
  if v_user is null then
    raise exception 'Não autenticado';
  end if;
  select criado_por into v_criador from public.projetos where id = p_projeto_id;
  if v_criador <> v_user then
    raise exception 'Apenas o criador pode excluir';
  end if;

  select * into v_conf from public.delete_confirmations
    where projeto_id = p_projeto_id
      and user_id = v_user
      and codigo = p_codigo
      and consumido_em is null
      and expira_em > now()
    order by criado_em desc limit 1;

  if v_conf.id is null then
    raise exception 'Código inválido ou expirado';
  end if;

  update public.delete_confirmations set consumido_em = now() where id = v_conf.id;

  delete from public.projetos where id = p_projeto_id;
end;
$$;

-- ============================================================
-- Verificação:
--   select column_name from information_schema.columns
--     where table_name='projetos' and column_name='criado_por';
--   select count(*) from information_schema.tables where table_name='delete_confirmations';
-- ============================================================
