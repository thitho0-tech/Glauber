-- ============================================================
-- 0071 — Fix import CSV (validação e-mail), RPC criar_dm,
--         papel_projeto default
-- APLICADA EM PRODUÇÃO em 02/07/2026 via MCP (Cowork).
-- Este arquivo é o registro para manter paridade repo/produção.
-- ============================================================

-- (A) criar_projeto_com_equipe: valida e-mail; papel default 'departamento'
create or replace function public.criar_projeto_com_equipe(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
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

  for v_membro in select * from jsonb_array_elements(v_equipe) loop
    v_nome           := trim(coalesce(v_membro->>'nome', ''));
    v_email          := lower(trim(coalesce(v_membro->>'email', '')));
    v_funcao_texto   := trim(coalesce(v_membro->>'funcao', ''));
    v_funcao_av_id   := nullif(v_membro->>'funcao_av_id', '')::uuid;
    v_convidar       := coalesce((v_membro->>'convidar')::boolean, false);

    if v_nome = '' then continue; end if;

    -- FIX 0071: e-mail inválido não deduplica nem convida
    if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      v_email := '';
    end if;

    v_pessoa_id := null;
    if v_email <> '' then
      select id into v_pessoa_id
        from public.pessoas
        where org_id = v_org and lower(email) = v_email
        limit 1;
    end if;

    if v_pessoa_id is null then
      insert into public.pessoas (org_id, nome, email)
        values (v_org, v_nome, nullif(v_email, ''))
        returning id into v_pessoa_id;
      v_pessoas_criadas := v_pessoas_criadas + 1;
    end if;

    -- FIX 0071: papel_projeto default 'departamento'
    insert into public.projeto_pessoas (projeto_id, pessoa_id, funcao_av_id, papel_descricao, papel_projeto)
      values (v_projeto.id, v_pessoa_id, v_funcao_av_id, nullif(v_funcao_texto, ''), 'departamento')
      on conflict (projeto_id, pessoa_id) do update
        set funcao_av_id    = excluded.funcao_av_id,
            papel_descricao = excluded.papel_descricao,
            papel_projeto   = coalesce(projeto_pessoas.papel_projeto, 'departamento'),
            deleted_at      = null
      returning id into v_pp_id;

    if v_funcao_av_id is not null then
      insert into public.projeto_pessoa_funcoes (projeto_pessoa_id, funcao_av_id, principal)
        values (v_pp_id, v_funcao_av_id, true)
        on conflict (projeto_pessoa_id, funcao_av_id) do nothing;
    end if;

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
$function$;

-- (B) RPC criar_dm — contorna RLS do RETURNING em canal privado
create or replace function public.criar_dm(p_projeto uuid, p_target_pessoa uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_minha_pessoa uuid;
  v_canal uuid;
begin
  if auth.uid() is null then
    raise exception 'Nao autenticado';
  end if;

  if not public.is_membro_projeto(p_projeto)
     and (select criado_por from public.projetos where id = p_projeto) <> auth.uid() then
    raise exception 'Sem acesso ao projeto';
  end if;

  -- minha pessoa no projeto (vínculo por e-mail)
  select pp.pessoa_id into v_minha_pessoa
  from public.projeto_pessoas pp
  join public.pessoas pe on pe.id = pp.pessoa_id
  where pp.projeto_id = p_projeto
    and pp.deleted_at is null
    and lower(pe.email) = lower((select email from auth.users where id = auth.uid()))
  limit 1;

  if v_minha_pessoa is null then
    raise exception 'Seu perfil nao foi encontrado no projeto';
  end if;

  -- DM já existe? (canal privado com ambos como membros)
  select c.id into v_canal
  from public.canais c
  where c.projeto_id = p_projeto and c.tipo = 'privado'
    and exists (select 1 from public.canal_membros m where m.canal_id = c.id and m.pessoa_id = v_minha_pessoa)
    and exists (select 1 from public.canal_membros m where m.canal_id = c.id and m.pessoa_id = p_target_pessoa)
  limit 1;

  if v_canal is not null then
    return v_canal;
  end if;

  insert into public.canais (projeto_id, tipo, departamento, nome)
  values (
    p_projeto, 'privado', 'dm-' || substr(gen_random_uuid()::text, 1, 8),
    coalesce((select nome from public.pessoas where id = p_target_pessoa), 'DM')
  )
  returning id into v_canal;

  insert into public.canal_membros (canal_id, pessoa_id)
  values (v_canal, v_minha_pessoa), (v_canal, p_target_pessoa)
  on conflict do nothing;

  return v_canal;
end;
$function$;

revoke execute on function public.criar_dm(uuid, uuid) from public, anon;
grant execute on function public.criar_dm(uuid, uuid) to authenticated;
