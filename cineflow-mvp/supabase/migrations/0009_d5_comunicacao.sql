-- ============================================================
-- CINEFLOW — Migration 0009 (D5): Canal de comunicação interna
-- ============================================================
-- 1) Tabela `canais` (1 por departamento + 1 "geral" por projeto)
-- 2) Tabela `mensagens` (texto OU áudio)
-- 3) RLS por org (via projeto)
-- 4) Trigger que cria canais padrão ao criar projeto
-- 5) Realtime habilitado para `mensagens`
--
-- Bucket de Storage `mensagens-audio` precisa ser criado manualmente
-- no Dashboard do Supabase (instruções no final do arquivo).
-- ============================================================

create table if not exists public.canais (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  departamento text not null,
  nome text not null,
  criado_em timestamptz default now(),
  unique (projeto_id, departamento)
);
create index if not exists canais_projeto_idx on public.canais(projeto_id);

alter table public.canais enable row level security;
drop policy if exists "canais select" on public.canais;
create policy "canais select" on public.canais for select using (
  projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
);
drop policy if exists "canais insert" on public.canais;
create policy "canais insert" on public.canais for insert with check (
  projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
);
drop policy if exists "canais delete" on public.canais;
create policy "canais delete" on public.canais for delete using (
  projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
);

create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid not null references public.canais(id) on delete cascade,
  autor_id uuid references auth.users(id),
  autor_nome text,                                   -- snapshot pra exibir sem JOIN com auth
  tipo text not null check (tipo in ('texto','audio')) default 'texto',
  conteudo text,                                     -- texto OU caption do áudio
  audio_path text,                                   -- path no bucket (sem dominio)
  audio_duracao_seg int,
  criado_em timestamptz default now()
);
create index if not exists mensagens_canal_idx on public.mensagens(canal_id, criado_em);

alter table public.mensagens enable row level security;
drop policy if exists "mensagens select" on public.mensagens;
create policy "mensagens select" on public.mensagens for select using (
  canal_id in (
    select c.id from public.canais c
    where c.projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
  )
);
drop policy if exists "mensagens insert" on public.mensagens;
create policy "mensagens insert" on public.mensagens for insert with check (
  canal_id in (
    select c.id from public.canais c
    where c.projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
  )
);
drop policy if exists "mensagens delete own" on public.mensagens;
create policy "mensagens delete own" on public.mensagens for delete using (autor_id = auth.uid());

-- Trigger: ao inserir, preenche autor_id e autor_nome se nulos
create or replace function public.trg_set_mensagem_autor()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  v_email text;
  v_meta jsonb;
begin
  if new.autor_id is null then
    new.autor_id := auth.uid();
  end if;
  if new.autor_nome is null then
    select email, raw_user_meta_data into v_email, v_meta from auth.users where id = new.autor_id;
    new.autor_nome := coalesce(v_meta->>'nome_completo', v_meta->>'name', v_email, 'Anônimo');
  end if;
  return new;
end;
$$;

drop trigger if exists set_autor_msg on public.mensagens;
create trigger set_autor_msg before insert on public.mensagens
  for each row execute procedure public.trg_set_mensagem_autor();

-- ---------- Canais padrão ao criar projeto ----------
create or replace function public.trg_criar_canais_padrao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.canais (projeto_id, departamento, nome) values
    (new.id, 'geral',         '#geral'),
    (new.id, 'direcao',       '#direcao'),
    (new.id, 'producao',      '#producao'),
    (new.id, 'fotografia',    '#fotografia'),
    (new.id, 'arte',          '#arte'),
    (new.id, 'som',           '#som'),
    (new.id, 'elenco',        '#elenco'),
    (new.id, 'pos_producao',  '#pos-producao')
  on conflict (projeto_id, departamento) do nothing;
  return new;
end;
$$;

drop trigger if exists criar_canais_padrao on public.projetos;
create trigger criar_canais_padrao
  after insert on public.projetos
  for each row execute procedure public.trg_criar_canais_padrao();

-- Backfill: cria canais nos projetos que já existem
do $$
declare
  r record;
begin
  for r in select id from public.projetos loop
    insert into public.canais (projeto_id, departamento, nome) values
      (r.id, 'geral',         '#geral'),
      (r.id, 'direcao',       '#direcao'),
      (r.id, 'producao',      '#producao'),
      (r.id, 'fotografia',    '#fotografia'),
      (r.id, 'arte',          '#arte'),
      (r.id, 'som',           '#som'),
      (r.id, 'elenco',        '#elenco'),
      (r.id, 'pos_producao',  '#pos-producao')
    on conflict (projeto_id, departamento) do nothing;
  end loop;
end $$;

-- ---------- Realtime ----------
-- Habilita a tabela `mensagens` para receber eventos de INSERT em tempo real
alter publication supabase_realtime add table public.mensagens;

-- ============================================================
-- DEPOIS DESTE SQL — passos manuais no Dashboard:
--   1. Storage → New bucket → name: "mensagens-audio" → Public bucket: ON → Create
--   2. (opcional) Storage → mensagens-audio → Policies → permitir INSERT a authenticated
--      Cole esta política se quiser:
--          CREATE POLICY "audio upload authenticated" ON storage.objects
--          FOR INSERT TO authenticated
--          WITH CHECK (bucket_id = 'mensagens-audio');
--   3. (opcional) Mesmo bucket → permitir SELECT a authenticated
--          CREATE POLICY "audio read authenticated" ON storage.objects
--          FOR SELECT TO authenticated
--          USING (bucket_id = 'mensagens-audio');
--   Sendo o bucket Public, o item 3 não é estritamente necessário pra reproduzir.
--
-- Verificação:
--   select count(*) from public.canais;             -- 8 × nº de projetos
--   select count(*) from public.mensagens;          -- 0 inicialmente
-- ============================================================
