-- Migration 0032: Preferências de notificação + tabela notificacoes_inapp
-- Sprint 1D — Decisão 5: notificação configurável por usuário
-- CORRECAO: pessoas NAO tem user_id; para notificar, busca user_id via email match em auth.users

-- ==========================================
-- 1. Colunas de preferência em projeto_pessoas
-- ==========================================

alter table public.projeto_pessoas
  add column if not exists notif_od_inapp boolean default true,
  add column if not exists notif_od_email boolean default false;

-- ==========================================
-- 2. Tabela de notificações in-app
-- ==========================================

create table if not exists public.notificacoes_inapp (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  tipo        text not null default 'od_publicada',
  titulo      text not null,
  mensagem    text,
  link        text,
  lida        boolean default false,
  criado_em   timestamptz default now()
);

-- ==========================================
-- 3. Índices
-- ==========================================

create index if not exists idx_notif_inapp_user     on public.notificacoes_inapp(user_id);
create index if not exists idx_notif_inapp_nao_lida on public.notificacoes_inapp(user_id) where lida = false;
create index if not exists idx_notif_inapp_criado   on public.notificacoes_inapp(criado_em desc);

-- ==========================================
-- 4. RLS
-- ==========================================

alter table public.notificacoes_inapp enable row level security;

create policy "notif_inapp_select" on public.notificacoes_inapp
  for select using (user_id = auth.uid());

create policy "notif_inapp_insert" on public.notificacoes_inapp
  for insert with check (true);

create policy "notif_inapp_update" on public.notificacoes_inapp
  for update using (user_id = auth.uid());

create policy "notif_inapp_delete" on public.notificacoes_inapp
  for delete using (user_id = auth.uid());

-- ==========================================
-- 5. Função: disparar notificações ao publicar OD
--    Busca user_id do membro via email match com auth.users
-- ==========================================

create or replace function public.notificar_od_publicada(
  p_od_id uuid,
  p_projeto_id uuid,
  p_titulo_od text
) returns void
language plpgsql security definer as $$
declare
  v_membro record;
  v_link text;
begin
  v_link := '/projetos/' || p_projeto_id || '/ordens-do-dia/od/' || p_od_id;

  -- Para cada membro ativo com notif_od_inapp = true,
  -- resolve o user_id via email match em auth.users
  for v_membro in
    select au.id as user_id
    from public.projeto_pessoas pp
    join public.pessoas pe on pe.id = pp.pessoa_id
    join auth.users au on lower(au.email) = lower(pe.email)
    where pp.projeto_id = p_projeto_id
      and pp.notif_od_inapp = true
      and pp.deleted_at is null
  loop
    insert into public.notificacoes_inapp (user_id, tipo, titulo, mensagem, link)
    values (
      v_membro.user_id,
      'od_publicada',
      'Nova Ordem do Dia publicada',
      p_titulo_od,
      v_link
    );
  end loop;
end;
$$;
