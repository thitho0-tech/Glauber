-- ============================================================
-- CINEFLOW - Migration 0018 (D6 fase 2): OCR real via Edge Function
-- ============================================================
-- RPC publica `extrair_ocr_documento(p_documento_id)` que:
--   1. Valida que o user pode mexer no doc (RLS via select)
--   2. Marca o doc como processando
--   3. Chama a Edge Function ocr-extract via pg_net
--   4. Retorna o request_id do pg_net
--
-- A Edge Function depois popula dados_ocr e muda status para 'recebido'.
--
-- Pre-requisitos:
--   - Edge Function `ocr-extract` deployada
--   - Secret MISTRAL_API_KEY setado na Edge
--   - EDGE_BASE_URL e EDGE_SHARED_SECRET ja configurados (0011)
-- ============================================================

create or replace function public.extrair_ocr_documento(p_documento_id uuid)
returns bigint
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_doc record;
  v_base text;
  v_secret text;
  v_url text;
  v_request_id bigint;
begin
  -- Valida acesso: RLS bloqueia se o user nao for da org
  select * into v_doc
  from public.documentos_pessoa
  where id = p_documento_id
    and org_id in (select public.user_orgs());

  if v_doc.id is null then
    raise exception 'Documento nao encontrado ou sem permissao';
  end if;
  if v_doc.arquivo_url is null or v_doc.arquivo_url = '' then
    raise exception 'Documento sem URL de arquivo';
  end if;

  v_base := public._get_secret('EDGE_BASE_URL');
  v_secret := public._get_secret('EDGE_SHARED_SECRET');

  if v_base is null or v_secret is null then
    raise exception 'EDGE_BASE_URL / EDGE_SHARED_SECRET nao configurados';
  end if;

  v_url := rtrim(v_base, '/') || '/ocr-extract';

  -- Marca como 'processando' (estado intermediario)
  update public.documentos_pessoa
    set dados_ocr = jsonb_build_object('status', 'processando', 'iniciado_em', now())
    where id = p_documento_id;

  select net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'documento_id', p_documento_id::text,
      'arquivo_url', v_doc.arquivo_url,
      'tipo', v_doc.tipo
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cineflow-secret', v_secret
    )
  ) into v_request_id;

  return v_request_id;
end;
$$;

grant execute on function public.extrair_ocr_documento(uuid) to authenticated;

-- Verificacao:
--   select count(*) from information_schema.routines where routine_name='extrair_ocr_documento';
