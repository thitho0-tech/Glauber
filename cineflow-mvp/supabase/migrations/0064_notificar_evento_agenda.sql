-- 0064: Notifica participante ao ser incluído em um evento da Agenda (sino in-app + e-mail).
-- Antes não havia disparo algum para agenda_eventos. Dispara por participante inserido
-- (evento pontual; evento_id not null). Em edição o front recria os participantes -> re-notifica.

create or replace function public.notificar_participante_evento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ev      record;
  v_user    uuid;
  v_email   text;
  v_link    text;
  v_quando  text;
begin
  if new.evento_id is null then
    return new;  -- dias de gravação (dia_id) tratados à parte
  end if;

  select e.titulo, e.projeto_id, e.data_inicio, e.local, e.descricao
    into v_ev
  from public.agenda_eventos e
  where e.id = new.evento_id and e.deleted_at is null;
  if not found then return new; end if;

  select au.id, pe.email
    into v_user, v_email
  from public.projeto_pessoas pp
  join public.pessoas pe on pe.id = pp.pessoa_id
  left join auth.users au on lower(au.email) = lower(pe.email)
  where pp.id = new.projeto_pessoa_id and pp.deleted_at is null;

  v_link  := '/projetos/' || v_ev.projeto_id || '/agenda';
  v_quando := to_char(v_ev.data_inicio at time zone 'UTC', 'DD/MM HH24:MI');

  if v_user is not null then
    insert into public.notificacoes_inapp (user_id, tipo, titulo, mensagem, link)
    values (v_user, 'agenda_evento', 'Novo evento: ' || v_ev.titulo, v_quando, v_link);
  end if;

  if v_email is not null and v_email <> '' then
    perform public._send_email(
      v_email,
      'Glauber · ' || v_ev.titulo,
      '<div style="font-family:Inter,Arial,sans-serif;color:#0f172a">'
      || '<h2 style="color:#1F3864;margin:0 0 8px">' || v_ev.titulo || '</h2>'
      || '<p>Você foi incluído(a) em um evento da agenda do projeto.</p>'
      || '<p><b>Quando:</b> ' || v_quando || '</p>'
      || coalesce('<p><b>Local:</b> ' || v_ev.local || '</p>', '')
      || coalesce('<p>' || v_ev.descricao || '</p>', '')
      || '<p style="color:#64748b;font-size:12px;margin-top:16px">Confirme sua presença no Glauber.</p>'
      || '</div>'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notificar_participante_evento() from public, anon, authenticated;

drop trigger if exists trg_notificar_participante_evento on public.agenda_participantes;
create trigger trg_notificar_participante_evento
  after insert on public.agenda_participantes
  for each row execute function public.notificar_participante_evento();
