-- ============================================================
-- CINEFLOW — Migration 0004 (B1): Equipe POR projeto
-- ============================================================
-- Cria `projeto_pessoas` (vínculo pessoa-projeto com função e cachê próprios).
-- Mantém `pessoas` como catálogo da produtora.
-- Backfill: para cada projeto existente, copia todas as pessoas da org
-- (decisão temporária pra não perder dados — Thiago pode limpar depois).
-- ============================================================

create table if not exists public.projeto_pessoas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  funcao_av_id uuid references public.funcoes_av(id),
  papel_descricao text,                    -- texto livre opcional
  valor_contratacao numeric default 0,
  observacoes text,
  criado_em timestamptz default now(),
  unique (projeto_id, pessoa_id)
);

create index if not exists projeto_pessoas_projeto_idx on public.projeto_pessoas(projeto_id);
create index if not exists projeto_pessoas_pessoa_idx on public.projeto_pessoas(pessoa_id);

alter table public.projeto_pessoas enable row level security;

drop policy if exists "projeto_pessoas select" on public.projeto_pessoas;
create policy "projeto_pessoas select" on public.projeto_pessoas for select
  using (
    projeto_id in (
      select p.id from public.projetos p
      where p.org_id in (select public.user_orgs())
    )
  );

drop policy if exists "projeto_pessoas insert" on public.projeto_pessoas;
create policy "projeto_pessoas insert" on public.projeto_pessoas for insert
  with check (
    projeto_id in (
      select p.id from public.projetos p
      where p.org_id in (select public.user_orgs())
    )
  );

drop policy if exists "projeto_pessoas update" on public.projeto_pessoas;
create policy "projeto_pessoas update" on public.projeto_pessoas for update
  using (
    projeto_id in (
      select p.id from public.projetos p
      where p.org_id in (select public.user_orgs())
    )
  );

drop policy if exists "projeto_pessoas delete" on public.projeto_pessoas;
create policy "projeto_pessoas delete" on public.projeto_pessoas for delete
  using (
    projeto_id in (
      select p.id from public.projetos p
      where p.org_id in (select public.user_orgs())
    )
  );

-- ---------- Backfill ----------
-- Para cada projeto existente, vincula todas as pessoas da mesma org
-- preservando valor_diaria como valor_contratacao inicial.
insert into public.projeto_pessoas (projeto_id, pessoa_id, valor_contratacao, papel_descricao)
select pr.id, pe.id, coalesce(pe.valor_diaria, 0), pe.funcao
  from public.projetos pr
  join public.pessoas pe on pe.org_id = pr.org_id
  on conflict (projeto_id, pessoa_id) do nothing;

-- ============================================================
-- Verificação:
--   select count(*) from public.projeto_pessoas;
-- ============================================================
