-- ============================================================
-- GLAUBER — Migration 0069: função por projeto (catálogo)
-- Reescreve criar_projeto_com_equipe para:
--   1) Ler funcao_av_id do payload em vez de texto livre
--   2) NÃO gravar pessoas.funcao (é global, não deve herdar papel de projeto)
--   3) Gravar funcao_av_id em projeto_pessoas + projeto_pessoa_funcoes
-- Backfill: casa papel_descricao existente com funcoes_av.nome
-- ============================================================

create or replace function public.criar_projeto_com_equipe(
  p_payload jsonb
) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_user           uuid := auth.uid();
  v_org            uuid;
  v_projeto        record;
  v_proj_in        jsonb := p_payload->'projeto';
  v_equipe         jsonb := coalesce(p_payload->'equipe', '[]'::jsonb);
  v_membro         jsonb;
  v_pessoa_id      uuid;
  v_pp_id          uuid;
  v_token          text;
  v_pessoas_criadas  int := 0;
  v_convites_enviados int := 0;
  v_email          text;
  v_nome           text;
  v_funcao_texto   text;
  v_funcao_av_id   uuid;
  v_convidar       boolean;
begin
  if v_user is null then
    raise exception 'Nao autenticado';
  end if;

  select org_id into v_org
    from public.memberships
    where user_id = v_user and ativo = true
    order by criado_em asc
    limit 1;

  if v_org is null then
    raise exception 'Usuario sem produtora associada';
  end if;

  -- 1) cria projeto
  insert into public.projetos (
    org_id, nome, tipo, orcamento_total, periodo_inicio, periodo_fim, edital_id, criado_por
  ) values (
    v_org,
    v_proj_in->>'nome',
    coalesce(v_proj_in->>'tipo', 'curta'),
    coalesce((v_proj_in->>'orcamento_total')::numeric, 0),
    nullif(v_proj_in->>'periodo_inicio', '')::date,
    nullif(v_proj_in->>'periodo_fim', '')::date,
    nullif(v_proj_in->>'edital_id', '')::uuid,
    v_user
  )
  returning * into v_projeto;

  -- 2) loop pela equipe
  for v_membro in select * from jsonb_array_elements(v_equipe) loop
    v_nome           := trim(coalesce(v_membro->>'nome', ''));
    v_email          := lower(trim(coalesce(v_membro->>'email', '')));
    v_funcao_texto   := trim(coalesce(v_membro->>'funcao', ''));
    v_funcao_av_id   := nullif(v_membro->>'funcao_av_id', '')::uuid;
    v_convidar       := coalesce((v_membro->>'convidar')::boolean, false);

    if v_nome = '' then continue; end if;

    -- reusa pessoa por (org, email); NÃO toca pessoas.funcao (é global)
    v_pessoa_id := null;
    if v_email <> '' then
      select id into v_pessoa_id
        from public.pessoas
        where org_id = v_org and lower(email) = v_email
        limit 1;
    end if;

    if v_pessoa_id is null then
      -- cria sem funcao (campo global não carrega papel de projeto)
      insert into public.pessoas (org_id, nome, email)
        values (v_org, v_nome, nullif(v_email, ''))
        returning id into v_pessoa_id;
      v_pessoas_criadas := v_pessoas_criadas + 1;
    end if;

    -- vincula no projeto com funcao_av_id e papel_descricao (rótulo livre opcional)
    insert into public.projeto_pessoas (projeto_id, pessoa_id, funcao_av_id, papel_descricao)
      values (v_projeto.id, v_pessoa_id, v_funcao_av_id, nullif(v_funcao_texto, ''))
      on conflict (projeto_id, pessoa_id) do update
        set funcao_av_id    = excluded.funcao_av_id,
            papel_descricao = excluded.papel_descricao
      returning id into v_pp_id;

    -- insere em projeto_pessoa_funcoes quando houver funcao_av_id
    if v_funcao_av_id is not null then
      insert into public.projeto_pessoa_funcoes (projeto_pessoa_id, funcao_av_id, principal)
        values (v_pp_id, v_funcao_av_id, true)
        on conflict (projeto_pessoa_id, funcao_av_id) do nothing;
    end if;

    -- convite (opcional)
    if v_convidar and v_email <> '' then
      begin
        v_token := public.criar_convite(v_pp_id);
        if v_token is not null then
          v_convites_enviados := v_convites_enviados + 1;
        end if;
      exception when others then
        raise warning 'Falha ao gerar convite para %: %', v_email, sqlerrm;
      end;
    end if;
  end loop;

  return jsonb_build_object(
    'projeto_id',          v_projeto.id,
    'pessoas_criadas',     v_pessoas_criadas,
    'convites_enviados',   v_convites_enviados
  );
end;
$$;

-- Revogar acesso público/anônimo e manter só authenticated
revoke execute on function public.criar_projeto_com_equipe(jsonb) from public, anon;
grant  execute on function public.criar_projeto_com_equipe(jsonb) to authenticated;

-- ============================================================
-- BACKFILL: para vínculos existentes com funcao_av_id IS NULL
-- mas papel_descricao preenchido, tentar casar com funcoes_av.nome
-- ============================================================

do $$
declare
  v_pp record;
  v_fid uuid;
begin
  for v_pp in
    select pp.id as pp_id, pp.papel_descricao
    from public.projeto_pessoas pp
    where pp.funcao_av_id is null
      and pp.papel_descricao is not null
      and pp.deleted_at is null
  loop
    -- match case-insensitive exato
    select id into v_fid
      from public.funcoes_av
      where lower(nome) = lower(v_pp.papel_descricao)
      limit 1;

    -- fallback: match parcial
    if v_fid is null then
      select id into v_fid
        from public.funcoes_av
        where lower(nome) like '%' || lower(v_pp.papel_descricao) || '%'
           or lower(v_pp.papel_descricao) like '%' || lower(nome) || '%'
        limit 1;
    end if;

    if v_fid is not null then
      -- atualiza projeto_pessoas.funcao_av_id
      update public.projeto_pessoas
        set funcao_av_id = v_fid
        where id = v_pp.pp_id;

      -- insere em projeto_pessoa_funcoes
      insert into public.projeto_pessoa_funcoes (projeto_pessoa_id, funcao_av_id, principal)
        values (v_pp.pp_id, v_fid, true)
        on conflict (projeto_pessoa_id, funcao_av_id) do nothing;
    end if;
  end loop;
end;
$$;
