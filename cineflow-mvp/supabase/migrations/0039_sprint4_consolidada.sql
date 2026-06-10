-- ============================================================================
-- Migration 0039 — SPRINT 4A CONSOLIDADA (10/06/2026)
-- Corrige os 5 bugs de banco reportados + fundações do novo formato (planilha)
-- APLICAR COLANDO NO SQL EDITOR DO SUPABASE (nunca supabase db push)
-- Pode rodar inteira de uma vez. Todos os blocos são idempotentes.
-- ============================================================================

-- ============================================================================
-- BLOCO 1 — Helpers de segurança (security definer)
-- Causa-raiz do erro "permission denied for table users": policies do 0031
-- consultam auth.users diretamente; o role `authenticated` não tem SELECT lá.
-- ============================================================================

create or replace function public.user_email()
returns text language sql security definer stable
set search_path = public as $$
  select email from auth.users where id = auth.uid()
$$;

create or replace function public.is_membro_projeto(p_projeto_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1
    from public.projeto_pessoas pp
    join public.pessoas pe on pe.id = pp.pessoa_id
    where pp.projeto_id = p_projeto_id
      and pp.deleted_at is null
      and lower(pe.email) = lower((select email from auth.users where id = auth.uid()))
  )
$$;

create or replace function public.user_org_papel(p_org_id uuid)
returns text language sql security definer stable
set search_path = public as $$
  select papel from public.memberships
  where user_id = auth.uid() and org_id = p_org_id and ativo = true
  limit 1
$$;

-- ============================================================================
-- BLOCO 2 — FIX "column e.vencimento does not exist"
-- (trava "Novo planejamento" / dias_filmagem e qualquer trigger de KPI)
-- editais NÃO tem coluna vencimento; o bloco do union em 0029 é removido.
-- ============================================================================

create or replace function public.fn_recalcular_proximos_eventos(p_projeto_id uuid)
returns void language plpgsql security definer
set search_path = public as $$
begin
  update projeto_kpis
  set proximos_eventos = coalesce((
        select jsonb_agg(evt order by (evt->>'data'))
        from (
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
      ), '[]'::jsonb),
      updated_at = now()
  where projeto_id = p_projeto_id;
end $$;

-- Garante linha de KPI para todos os projetos (fix "Erro ao carregar KPIs")
insert into public.projeto_kpis (projeto_id)
select p.id from public.projetos p
where not exists (select 1 from public.projeto_kpis k where k.projeto_id = p.id);

-- ============================================================================
-- BLOCO 3 — FIX RLS de ordens_do_dia ("new row violates row-level security")
-- Em produção a policy ativa ainda é a do 0001 (exige dia_id); OD com
-- dia_id null falha. Recria as 4 policies aceitando projeto_id OU dia_id.
-- O subselect em projetos herda o RLS de projetos (ver Bloco 5 — isolamento).
-- ============================================================================

drop policy if exists "od select org" on public.ordens_do_dia;
drop policy if exists "od insert org" on public.ordens_do_dia;
drop policy if exists "od update org" on public.ordens_do_dia;
drop policy if exists "od delete org" on public.ordens_do_dia;

create policy "od select org" on public.ordens_do_dia for select using (
  projeto_id in (select id from public.projetos)
  or dia_id in (select id from public.dias_filmagem)
);
create policy "od insert org" on public.ordens_do_dia for insert with check (
  projeto_id in (select id from public.projetos)
  or dia_id in (select id from public.dias_filmagem)
);
create policy "od update org" on public.ordens_do_dia for update using (
  projeto_id in (select id from public.projetos)
  or dia_id in (select id from public.dias_filmagem)
);
create policy "od delete org" on public.ordens_do_dia for delete using (
  projeto_id in (select id from public.projetos)
  or dia_id in (select id from public.dias_filmagem)
);

-- ============================================================================
-- BLOCO 4 — FIX Agenda ("permission denied for table users")
-- Recria as policies de agenda sem tocar em auth.users.
-- ============================================================================

drop policy if exists "agenda_eventos_select" on public.agenda_eventos;
drop policy if exists "agenda_eventos_insert" on public.agenda_eventos;
drop policy if exists "agenda_eventos_update" on public.agenda_eventos;
drop policy if exists "agenda_eventos_delete" on public.agenda_eventos;

create policy "agenda_eventos_select" on public.agenda_eventos for select using (
  deleted_at is null
  and projeto_id in (select id from public.projetos)
);
create policy "agenda_eventos_insert" on public.agenda_eventos for insert with check (
  projeto_id in (select id from public.projetos)
);
create policy "agenda_eventos_update" on public.agenda_eventos for update using (
  criado_por = auth.uid()
  or projeto_id in (select id from public.projetos)
);
create policy "agenda_eventos_delete" on public.agenda_eventos for delete using (
  criado_por = auth.uid()
  or projeto_id in (select id from public.projetos)
);

drop policy if exists "agenda_participantes_select" on public.agenda_participantes;
drop policy if exists "agenda_participantes_insert" on public.agenda_participantes;
drop policy if exists "agenda_participantes_delete" on public.agenda_participantes;

create policy "agenda_participantes_select" on public.agenda_participantes for select using (
  evento_id in (select id from public.agenda_eventos)
);
create policy "agenda_participantes_insert" on public.agenda_participantes for insert with check (
  evento_id in (select id from public.agenda_eventos)
);
create policy "agenda_participantes_delete" on public.agenda_participantes for delete using (
  evento_id in (select id from public.agenda_eventos)
);

-- ============================================================================
-- BLOCO 5 — ISOLAMENTO REAL DE PROJETOS (obs 26)
-- Projeto visível apenas para: dono da org, criador do projeto, ou membro
-- da equipe (email match). Como TODAS as policies-filhas usam subselect em
-- projetos, restringir o SELECT aqui isola o projeto inteiro em cascata.
-- ============================================================================

-- 5.1 coluna criado_por (0031 já referenciava; garante existência + default)
alter table public.projetos add column if not exists criado_por uuid references auth.users(id);
alter table public.projetos alter column criado_por set default auth.uid();

-- 5.2 BACKFILL DE SEGURANÇA (rodar ANTES da nova policy!):
-- todo usuário ativo da org vira membro dos projetos atuais da org
-- (estado atual já é compartilhado; isolamento vale do novo fluxo em diante)
insert into public.pessoas (org_id, nome, email, departamento)
select distinct m.org_id, coalesce(nullif(split_part(u.email,'@',1),''),'Membro'), u.email, 'producao'
from public.memberships m
join auth.users u on u.id = m.user_id
where m.ativo = true
  and not exists (
    select 1 from public.pessoas pe
    where pe.org_id = m.org_id and lower(pe.email) = lower(u.email)
  );

insert into public.projeto_pessoas (projeto_id, pessoa_id)
select p.id, pe.id
from public.projetos p
join public.memberships m on m.org_id = p.org_id and m.ativo = true
join auth.users u on u.id = m.user_id
join public.pessoas pe on pe.org_id = p.org_id and lower(pe.email) = lower(u.email)
on conflict (projeto_id, pessoa_id) do nothing;

-- 5.3 nova policy de select em projetos
drop policy if exists "projetos select" on public.projetos;
create policy "projetos select" on public.projetos for select using (
  org_id in (select public.user_orgs())
  and (
    public.user_org_papel(org_id) in ('owner','admin')
    or criado_por = auth.uid()
    or public.is_membro_projeto(id)
  )
);

-- 5.4 trigger: quem cria projeto vira membro automaticamente
-- (também resolve "Você não é membro deste projeto" nas Notificações)
create or replace function public.trg_projeto_criador_membro()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_email text;
  v_pessoa_id uuid;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then return new; end if;

  select id into v_pessoa_id from public.pessoas
  where org_id = new.org_id and lower(email) = lower(v_email) limit 1;

  if v_pessoa_id is null then
    insert into public.pessoas (org_id, nome, email, departamento)
    values (new.org_id, coalesce(nullif(split_part(v_email,'@',1),''),'Membro'), v_email, 'producao')
    returning id into v_pessoa_id;
  end if;

  insert into public.projeto_pessoas (projeto_id, pessoa_id)
  values (new.id, v_pessoa_id)
  on conflict (projeto_id, pessoa_id) do nothing;

  return new;
end $$;

drop trigger if exists projeto_criador_membro on public.projetos;
create trigger projeto_criador_membro
  after insert on public.projetos
  for each row execute function public.trg_projeto_criador_membro();

-- ============================================================================
-- BLOCO 6 — OD publicada → compromisso automático na Agenda (alerta no Mural)
-- ============================================================================

create or replace function public.trg_od_publicada_agenda()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.publicada_em is not null
     and (old.publicada_em is distinct from new.publicada_em)
     and new.data is not null then
    insert into public.agenda_eventos (projeto_id, tipo, titulo, data_inicio, descricao, status)
    select new.projeto_id, 'ordem_do_dia', 'OD publicada: ' || coalesce(new.titulo,'Ordem do Dia'),
           new.data::timestamptz, 'Gerado automaticamente ao publicar a Ordem do Dia.', 'agendado'
    where not exists (
      select 1 from public.agenda_eventos ae
      where ae.projeto_id = new.projeto_id
        and ae.tipo = 'ordem_do_dia'
        and ae.titulo = 'OD publicada: ' || coalesce(new.titulo,'Ordem do Dia')
        and ae.deleted_at is null
    );

    insert into public.notificacoes_inapp (projeto_id, pessoa_email, titulo, mensagem)
    select new.projeto_id, pe.email,
           'Ordem do Dia publicada',
           coalesce(new.titulo,'Ordem do Dia') || ' — ' || to_char(new.data, 'DD/MM/YYYY')
    from public.projeto_pessoas pp
    join public.pessoas pe on pe.id = pp.pessoa_id
    where pp.projeto_id = new.projeto_id
      and pp.deleted_at is null
      and pe.email is not null
      and coalesce(pp.notif_od_inapp, true) = true;
  end if;
  return new;
end $$;

drop trigger if exists od_publicada_agenda on public.ordens_do_dia;
create trigger od_publicada_agenda
  after update on public.ordens_do_dia
  for each row execute function public.trg_od_publicada_agenda();

-- ============================================================================
-- BLOCO 7 — MAPA DE TRANSPORTE (módulo novo — telas na fase 4D)
-- ============================================================================

create table if not exists public.mapas_transporte (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  titulo text not null default 'Mapa de Transporte',
  data date,
  dia_id uuid references public.dias_filmagem(id) on delete set null,
  publicado boolean default false,
  token_publico text unique default encode(gen_random_bytes(16), 'hex'),
  observacoes text,
  criado_em timestamptz default now(),
  deleted_at timestamptz default null
);
create index if not exists idx_mapas_transporte_projeto on public.mapas_transporte(projeto_id);

create table if not exists public.transporte_trechos (
  id uuid primary key default gen_random_uuid(),
  mapa_id uuid not null references public.mapas_transporte(id) on delete cascade,
  ordem int not null default 1,
  veiculo text,
  motorista text,
  contato_motorista text,
  passageiros jsonb default '[]'::jsonb,   -- [{pessoa_id, nome, ordem_embarque, endereco}]
  origem text,
  origem_url text,                          -- link Google Maps/Waze
  destino text,
  destino_url text,
  hora_saida time,
  hora_chegada time,
  observacoes text
);
create index if not exists idx_transporte_trechos_mapa on public.transporte_trechos(mapa_id);

alter table public.mapas_transporte enable row level security;
alter table public.transporte_trechos enable row level security;

drop policy if exists "mapas select" on public.mapas_transporte;
create policy "mapas select" on public.mapas_transporte for all using (
  projeto_id in (select id from public.projetos)
) with check (
  projeto_id in (select id from public.projetos)
);

drop policy if exists "trechos all" on public.transporte_trechos;
create policy "trechos all" on public.transporte_trechos for all using (
  mapa_id in (select id from public.mapas_transporte)
) with check (
  mapa_id in (select id from public.mapas_transporte)
);

-- ============================================================================
-- BLOCO 8 — FICHAS: Elenco, Arte/Figurino, Locações, Documentos de equipe
-- ============================================================================

-- Elenco (ficha física completa + menor de idade + autorização de imagem)
alter table public.personagens add column if not exists ficha jsonb default '{}'::jsonb;
  -- ficha: {altura, peso, manequim, calcado, calca, camisa, tatuagens, cabelo,
  --         cor_olhos, cor_pele, drt, agenciado, agente_nome, agente_contato,
  --         foto_rosto_url, foto_corpo_url, portfolio_url}
alter table public.personagens add column if not exists ator_nome text;
alter table public.personagens add column if not exists menor_de_idade boolean default false;
alter table public.personagens add column if not exists responsavel jsonb default '{}'::jsonb;
  -- responsavel: {nome, contato, declaracao_escola_url, declaracao_pais_url, outros_docs}
alter table public.personagens add column if not exists autorizacao_imagem_url text;

-- Arte e Figurino (aprovação do diretor + origem + vínculo a personagem)
alter table public.figurinos add column if not exists aprovacao_status text default 'em_analise';
alter table public.figurinos add column if not exists aprovacao_comentarios text;
alter table public.arte_objetos add column if not exists aprovacao_status text default 'em_analise';
alter table public.arte_objetos add column if not exists aprovacao_comentarios text;
alter table public.arte_objetos add column if not exists origem text;          -- acervo|aluguel|compra|emprestimo
alter table public.arte_objetos add column if not exists origem_detalhe text;  -- de quem/onde + valor
alter table public.arte_objetos add column if not exists personagem_id uuid references public.personagens(id) on delete set null;
alter table public.arte_objetos add column if not exists foto_url text;

-- Locações (responsável, contatos e regras internas)
alter table public.locacoes add column if not exists responsavel_nome text;
alter table public.locacoes add column if not exists responsavel_contato text;
alter table public.locacoes add column if not exists comentarios text;

-- Documentos por pessoa (RG, CPF, cartão CNPJ, residência, comprovante bancário, foto)
alter table public.pessoas add column if not exists documentos jsonb default '{}'::jsonb;
alter table public.pessoas add column if not exists foto_url text;

-- ============================================================================
-- BLOCO 9 — CHAT: categorias (geral | departamento | privado) p/ Mural (4B)
-- ============================================================================

alter table public.canais add column if not exists tipo text not null default 'departamento';

create table if not exists public.canal_membros (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid not null references public.canais(id) on delete cascade,
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  unique (canal_id, pessoa_id)
);
alter table public.canal_membros enable row level security;
drop policy if exists "canal_membros all" on public.canal_membros;
create policy "canal_membros all" on public.canal_membros for all using (
  canal_id in (select id from public.canais)
) with check (
  canal_id in (select id from public.canais)
);

-- DM: canal privado visível só para quem participa
drop policy if exists "canais select" on public.canais;
create policy "canais select" on public.canais for select using (
  projeto_id in (select id from public.projetos)
  and (
    tipo <> 'privado'
    or id in (
      select cm.canal_id from public.canal_membros cm
      join public.pessoas pe on pe.id = cm.pessoa_id
      where lower(pe.email) = lower(public.user_email())
    )
  )
);

-- canais unique(projeto_id, departamento) impede 2 DMs; relaxa p/ canais privados
alter table public.canais drop constraint if exists canais_projeto_id_departamento_key;
create unique index if not exists canais_projeto_depto_unq
  on public.canais(projeto_id, departamento) where (tipo <> 'privado');

-- ============================================================================
-- BLOCO 10 — Storage: bucket privado p/ documentos (equipe + elenco)
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('documentos', 'documentos', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "documentos upload auth" on storage.objects;
create policy "documentos upload auth" on storage.objects for insert
  to authenticated with check (bucket_id = 'documentos');

drop policy if exists "documentos read auth" on storage.objects;
create policy "documentos read auth" on storage.objects for select
  to authenticated using (bucket_id = 'documentos');

drop policy if exists "documentos delete auth" on storage.objects;
create policy "documentos delete auth" on storage.objects for delete
  to authenticated using (bucket_id = 'documentos');

-- ============================================================================
-- FIM — recarrega o schema cache do PostgREST (evita erro de coluna nova)
-- ============================================================================
notify pgrst, 'reload schema';
