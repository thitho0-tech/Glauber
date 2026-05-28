-- Migration: 0029_kpi_eventos.sql
-- Sprint 1B — Função fn_recalcular_proximos_eventos + triggers para populá-la

create or replace function fn_recalcular_proximos_eventos(p_projeto_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update projeto_kpis
  set
    proximos_eventos = (
      select jsonb_agg(evt order by (evt->>'data'))
      from (
        -- Prazos de editais vinculados ao projeto
        select jsonb_build_object(
          'tipo', 'edital',
          'data', e.vencimento::text,
          'titulo', e.nome,
          'responsavel', (select u.email from auth.users u where u.id = p.criado_por limit 1)
        ) as evt
        from editais e
        join projetos p on p.edital_id = e.id
        where p.id = p_projeto_id
          and e.vencimento is not null
          and e.vencimento > now()

        union all

        -- Próximos dias de filmagem confirmados ou em filmagem
        select jsonb_build_object(
          'tipo', 'evento_criativo',
          'data', df.data::text,
          'titulo', 'Dia de filmagem — ' || coalesce(l.nome, 'locação a definir'),
          'responsavel', ''
        ) as evt
        from dias_filmagem df
        left join locacoes l on l.id = df.locacao_id
        where df.projeto_id = p_projeto_id
          and df.data >= current_date
          and df.status in ('confirmado','em_filmagem')
        order by df.data
        limit 5
      ) sub
      limit 5
    ),
    updated_at = now()
  where projeto_id = p_projeto_id;

  -- Se ainda não existe linha em projeto_kpis, criar
  if not found then
    insert into projeto_kpis (projeto_id, proximos_eventos, updated_at)
    values (
      p_projeto_id,
      '[]'::jsonb,
      now()
    )
    on conflict (projeto_id) do update set
      proximos_eventos = excluded.proximos_eventos,
      updated_at = now();
  end if;
end;
$$;

-- Trigger: quando projeto muda de edital → recalcular
create or replace function fn_trg_projeto_edital_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.edital_id is distinct from old.edital_id or new.edital_id is not null then
    perform fn_recalcular_proximos_eventos(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_projeto_edital_kpi on projetos;
create trigger trg_projeto_edital_kpi
  after update of edital_id on projetos
  for each row execute function fn_trg_projeto_edital_changed();

-- Trigger: quando dia_filmagem é inserido/atualizado → recalcular do projeto
create or replace function fn_trg_dia_filmagem_kpi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform fn_recalcular_proximos_eventos(coalesce(new.projeto_id, old.projeto_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_dia_filmagem_kpi on dias_filmagem;
create trigger trg_dia_filmagem_kpi
  after insert or update or delete on dias_filmagem
  for each row execute function fn_trg_dia_filmagem_kpi();
