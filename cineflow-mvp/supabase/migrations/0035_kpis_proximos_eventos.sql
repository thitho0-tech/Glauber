-- ============================================================
-- Migration 0035 — populate proximos_eventos em projeto_kpis
-- Sprint 2B — Command Center com dados reais
-- ============================================================
-- Cria função que agrega:
--   1. Próximos 3 eventos da agenda (status=agendado)
--   2. Próximas 3 ODs publicadas com data futura
--   3. Próximos 2 prazos de editais
-- E triggers que a chamam automaticamente ao mudar agenda/OD.
-- ============================================================

-- ── Função principal ─────────────────────────────────────────
create or replace function public.populate_proximos_eventos(p_projeto_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_eventos jsonb := '[]'::jsonb;
begin
  -- 1. Eventos da agenda (próximos 3, status agendado)
  select coalesce(jsonb_agg(e order by e->>'data'), '[]'::jsonb)
  into v_eventos
  from (
    select jsonb_build_object(
      'tipo',        'evento_criativo',
      'data',        to_char(data_inicio at time zone 'America/Recife', 'YYYY-MM-DD'),
      'titulo',      titulo,
      'responsavel', coalesce((select nome from public.pessoas p
                                join public.projeto_pessoas pp on pp.pessoa_id = p.id
                                where pp.projeto_id = p_projeto_id
                                and pp.deleted_at is null limit 1), 'Equipe')
    ) as e
    from public.agenda_eventos
    where projeto_id = p_projeto_id
      and status = 'agendado'
      and data_inicio >= now()
      and deleted_at is null
    order by data_inicio
    limit 3
  ) sub;

  -- 2. ODs publicadas com data futura (próximas 2)
  select v_eventos || coalesce(jsonb_agg(e order by e->>'data'), '[]'::jsonb)
  into v_eventos
  from (
    select jsonb_build_object(
      'tipo',        'pagamento',
      'data',        to_char(coalesce(od.data, df.data), 'YYYY-MM-DD'),
      'titulo',      coalesce(od.titulo, 'Ordem do Dia v' || od.versao::text),
      'responsavel', 'Produção'
    ) as e
    from public.ordens_do_dia od
    left join public.dias_filmagem df on df.id = od.dia_id
    where od.projeto_id = p_projeto_id
      and od.publicada_em is not null
      and coalesce(od.data, df.data) >= current_date
    order by coalesce(od.data, df.data)
    limit 2
  ) sub;

  -- 3. Prazos de editais vinculados ao projeto (próximos 2)
  select v_eventos || coalesce(jsonb_agg(e order by e->>'data'), '[]'::jsonb)
  into v_eventos
  from (
    select jsonb_build_object(
      'tipo',        'edital',
      'data',        to_char(p.periodo_inicio + make_interval(months => e.prazo_prestacao_meses), 'YYYY-MM-DD'),
      'titulo',      'Prazo prestação — ' || e.nome,
      'responsavel', 'Produtor Executivo'
    ) as e
    from public.projetos p
    join public.editais e on e.id = p.edital_id
    where p.id = p_projeto_id
      and e.prazo_prestacao_meses is not null
      and p.periodo_inicio is not null
    limit 2
  ) sub;

  -- Atualizar projeto_kpis (upsert)
  insert into public.projeto_kpis (projeto_id, proximos_eventos, updated_at)
  values (p_projeto_id, v_eventos, now())
  on conflict (projeto_id) do update
    set proximos_eventos = excluded.proximos_eventos,
        updated_at       = now();
end;
$$;

-- ── Trigger wrapper ──────────────────────────────────────────
create or replace function public.trg_refresh_proximos_eventos()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_projeto_id uuid;
begin
  -- Detectar projeto_id dependendo da tabela que disparou
  if TG_TABLE_NAME = 'agenda_eventos' then
    v_projeto_id := coalesce(NEW.projeto_id, OLD.projeto_id);
  elsif TG_TABLE_NAME = 'ordens_do_dia' then
    v_projeto_id := coalesce(NEW.projeto_id, OLD.projeto_id);
  end if;

  if v_projeto_id is not null then
    perform public.populate_proximos_eventos(v_projeto_id);
  end if;
  return coalesce(NEW, OLD);
end;
$$;

-- ── Triggers em agenda_eventos ───────────────────────────────
drop trigger if exists refresh_kpis_agenda on public.agenda_eventos;
create trigger refresh_kpis_agenda
  after insert or update or delete on public.agenda_eventos
  for each row execute procedure public.trg_refresh_proximos_eventos();

-- ── Triggers em ordens_do_dia ────────────────────────────────
drop trigger if exists refresh_kpis_od on public.ordens_do_dia;
create trigger refresh_kpis_od
  after insert or update of publicada_em, data, titulo on public.ordens_do_dia
  for each row execute procedure public.trg_refresh_proximos_eventos();

-- ── Backfill: popular eventos para projetos existentes ───────
do $$
declare r record;
begin
  for r in select id from public.projetos where deleted_at is null loop
    perform public.populate_proximos_eventos(r.id);
  end loop;
end $$;

-- Verificação:
-- select projeto_id, jsonb_array_length(proximos_eventos) as total_eventos
-- from projeto_kpis order by updated_at desc limit 5;
