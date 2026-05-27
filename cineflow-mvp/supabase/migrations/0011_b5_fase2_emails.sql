-- ============================================================
-- CINEFLOW — Migration 0011 (B5 fase 2 + C2 ativacao): E-mails reais
-- ============================================================
-- Postgres chama a Edge Function `send-email` via pg_net.
-- A Edge Function chama a API do Resend.
-- ============================================================

create extension if not exists pg_net with schema extensions;

-- ---------- Tabela de secrets (nao exposta) ----------

create table if not exists public._secrets (
  key text primary key,
  value text not null,
  atualizado_em timestamptz default now()
);

alter table public._secrets enable row level security;
revoke all on public._secrets from anon, authenticated;

create or replace function public._set_secret(p_key text, p_value text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public._secrets (key, value, atualizado_em)
    values (p_key, p_value, now())
    on conflict (key) do update set value = excluded.value, atualizado_em = now();
end;
$$;

create or replace function public._get_secret(p_key text)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare v text;
begin
  select value into v from public._secrets where key = p_key;
  return v;
end;
$$;

revoke execute on function public._set_secret(text, text) from anon, authenticated;
revoke execute on function public._get_secret(text) from anon, authenticated;

-- ---------- Helper que chama a Edge Function send-email ----------

create or replace function public._send_email(
  p_to text,
  p_subject text,
  p_html text
) returns bigint
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_base text;
  v_secret text;
  v_url text;
  v_request_id bigint;
begin
  v_base := public._get_secret('EDGE_BASE_URL');
  v_secret := public._get_secret('EDGE_SHARED_SECRET');

  if v_base is null or v_base = '' then
    raise warning 'EDGE_BASE_URL nao configurada - e-mail nao enviado para %', p_to;
    return null;
  end if;
  if v_secret is null or v_secret = '' then
    raise warning 'EDGE_SHARED_SECRET nao configurada - e-mail nao enviado para %', p_to;
    return null;
  end if;

  v_url := rtrim(v_base, '/') || '/send-email';

  select net.http_post(
    url := v_url,
    body := jsonb_build_object('to', p_to, 'subject', p_subject, 'html', p_html),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cineflow-secret', v_secret
    )
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke execute on function public._send_email(text, text, text) from anon, authenticated;

-- ============================================================
-- C2: criar_convite agora envia e-mail
-- ============================================================

create or replace function public.criar_convite(p_projeto_pessoa_id uuid)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_pp record;
  v_email text;
  v_token text;
  v_org uuid;
  v_app_url text;
  v_link text;
  v_html text;
  v_org_rec record;
begin
  select pp.*, pe.email, pe.nome as pessoa_nome, pr.org_id, pr.nome as projeto_nome
    into v_pp
    from public.projeto_pessoas pp
    join public.pessoas pe on pe.id = pp.pessoa_id
    join public.projetos pr on pr.id = pp.projeto_id
    where pp.id = p_projeto_pessoa_id;

  if v_pp.email is null or v_pp.email = '' then
    raise exception 'Pessoa sem e-mail cadastrado';
  end if;

  v_email := lower(v_pp.email);
  v_org := v_pp.org_id;

  select * into v_org_rec from public.orgs where id = v_org;

  update public.convites set status = 'cancelado'
    where projeto_pessoa_id = p_projeto_pessoa_id and status = 'pendente';

  v_token := encode(gen_random_bytes(24), 'hex');

  insert into public.convites (projeto_pessoa_id, org_id, email, token, criado_por)
    values (p_projeto_pessoa_id, v_org, v_email, v_token, auth.uid());

  v_app_url := coalesce(public._get_secret('APP_URL'), 'https://cineflow-mvp.vercel.app');
  v_link := v_app_url || '/convite?token=' || v_token;

  v_html := '<div style="font-family:system-ui,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">'
    || '<h2 style="color:#0f172a">Convite para projeto no CINEFLOW</h2>'
    || '<p>Ola, <strong>' || coalesce(v_pp.pessoa_nome, '') || '</strong>!</p>'
    || '<p>A produtora <strong>' || coalesce(v_org_rec.nome, '') || '</strong> te convidou para participar do projeto <strong>'
    || coalesce(v_pp.projeto_nome, '') || '</strong>.</p>'
    || '<p style="margin:24px 0"><a href="' || v_link
    || '" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Aceitar convite</a></p>'
    || '<p style="color:#64748b;font-size:13px">Ou copie e cole este link:<br><span style="word-break:break-all">'
    || v_link || '</span></p>'
    || '<p style="color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:32px">'
    || 'Link expira em 14 dias.</p></div>';

  perform public._send_email(v_email, 'Convite para projeto no CINEFLOW', v_html);

  return v_token;
end;
$$;

-- ============================================================
-- B5 fase 2: request_delete_project envia codigo por e-mail
-- ============================================================

create or replace function public.request_delete_project(p_projeto_id uuid)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_criador uuid;
  v_codigo text;
  v_email text;
  v_projeto record;
  v_html text;
begin
  if v_user is null then raise exception 'Nao autenticado'; end if;

  select * into v_projeto from public.projetos where id = p_projeto_id;
  v_criador := v_projeto.criado_por;
  if v_criador is null then raise exception 'Projeto nao encontrado'; end if;
  if v_criador <> v_user then raise exception 'Apenas o criador pode excluir'; end if;

  select email into v_email from auth.users where id = v_user;
  if v_email is null then raise exception 'Usuario sem e-mail'; end if;

  v_codigo := lpad((floor(random() * 1000000))::int::text, 6, '0');

  update public.delete_confirmations set consumido_em = now()
    where projeto_id = p_projeto_id and user_id = v_user and consumido_em is null;

  insert into public.delete_confirmations (projeto_id, user_id, codigo)
    values (p_projeto_id, v_user, v_codigo);

  v_html := '<div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">'
    || '<h2 style="color:#b91c1c">Confirmacao de exclusao de projeto</h2>'
    || '<p>Voce solicitou a exclusao do projeto <strong>' || coalesce(v_projeto.nome, '') || '</strong>.</p>'
    || '<p>Para confirmar, use o codigo abaixo:</p>'
    || '<div style="font-family:monospace;font-size:32px;letter-spacing:8px;padding:16px 24px;'
    || 'background:#f1f5f9;text-align:center;border-radius:8px;margin:24px 0;font-weight:700">'
    || v_codigo || '</div>'
    || '<p style="color:#64748b;font-size:13px">Este codigo expira em 15 minutos.</p>'
    || '<p style="color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:32px">'
    || 'Se voce nao solicitou, ignore este e-mail.</p></div>';

  perform public._send_email(v_email, 'Codigo de confirmacao - exclusao de projeto', v_html);

  return 'enviado';
end;
$$;

-- ============================================================
-- DEPLOY (em ordem):
--
-- A) TERMINAL (uma vez):
--      npm i -g supabase
--      supabase login
--      cd cineflow-mvp
--      supabase link --project-ref SEU-REF
--      supabase functions deploy send-email --no-verify-jwt
--
-- B) Configurar secrets DA EDGE FUNCTION:
--      supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
--      supabase secrets set FROM_EMAIL="CINEFLOW <onboarding@resend.dev>"
--      supabase secrets set EDGE_SHARED_SECRET=COLE_UM_HEX_DE_64_CHARS_AQUI
--
-- C) NO SQL EDITOR:
--      select public._set_secret('EDGE_BASE_URL', 'https://SEU-REF.supabase.co/functions/v1');
--      select public._set_secret('EDGE_SHARED_SECRET', 'MESMO_VALOR_DE_B');
--      select public._set_secret('APP_URL', 'https://cineflow-mvp.vercel.app');
--
-- D) TESTE:
--      select public._send_email('seu@email.com', 'Teste CINEFLOW', '<p>OK</p>');
-- ============================================================
