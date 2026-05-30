-- Migration 0031: Agenda simples
-- Sprint 1D — módulo de eventos leves (ensaios, reuniões, visitas, etc.)
-- CORRECAO: pessoas NAO tem user_id; vinculo e por email match com auth.users

-- ==========================================
-- 1. Tabela principal de eventos de agenda
-- ==========================================

create table if not exists public.agenda_eventos (
  id            uuid primary key default gen_random_uuid(),
  projeto_id    uuid not null references public.projetos(id) on delete cascade,
  tipo          text not null default 'outro',
  titulo        text not null,
  data_inicio   timestamptz not null,
  data_fim      timestamptz,
  periodo       text check (periodo in ('dia', 'semana', 'mes')) default 'dia',
  local         text,
  descricao     text,
  deadline      date,
  status        text check (status in ('agendado', 'realizado', 'cancelado')) default 'agendado',
  criado_por    uuid references auth.users(id),
  criado_em     timestamptz default now(),
  deleted_at    timestamptz default null
);

-- ==========================================
-- 2. Participantes do evento (multiselect da equipe)
-- ==========================================

create table if not exists public.agenda_participantes (
  id                uuid primary key default gen_random_uuid(),
  evento_id         uuid not null references public.agenda_eventos(id) on delete cascade,
  projeto_pessoa_id uuid references public.projeto_pessoas(id) on delete set null,
  confirmado        boolean default false
);

-- ==========================================
-- 3. Índices
-- ==========================================

create index if not exists idx_agenda_eventos_projeto    on public.agenda_eventos(projeto_id);
create index if not exists idx_agenda_eventos_data       on public.agenda_eventos(data_inicio);
create index if not exists idx_agenda_eventos_deleted    on public.agenda_eventos(deleted_at) where deleted_at is not null;
create index if not exists idx_agenda_participantes_evt  on public.agenda_participantes(evento_id);

-- ==========================================
-- 4. RLS
-- ==========================================

alter table public.agenda_eventos       enable row level security;
alter table public.agenda_participantes enable row level security;

-- Helper: projetos acessíveis pelo usuário logado (criador ou membro via email)
-- Usa: criado_por = auth.uid() OU email match em projeto_pessoas + pessoas
create policy "agenda_eventos_select" on public.agenda_eventos
  for select using (
    deleted_at is null
    and (
      criado_por = auth.uid()
      or projeto_id in (
        select id from public.projetos where criado_por = auth.uid()
      )
      or projeto_id in (
        select pp.projeto_id from public.projeto_pessoas pp
        join public.pessoas pe on pe.id = pp.pessoa_id
        where lower(pe.email) = lower((select email from auth.users where id = auth.uid()))
          and pp.deleted_at is null
      )
    )
  );

create policy "agenda_eventos_insert" on public.agenda_eventos
  for insert with check (
    projeto_id in (
      select id from public.projetos where criado_por = auth.uid()
      union
      select pp.projeto_id from public.projeto_pessoas pp
      join public.pessoas pe on pe.id = pp.pessoa_id
      where lower(pe.email) = lower((select email from auth.users where id = auth.uid()))
        and pp.deleted_at is null
    )
  );

create policy "agenda_eventos_update" on public.agenda_eventos
  for update using (
    criado_por = auth.uid()
    or projeto_id in (select id from public.projetos where criado_por = auth.uid())
  );

create policy "agenda_eventos_delete" on public.agenda_eventos
  for delete using (
    criado_por = auth.uid()
    or projeto_id in (select id from public.projetos where criado_por = auth.uid())
  );

-- Participantes: visível para todos os membros do projeto
create policy "agenda_participantes_select" on public.agenda_participantes
  for select using (
    evento_id in (
      select ae.id from public.agenda_eventos ae
      where ae.projeto_id in (
        select id from public.projetos where criado_por = auth.uid()
        union
        select pp.projeto_id from public.projeto_pessoas pp
        join public.pessoas pe on pe.id = pp.pessoa_id
        where lower(pe.email) = lower((select email from auth.users where id = auth.uid()))
      )
    )
  );

create policy "agenda_participantes_insert" on public.agenda_participantes
  for insert with check (true);

create policy "agenda_participantes_delete" on public.agenda_participantes
  for delete using (true);
