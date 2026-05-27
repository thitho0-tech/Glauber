-- ============================================================
-- CINEFLOW - Migration 0021: criar_projeto_com_equipe
-- ============================================================
-- RPC atomica que cria o projeto + cadastra equipe principal +
-- gera convites (com envio de e-mail) em uma unica transacao.
--
-- Input (jsonb):
--   {
--     "projeto": {
--        "nome": "...", "tipo": "curta", "orcamento_total": 1000,
--        "periodo_inicio": "2026-06-01", "periodo_fim": "2026-06-30",
--        "edital_id": "uuid|null"
--     },
--     "equipe": [
--        { "nome": "Fulano", "email": "f@x.com", "funcao": "Diretor",
--          "convidar": true },
--        ...
--     ]
--   }
--
-- Output (jsonb):
--   {
--     "projeto_id": "uuid",
--     "pessoas_criadas": 5,
--     "convites_enviados": 3,
--     "erros": [ ... opcional ]
--   }
--
-- - Reutiliza pessoa existente (mesmo email + org_id) em vez de duplicar
-- - Se convidar=true e tem e-mail, chama criar_convite() que dispara e-mail
-- - Tudo dentro de transacao implicita do plpgsql: rollback em qualquer erro
-- ============================================================

create or replace function public.criar_projeto_com_equipe(
  p_payload jsonb
) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_projeto record;
  v_proj_in jsonb := p_payload->'projeto';
  v_equipe jsonb := coalesce(p_payload->'equipe', '[]'::jsonb);
  v_membro jsonb;
  v_pessoa_id uuid;
  v_pp_id uuid;
  v_token text;
  v_pessoas_criadas int := 0;
  v_convites_enviados int := 0;
  v_email text;
  v_nome text;
  v_funcao text;
  v_convidar boolean;
begin
  if v_user is null then
    raise exception 'Nao autenticado';
  end if;

  -- Resolve org do usuario (primeira org ativa)
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
    v_nome := trim(coalesce(v_membro->>'nome', ''));
    v_email := lower(trim(coalesce(v_membro->>'email', '')));
    v_funcao := trim(coalesce(v_membro->>'funcao', ''));
    v_convidar := coalesce((v_membro->>'convidar')::boolean, false);

    -- pula linha sem nome
    if v_nome = '' then continue; end if;

    -- reusa pessoa existente (mesma org + mesmo email nao vazio)
    v_pessoa_id := null;
    if v_email <> '' then
      select id into v_pessoa_id
        from public.pessoas
        where org_id = v_org and lower(email) = v_email
        limit 1;
    end if;

    if v_pessoa_id is null then
      insert into public.pessoas (org_id, nome, email, funcao)
        values (v_org, v_nome, nullif(v_email, ''), nullif(v_funcao, ''))
        returning id into v_pessoa_id;
      v_pessoas_criadas := v_pessoas_criadas + 1;
    end if;

    -- vincula no projeto (idempotente via UNIQUE(projeto_id,pessoa_id))
    insert into public.projeto_pessoas (projeto_id, pessoa_id, papel_descricao)
      values (v_projeto.id, v_pessoa_id, nullif(v_funcao, ''))
      on conflict (projeto_id, pessoa_id) do update
        set papel_descricao = excluded.papel_descricao
      returning id into v_pp_id;

    -- 3) convite (opcional, so com e-mail valido)
    if v_convidar and v_email <> '' then
      begin
        v_token := public.criar_convite(v_pp_id);
        if v_token is not null then
          v_convites_enviados := v_convites_enviados + 1;
        end if;
      exception when others then
        -- nao falha o projeto todo se um e-mail nao for enviado
        raise warning 'Falha ao gerar convite para %: %', v_email, sqlerrm;
      end;
    end if;
  end loop;

  return jsonb_build_object(
    'projeto_id', v_projeto.id,
    'pessoas_criadas', v_pessoas_criadas,
    'convites_enviados', v_convites_enviados
  );
end;
$$;

grant execute on function public.criar_projeto_com_equipe(jsonb) to authenticated;

-- ============================================================
-- Verificacao:
--   select public.criar_projeto_com_equipe(jsonb_build_object(
--     'projeto', jsonb_build_object('nome', 'Teste RPC', 'tipo', 'curta'),
--     'equipe', '[]'::jsonb
--   ));
-- ============================================================
