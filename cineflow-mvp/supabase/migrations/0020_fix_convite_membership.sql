-- ============================================================
-- CINEFLOW - Migration 0020 (HOTFIX CRITICO): convite + membership
-- ============================================================
-- Conserta 3 bugs do fluxo de convite que impedem a pessoa
-- convidada de efetivamente entrar no projeto:
--
-- BUG 1 - aceitar_convite tentava inserir papel='colaborador' em
--         memberships, mas o check constraint so aceita:
--         owner, admin_financeiro, diretor_producao, diretor, ad,
--         chefe_departamento, equipe.
--         -> Mudamos para 'equipe' (papel valido + nivel base).
--
-- BUG 2 - criar_convite cancelava TODOS pendentes a cada clique,
--         entao se o usuario clicasse 2x no botao Convite (pra
--         reabrir o dialog), o link que ja estava no e-mail virava
--         'cancelado'. -> Tornamos idempotente: se ja existe um
--         pendente nao-expirado, reutiliza o token (so reenvia
--         e-mail se forcar). E adicionamos regerar_convite() pra
--         explicitamente invalidar e gerar novo.
--
-- BUG 3 - Mojibake (Diretor(a) de Produc, c-cedilha errado etc).
--         Limpa funcoes_av e pessoas com sequencias UTF8-as-Latin1.
-- ============================================================

-- ---------- 1) aceitar_convite com papel correto ----------

create or replace function public.aceitar_convite(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_conv record;
begin
  if v_user_id is null then
    return jsonb_build_object('status', 'erro', 'mensagem', 'Nao autenticado');
  end if;

  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then
    return jsonb_build_object('status', 'erro', 'mensagem', 'Sem e-mail no usuario');
  end if;

  select * into v_conv from public.convites where token = p_token limit 1;
  if v_conv.id is null then
    return jsonb_build_object('status', 'erro', 'mensagem', 'Convite invalido');
  end if;
  if v_conv.status <> 'pendente' then
    return jsonb_build_object('status', 'erro', 'mensagem', 'Convite ja foi ' || v_conv.status);
  end if;
  if v_conv.expira_em < now() then
    update public.convites set status = 'expirado' where id = v_conv.id;
    return jsonb_build_object('status', 'erro', 'mensagem', 'Convite expirou');
  end if;
  if lower(v_email) <> lower(v_conv.email) then
    return jsonb_build_object('status', 'erro', 'mensagem',
      'Voce esta logado com outro e-mail. Faca logout e entre como ' || v_conv.email);
  end if;

  -- FIX BUG 1: usa 'equipe' (valor valido no check constraint).
  -- O papel org-level eh basico (acesso a ver projetos da org);
  -- o papel REAL da pessoa no projeto fica em
  -- projeto_pessoas.papel_projeto (RBAC granular via 0016).
  insert into public.memberships (org_id, user_id, papel, ativo)
    values (v_conv.org_id, v_user_id, 'equipe', true)
    on conflict (org_id, user_id) do update set ativo = true;

  update public.convites set status = 'aceito', aceito_em = now(), aceito_por = v_user_id
    where id = v_conv.id;

  return jsonb_build_object('status', 'ok', 'mensagem', 'Convite aceito');
end;
$$;

grant execute on function public.aceitar_convite(text) to authenticated;

-- ---------- 2) criar_convite idempotente ----------

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
  v_existente record;
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

  -- FIX BUG 2: se ja existe pendente nao-expirado, REUTILIZA o token.
  -- O e-mail vai ser reenviado (Resend) mas o LINK permanece o mesmo,
  -- entao quem ja tinha o link antigo continua conseguindo aceitar.
  select * into v_existente
    from public.convites
    where projeto_pessoa_id = p_projeto_pessoa_id
      and status = 'pendente'
      and expira_em > now()
    order by criado_em desc
    limit 1;

  if v_existente.id is not null then
    v_token := v_existente.token;
  else
    v_token := encode(extensions.gen_random_bytes(24), 'hex');
    insert into public.convites (projeto_pessoa_id, org_id, email, token, criado_por)
      values (p_projeto_pessoa_id, v_org, v_email, v_token, auth.uid());
  end if;

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

-- ---------- 3) regerar_convite (force-cancel + novo token) ----------

create or replace function public.regerar_convite(p_projeto_pessoa_id uuid)
returns text
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  update public.convites set status = 'cancelado'
    where projeto_pessoa_id = p_projeto_pessoa_id and status = 'pendente';
  return public.criar_convite(p_projeto_pessoa_id);
end;
$$;

grant execute on function public.regerar_convite(uuid) to authenticated;

-- ---------- 4) Fix mojibake nas tabelas afetadas ----------
-- convert_from(convert_to(x,'LATIN1'),'UTF8') desfaz o ciclo
-- UTF8-encoded-as-Latin1 que produziu "Ã§"/"Ã£" etc.
-- So aplica quando detecta a assinatura tipica (caractere C3 seguido
-- de byte na faixa 80-BF interpretado como Latin1 = "Ã" seguido de
-- um simbolo). Heuristica: contem 'Ã'.

do $fix$
begin
  -- funcoes_av.nome
  begin
    update public.funcoes_av
      set nome = convert_from(convert_to(nome, 'LATIN1'), 'UTF8')
      where nome like '%Ã%';
  exception when undefined_column or undefined_table then null;
  end;

  -- pessoas.nome
  begin
    update public.pessoas
      set nome = convert_from(convert_to(nome, 'LATIN1'), 'UTF8')
      where nome like '%Ã%';
  exception when undefined_column or undefined_table then null;
  end;

  -- pessoas.funcao
  begin
    update public.pessoas
      set funcao = convert_from(convert_to(funcao, 'LATIN1'), 'UTF8')
      where funcao like '%Ã%';
  exception when undefined_column or undefined_table then null;
  end;

  -- projeto_pessoas.papel_descricao
  begin
    update public.projeto_pessoas
      set papel_descricao = convert_from(convert_to(papel_descricao, 'LATIN1'), 'UTF8')
      where papel_descricao like '%Ã%';
  exception when undefined_column or undefined_table then null;
  end;

  -- projetos.nome
  begin
    update public.projetos
      set nome = convert_from(convert_to(nome, 'LATIN1'), 'UTF8')
      where nome like '%Ã%';
  exception when undefined_column or undefined_table then null;
  end;

  -- projetos.sinopse
  begin
    update public.projetos
      set sinopse = convert_from(convert_to(sinopse, 'LATIN1'), 'UTF8')
      where sinopse like '%Ã%';
  exception when undefined_column or undefined_table then null;
  end;

  -- orgs.nome
  begin
    update public.orgs
      set nome = convert_from(convert_to(nome, 'LATIN1'), 'UTF8')
      where nome like '%Ã%';
  exception when undefined_column or undefined_table then null;
  end;
end
$fix$;

-- ============================================================
-- Verificacao:
--   select status, count(*) from public.convites group by status;
--   select nome from public.funcoes_av where nome like '%cao' or nome like '%cao)';
--   -- nao deve ter NENHUMA linha com 'Ã' nas tabelas acima
-- ============================================================
