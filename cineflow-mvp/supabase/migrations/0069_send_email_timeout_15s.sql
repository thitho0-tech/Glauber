-- 0069_send_email_timeout_15s
-- Sobe o timeout do pg_net em _send_email de 5s (default) para 15s.
-- Motivo: o SMTP do Gmail leva ~5,5s; com o default de 5s o net._http_response
-- registrava "Timeout of 5000 ms" mesmo o e-mail tendo sido enviado (a edge
-- function completa). Com 15s a resposta 200 passa a ser capturada.
-- Aplicada via conector em 24/06/2026.

create or replace function public._send_email(p_to text, p_subject text, p_html text)
 returns bigint
 language plpgsql
 security definer
 set search_path to 'public', 'extensions', 'pg_temp'
as $function$
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
    ),
    timeout_milliseconds := 15000
  ) into v_request_id;

  return v_request_id;
end;
$function$;

revoke execute on function public._send_email(text, text, text) from public, anon;
grant execute on function public._send_email(text, text, text) to authenticated;
