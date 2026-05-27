-- ============================================================
-- CINEFLOW — Migration 0010 (C2): Convites por e-mail + OTP
-- ============================================================
-- Tabela `convites`: cada pessoa cadastrada num projeto recebe um token único
-- que vira link. Por enquanto o link é compartilhado manualmente. Quando SMTP
-- estiver ativo, Edge Function `send-invite` envia automaticamente.
--
-- Fluxo:
--   1. Admin cria pessoa em projeto_pessoas (Team.tsx)
--   2. RPC criar_convite() gera token e retorna link
--   3. Pessoa abre link → valida_convite → cria conta com aquele e-mail
--   4. Após signup, aceitar_convite() vincula user a memberships
-- ============================================================

create table if not exists public.convites (
  id uuid primary key default gen_random_uuid(),
  projeto_pessoa_id uuid not null references public.projeto_pessoas(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  email text not null,
  token text not null unique,
  status text not null check (status in ('pendente','aceito','expirado','cancelado')) default 'pendente',
  expira_em timestamptz not null default (now() + interval '14 days'),
  aceito_em timestamptz,
  aceito_por uuid references auth.users(id),
  criado_por uuid references auth.users(id),
  criado_em timestamptz default now()
);

create index if not exists convites_pp_idx on public.convites(projeto_pessoa_id);
create index if not exists convites_email_idx on public.convites(email);

alter table public.convites enable row level security;

drop policy if exists "convites select org" on public.convites;
create policy "convites select org" on public.convites for select
  using (org_id in (select public.user_orgs()));

drop policy if exists "convites insert org" on public.convites;
create policy "convites insert org" on public.convites for insert
  with check (org_id in (select public.user_orgs()));

drop policy if exists "convites update org" on public.convites;
create policy "convites update org" on public.convites for update
  using (org_id in (select public.user_orgs()));

-- ---------- RPC: criar_convite ----------

create or replace function public.criar_convite(p_projeto_pessoa_id uuid)
returns text  -- retorna o token
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_pp record;
  v_email text;
  v_token text;
  v_org uuid;
begin
  select pp.*, pe.email, pr.org_id into v_pp
    from public.projeto_pessoas pp
    join public.pessoas pe on pe.id = pp.pessoa_id
    join public.projetos pr on pr.id = pp.projeto_id
    where pp.id = p_projeto_pessoa_id;

  if v_pp.email is null or v_pp.email = '' then
    raise exception 'Pessoa sem e-mail cadastrado — adicione e-mail antes de gerar convite';
  end if;

  v_email := lower(v_pp.email);
  v_org := v_pp.org_id;

  -- Cancela convites pendentes anteriores
  update public.convites set status = 'cancelado'
    where projeto_pessoa_id = p_projeto_pessoa_id and status = 'pendente';

  -- Gera token único (32 chars hex)
  v_token := encode(gen_random_bytes(24), 'hex');

  insert into public.convites (projeto_pessoa_id, org_id, email, token, criado_por)
    values (p_projeto_pessoa_id, v_org, v_email, v_token, auth.uid());

  return v_token;
end;
$$;

-- ---------- RPC: validar_convite (público — usado pela tela de aceite) ----------

create or replace function public.validar_convite(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_conv record;
  v_pessoa record;
  v_projeto record;
  v_org record;
  v_funcao_av record;
begin
  select * into v_conv from public.convites where token = p_token limit 1;
  if v_conv.id is null then
    return jsonb_build_object('status', 'invalido', 'mensagem', 'Convite não encontrado');
  end if;
  if v_conv.status <> 'pendente' then
    return jsonb_build_object('status', v_conv.status, 'mensagem', 'Convite já foi ' || v_conv.status);
  end if;
  if v_conv.expira_em < now() then
    update public.convites set status = 'expirado' where id = v_conv.id;
    return jsonb_build_object('status', 'expirado', 'mensagem', 'Convite expirou');
  end if;

  select pp.*, pe.nome as pessoa_nome into v_pessoa
    from public.projeto_pessoas pp
    join public.pessoas pe on pe.id = pp.pessoa_id
    where pp.id = v_conv.projeto_pessoa_id;

  select * into v_projeto from public.projetos where id = v_pessoa.projeto_id;
  select * into v_org from public.orgs where id = v_conv.org_id;

  if v_pessoa.funcao_av_id is not null then
    select * into v_funcao_av from public.funcoes_av where id = v_pessoa.funcao_av_id;
  end if;

  return jsonb_build_object(
    'status', 'pendente',
    'email', v_conv.email,
    'pessoa_nome', v_pessoa.pessoa_nome,
    'projeto_nome', v_projeto.nome,
    'org_nome', v_org.nome,
    'funcao', coalesce(v_funcao_av.nome, v_pessoa.papel_descricao),
    'departamento', v_funcao_av.departamento
  );
end;
$$;

grant execute on function public.validar_convite(text) to anon, authenticated;

-- ---------- RPC: aceitar_convite (precisa user logado) ----------

create or replace function public.aceitar_convite(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_conv record;
begin
  if v_user_id is null then
    return jsonb_build_object('status', 'erro', 'mensagem', 'Não autenticado');
  end if;

  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then
    return jsonb_build_object('status', 'erro', 'mensagem', 'Sem e-mail no usuário');
  end if;

  select * into v_conv from public.convites where token = p_token limit 1;
  if v_conv.id is null then
    return jsonb_build_object('status', 'erro', 'mensagem', 'Convite inválido');
  end if;
  if v_conv.status <> 'pendente' then
    return jsonb_build_object('status', 'erro', 'mensagem', 'Convite já foi ' || v_conv.status);
  end if;
  if v_conv.expira_em < now() then
    update public.convites set status = 'expirado' where id = v_conv.id;
    return jsonb_build_object('status', 'erro', 'mensagem', 'Convite expirou');
  end if;
  if lower(v_email) <> lower(v_conv.email) then
    return jsonb_build_object('status', 'erro', 'mensagem',
      'Você está logado com outro e-mail. Faça logout e entre como ' || v_conv.email);
  end if;

  -- Cria membership se ainda não existir
  insert into public.memberships (org_id, user_id, papel, ativo)
    values (v_conv.org_id, v_user_id, 'colaborador', true)
    on conflict do nothing;

  update public.convites set status = 'aceito', aceito_em = now(), aceito_por = v_user_id
    where id = v_conv.id;

  return jsonb_build_object('status', 'ok', 'mensagem', 'Convite aceito');
end;
$$;

grant execute on function public.aceitar_convite(text) to authenticated;

-- ============================================================
-- Verificação:
--   select count(*) from information_schema.tables where table_name='convites';
--   select count(*) from information_schema.routines
--     where routine_name in ('criar_convite','validar_convite','aceitar_convite');
-- ============================================================
