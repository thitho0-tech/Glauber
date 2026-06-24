-- 0065: Rebranding do e-mail de convite (CINEFLOW -> Glauber): persona+logo,
-- cores da marca, assunto, e fallback de APP_URL para glauber.app.br.
-- Lógica de token/convite preservada.

create or replace function public.criar_convite(p_projeto_pessoa_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
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

  v_app_url := coalesce(public._get_secret('APP_URL'), 'https://glauber.app.br');
  v_link := v_app_url || '/convite?token=' || v_token;

  v_html :=
       '<div style="font-family:Inter,system-ui,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">'
    || '<div style="text-align:center;margin-bottom:8px">'
    || '<img src="https://glauber.app.br/favicon-glauber.jpg" alt="" height="44" style="vertical-align:middle;border-radius:8px">'
    || '<img src="https://glauber.app.br/glauber-logo.jpg" alt="Glauber" height="38" style="vertical-align:middle;margin-left:8px">'
    || '</div>'
    || '<h2 style="color:#1F3864;text-align:center;margin:8px 0 4px">Você foi convidado(a) para um projeto no Glauber</h2>'
    || '<p>Olá, <strong>' || coalesce(v_pp.pessoa_nome, '') || '</strong>!</p>'
    || '<p>A produtora <strong>' || coalesce(v_org_rec.nome, '') || '</strong> te convidou para participar do projeto <strong>'
    || coalesce(v_pp.projeto_nome, '') || '</strong>.</p>'
    || '<p style="margin:24px 0;text-align:center"><a href="' || v_link
    || '" style="display:inline-block;padding:12px 28px;background:#1F3864;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Aceitar convite</a></p>'
    || '<p style="color:#64748b;font-size:13px">Ou copie e cole este link:<br><span style="word-break:break-all">'
    || v_link || '</span></p>'
    || '<p style="color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:32px">'
    || 'Link expira em 14 dias. · Glauber — gestão de produção audiovisual</p></div>';

  perform public._send_email(v_email, 'Convite para projeto no Glauber', v_html);

  return v_token;
end;
$$;

revoke all on function public.criar_convite(uuid) from public, anon;
grant execute on function public.criar_convite(uuid) to authenticated;
