-- ============================================================
-- CINEFLOW - Migration 0023: Roteiro + decupagem automatica por IA
-- ============================================================
-- Novo módulo "Roteiro" que substitui a entrada de Decupagem
-- na navegação. O usuário sobe um roteiro (.pdf, .fdx,
-- .docx, texto colado) e a Edge Function analisar-roteiro chama
-- Mistral chat pra extrair:
--   - cenas (cabeçalho INT/EXT, local, dia/noite, sinopse)
--   - personagens
--   - elementos de arte (objetos cenicos)
--   - figurino
--   - efeitos especiais
--   - duração estimada
--   - planos sugeridos (lista técnica por cena)
--
-- Schema:
--   1 projeto -> 1 roteiro (versao corrente)
--   1 roteiro -> N roteiro_cenas
--   1 cena -> N roteiro_planos_sugeridos
-- ============================================================

-- ---------- 1) roteiros ----------

create table if not exists public.roteiros (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  texto text not null,                                -- conteudo do roteiro (texto/markdown)
  arquivo_nome text,                                  -- nome do arquivo original
  arquivo_tipo text,                                  -- pdf/docx/fdx/txt
  paginas_estimadas int,                              -- estimativa simples (chars/3000)
  status text not null default 'cru'
    check (status in ('cru', 'analisando', 'decupado', 'erro')),
  mensagem_erro text,
  modelo_ia text,                                     -- e.g. mistral-large-latest
  decupado_em timestamptz,
  criado_em timestamptz default now(),
  criado_por uuid references auth.users(id)
);

create unique index if not exists roteiros_projeto_unique on public.roteiros(projeto_id);
create index if not exists roteiros_projeto_idx on public.roteiros(projeto_id);

alter table public.roteiros enable row level security;

drop policy if exists "roteiros select org" on public.roteiros;
create policy "roteiros select org" on public.roteiros for select using (
  projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))
);
drop policy if exists "roteiros write org" on public.roteiros;
create policy "roteiros write org" on public.roteiros for all using (
  projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))
) with check (
  projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))
);

-- ---------- 2) roteiro_cenas ----------

create table if not exists public.roteiro_cenas (
  id uuid primary key default gen_random_uuid(),
  roteiro_id uuid not null references public.roteiros(id) on delete cascade,
  ordem int not null,                                 -- ordem da cena no roteiro
  numero_cena text,                                   -- 1, 1A, 2 etc.
  cabecalho text,                                     -- INT. SALA - DIA
  ambiente text,                                      -- INT / EXT / INT/EXT
  local text,                                         -- nome da locacao
  horario text,                                       -- DIA / NOITE / AMANHECER / etc.
  sinopse text,                                       -- resumo curto da cena
  personagens jsonb default '[]'::jsonb,              -- ["MARIA", "JOÃO"]
  arte jsonb default '[]'::jsonb,                     -- ["mesa antiga", "telefone preto", ...]
  figurino jsonb default '[]'::jsonb,                 -- [{"personagem":"MARIA","item":"vestido vermelho"}]
  efeitos jsonb default '[]'::jsonb,                  -- ["chuva artificial", "fumaça"]
  som jsonb default '[]'::jsonb,                      -- ["música diegetica rádio"]
  locacao_sugerida text,                              -- sugestão textual de tipo de locacao
  duracao_estimada_min numeric,                       -- estimativa
  pagina_inicio int,
  pagina_fim int,
  observacoes text,
  criado_em timestamptz default now()
);

create index if not exists roteiro_cenas_roteiro_idx on public.roteiro_cenas(roteiro_id, ordem);

alter table public.roteiro_cenas enable row level security;

drop policy if exists "roteiro_cenas select org" on public.roteiro_cenas;
create policy "roteiro_cenas select org" on public.roteiro_cenas for select using (
  roteiro_id in (
    select r.id from public.roteiros r
    join public.projetos p on p.id = r.projeto_id
    where p.org_id in (select public.user_orgs())
  )
);
drop policy if exists "roteiro_cenas write org" on public.roteiro_cenas;
create policy "roteiro_cenas write org" on public.roteiro_cenas for all using (
  roteiro_id in (
    select r.id from public.roteiros r
    join public.projetos p on p.id = r.projeto_id
    where p.org_id in (select public.user_orgs())
  )
) with check (
  roteiro_id in (
    select r.id from public.roteiros r
    join public.projetos p on p.id = r.projeto_id
    where p.org_id in (select public.user_orgs())
  )
);

-- ---------- 3) roteiro_planos_sugeridos ----------

create table if not exists public.roteiro_planos_sugeridos (
  id uuid primary key default gen_random_uuid(),
  cena_id uuid not null references public.roteiro_cenas(id) on delete cascade,
  plano_numero int not null default 1,
  tipo_plano text,                                    -- PG, PM, PP, close, detalhe...
  movimento text,                                     -- estatico, travelling, dolly...
  lente text,                                         -- 35mm, 50mm, grande angular...
  equipamento text,                                   -- steadicam, grua, drone...
  descricao text,                                     -- descrição do plano
  duracao_estimada_seg int,
  criado_em timestamptz default now()
);

create index if not exists roteiro_planos_cena_idx on public.roteiro_planos_sugeridos(cena_id, plano_numero);

alter table public.roteiro_planos_sugeridos enable row level security;

drop policy if exists "roteiro_planos select org" on public.roteiro_planos_sugeridos;
create policy "roteiro_planos select org" on public.roteiro_planos_sugeridos for select using (
  cena_id in (
    select c.id from public.roteiro_cenas c
    join public.roteiros r on r.id = c.roteiro_id
    join public.projetos p on p.id = r.projeto_id
    where p.org_id in (select public.user_orgs())
  )
);
drop policy if exists "roteiro_planos write org" on public.roteiro_planos_sugeridos;
create policy "roteiro_planos write org" on public.roteiro_planos_sugeridos for all using (
  cena_id in (
    select c.id from public.roteiro_cenas c
    join public.roteiros r on r.id = c.roteiro_id
    join public.projetos p on p.id = r.projeto_id
    where p.org_id in (select public.user_orgs())
  )
) with check (
  cena_id in (
    select c.id from public.roteiro_cenas c
    join public.roteiros r on r.id = c.roteiro_id
    join public.projetos p on p.id = r.projeto_id
    where p.org_id in (select public.user_orgs())
  )
);

-- ============================================================
-- Verificação:
--   select count(*) from information_schema.tables
--     where table_name in ('roteiros','roteiro_cenas','roteiro_planos_sugeridos');
-- ============================================================
