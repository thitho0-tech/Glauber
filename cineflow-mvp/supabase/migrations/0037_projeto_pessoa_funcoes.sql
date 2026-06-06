-- ============================================================
-- GLAUBER — Migration 0037 (Sprint 3A): Multi-função por projeto
-- ============================================================
-- Permite que uma pessoa exerça VÁRIAS funções no mesmo projeto.
-- Estratégia: tabela de junção (não multiplica linhas de projeto_pessoas,
-- então NÃO quebra escalas/check_ins que assumem 1 linha por pessoa/projeto).
--
--   projeto_pessoa_funcoes (projeto_pessoa_id, funcao_av_id, principal)
--
-- `principal = true` marca a função usada no Command Center (1 por pessoa).
-- Mantém projeto_pessoas.funcao_av_id por compatibilidade (sincronizado com
-- a função principal).
-- ============================================================

create table if not exists public.projeto_pessoa_funcoes (
  id uuid primary key default gen_random_uuid(),
  projeto_pessoa_id uuid not null
    references public.projeto_pessoas(id) on delete cascade,
  funcao_av_id uuid not null
    references public.funcoes_av(id),
  principal boolean not null default false,
  criado_em timestamptz default now(),
  unique (projeto_pessoa_id, funcao_av_id)
);

create index if not exists ppf_projeto_pessoa_idx
  on public.projeto_pessoa_funcoes(projeto_pessoa_id);
create index if not exists ppf_funcao_idx
  on public.projeto_pessoa_funcoes(funcao_av_id);

-- Garante no máximo UMA função principal por vínculo
create unique index if not exists ppf_uma_principal_idx
  on public.projeto_pessoa_funcoes(projeto_pessoa_id)
  where principal;

-- ---------- RLS (espelha projeto_pessoas via join) ----------
alter table public.projeto_pessoa_funcoes enable row level security;

drop policy if exists "ppf select" on public.projeto_pessoa_funcoes;
create policy "ppf select" on public.projeto_pessoa_funcoes for select
  using (
    projeto_pessoa_id in (
      select pp.id from public.projeto_pessoas pp
      join public.projetos p on p.id = pp.projeto_id
      where p.org_id in (select public.user_orgs())
    )
  );

drop policy if exists "ppf insert" on public.projeto_pessoa_funcoes;
create policy "ppf insert" on public.projeto_pessoa_funcoes for insert
  with check (
    projeto_pessoa_id in (
      select pp.id from public.projeto_pessoas pp
      join public.projetos p on p.id = pp.projeto_id
      where p.org_id in (select public.user_orgs())
    )
  );

drop policy if exists "ppf update" on public.projeto_pessoa_funcoes;
create policy "ppf update" on public.projeto_pessoa_funcoes for update
  using (
    projeto_pessoa_id in (
      select pp.id from public.projeto_pessoas pp
      join public.projetos p on p.id = pp.projeto_id
      where p.org_id in (select public.user_orgs())
    )
  );

drop policy if exists "ppf delete" on public.projeto_pessoa_funcoes;
create policy "ppf delete" on public.projeto_pessoa_funcoes for delete
  using (
    projeto_pessoa_id in (
      select pp.id from public.projeto_pessoas pp
      join public.projetos p on p.id = pp.projeto_id
      where p.org_id in (select public.user_orgs())
    )
  );

-- ---------- Backfill: 1 função principal por vínculo existente ----------
insert into public.projeto_pessoa_funcoes (projeto_pessoa_id, funcao_av_id, principal)
select pp.id, pp.funcao_av_id, true
  from public.projeto_pessoas pp
  where pp.funcao_av_id is not null
  on conflict (projeto_pessoa_id, funcao_av_id) do nothing;

-- ---------- Trigger: manter projeto_pessoas.funcao_av_id = função principal ----------
create or replace function public.sync_funcao_principal()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if (TG_OP = 'DELETE') then
    if old.principal then
      update public.projeto_pessoas set funcao_av_id = null
        where id = old.projeto_pessoa_id;
    end if;
    return old;
  else
    if new.principal then
      update public.projeto_pessoas set funcao_av_id = new.funcao_av_id
        where id = new.projeto_pessoa_id;
    end if;
    return new;
  end if;
end $$;

drop trigger if exists trg_sync_funcao_principal on public.projeto_pessoa_funcoes;
create trigger trg_sync_funcao_principal
  after insert or update or delete on public.projeto_pessoa_funcoes
  for each row execute function public.sync_funcao_principal();

-- ============================================================
-- Verificação (rodar depois):
--   select pp.id, count(*) as n_funcoes,
--          count(*) filter (where ppf.principal) as n_principal
--     from public.projeto_pessoas pp
--     left join public.projeto_pessoa_funcoes ppf on ppf.projeto_pessoa_id = pp.id
--    group by pp.id
--   having count(*) filter (where ppf.principal) > 1;  -- deve voltar 0 linhas
-- ============================================================
