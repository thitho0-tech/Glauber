-- ============================================================
-- CINEFLOW - Migration 0019 (HOTFIX): gen_random_bytes
-- ============================================================
-- A funcao criar_convite chama gen_random_bytes(24) que vive no
-- schema `extensions` (padrao Supabase). Como o search_path era
-- (public, pg_temp), nao encontrava a funcao -> erro:
--   "function gen_random_bytes(integer) does not exist"
--
-- Fix: incluir `extensions` no search_path E referenciar com
-- prefixo explicito por seguranca.
-- ============================================================

-- Garante a extensao (idempotente)
create extension if not exists pgcrypto with schema extensions;

create or replace function public.criar_convite(p_projeto_pessoa_id uuid)
returns text
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
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

  -- Prefixo explicito extensions. para evitar quaisquer surpresas de search_path
  v_token := encode(extensions.gen_random_bytes(24), 'hex');

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

-- Verificacao:
--   select count(*) from pg_extension where extname='pgcrypto';
--   select extensions.gen_random_bytes(8);   -- deve retornar bytea
