-- ============================================================
-- CINEFLOW - Migration 0022 (HOTFIX): validar_convite + funcao_av
-- ============================================================
-- BUG: validar_convite usava `v_funcao_av record` e so atribuia o
-- record quando v_pessoa.funcao_av_id era NOT NULL. Quando NULL
-- (pessoas cadastradas via texto livre no modal de Novo Projeto),
-- o acesso a v_funcao_av.departamento crashava com:
--   "record 'v_funcao_av' is not assigned yet"
--
-- FIX: trocar record por duas variaveis text (nome + departamento),
-- inicializadas como NULL por padrao.
-- ============================================================

create or replace function public.validar_convite(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_conv record;
  v_pessoa record;
  v_projeto record;
  v_org record;
  v_funcao_nome text;
  v_funcao_depto text;
begin
  select * into v_conv from public.convites where token = p_token limit 1;
  if v_conv.id is null then
    return jsonb_build_object('status', 'invalido', 'mensagem', 'Convite nao encontrado');
  end if;
  if v_conv.status <> 'pendente' then
    return jsonb_build_object('status', v_conv.status, 'mensagem', 'Convite ja foi ' || v_conv.status);
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
    select nome, departamento into v_funcao_nome, v_funcao_depto
      from public.funcoes_av where id = v_pessoa.funcao_av_id;
  end if;

  return jsonb_build_object(
    'status', 'pendente',
    'email', v_conv.email,
    'pessoa_nome', v_pessoa.pessoa_nome,
    'projeto_nome', v_projeto.nome,
    'org_nome', v_org.nome,
    'funcao', coalesce(v_funcao_nome, v_pessoa.papel_descricao),
    'departamento', v_funcao_depto
  );
end;
$$;

grant execute on function public.validar_convite(text) to anon, authenticated;

-- ============================================================
-- Verificacao:
--   select public.validar_convite('seu-token-aqui'::text);
-- ============================================================
