-- ============================================================
-- CINEFLOW - Migration 0014 (D2): Personagens + escalacao
-- ============================================================
-- Personagens vivem por projeto. Cada personagem PODE ser escalado para
-- 1 ator (via projeto_pessoas).
-- ============================================================

create table if not exists public.personagens (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  nome text not null,
  descricao text,
  idade_aparente text,
  caracteristicas text,
  foto_url text,
  criado_em timestamptz default now()
);
create index if not exists personagens_projeto_idx on public.personagens(projeto_id);

alter table public.personagens enable row level security;

drop policy if exists "personagens select org" on public.personagens;
create policy "personagens select org" on public.personagens for select using (
  projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
);
drop policy if exists "personagens write org" on public.personagens;
create policy "personagens write org" on public.personagens for all using (
  projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
) with check (
  projeto_id in (select p.id from public.projetos p where p.org_id in (select public.user_orgs()))
);

-- Liga figurino a personagem (FK postergada de 0013)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'figurinos_personagem_fk') then
    alter table public.figurinos
      add constraint figurinos_personagem_fk
      foreign key (personagem_id) references public.personagens(id) on delete set null;
  end if;
end $$;

-- Adiciona personagem_id em projeto_pessoas (qual personagem o ator interpreta)
alter table public.projeto_pessoas
  add column if not exists personagem_id uuid references public.personagens(id) on delete set null;

create index if not exists projeto_pessoas_personagem_idx on public.projeto_pessoas(personagem_id);

-- Verificacao:
--   select count(*) from information_schema.tables where table_name='personagens';
--   select count(*) from information_schema.columns
--     where table_name='projeto_pessoas' and column_name='personagem_id';
