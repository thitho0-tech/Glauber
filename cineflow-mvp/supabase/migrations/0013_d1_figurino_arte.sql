-- ============================================================
-- CINEFLOW - Migration 0013 (D1): Figurino e Arte
-- ============================================================
-- figurinos: pecas de roupa (por personagem opcional)
-- arte_objetos: objetos cenicos / setdec
-- ============================================================

create table if not exists public.figurinos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  personagem_id uuid,                              -- FK declarada em 0014 (depois)
  descricao text not null,
  tamanho text,
  cor text,
  fonte text check (fonte in ('compra','aluguel','emprestimo','producao')) default 'compra',
  valor_estimado numeric(12,2),
  valor_real numeric(12,2),
  status text not null check (status in ('previsto','adquirido','retirado','devolvido')) default 'previsto',
  foto_url text,
  observacoes text,
  criado_em timestamptz default now()
);
create index if not exists figurinos_projeto_idx on public.figurinos(projeto_id);

alter table public.figurinos enable row level security;

drop policy if exists "figurinos select org" on public.figurinos;
create policy "figurinos select org" on public.figurinos for select using (
  projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
);
drop policy if exists "figurinos write org" on public.figurinos;
create policy "figurinos write org" on public.figurinos for all using (
  projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
) with check (
  projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
);

create table if not exists public.arte_objetos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  descricao text not null,
  categoria text,                                  -- setdec, props, especiais, etc.
  fonte text check (fonte in ('compra','aluguel','emprestimo','producao')) default 'compra',
  valor_estimado numeric(12,2),
  valor_real numeric(12,2),
  status text not null check (status in ('previsto','adquirido','em_set','devolvido')) default 'previsto',
  foto_url text,
  observacoes text,
  criado_em timestamptz default now()
);
create index if not exists arte_objetos_projeto_idx on public.arte_objetos(projeto_id);

alter table public.arte_objetos enable row level security;

drop policy if exists "arte_obj select org" on public.arte_objetos;
create policy "arte_obj select org" on public.arte_objetos for select using (
  projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
);
drop policy if exists "arte_obj write org" on public.arte_objetos;
create policy "arte_obj write org" on public.arte_objetos for all using (
  projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
) with check (
  projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
);

-- Verificacao:
--   select count(*) from information_schema.tables where table_name in ('figurinos','arte_objetos');
