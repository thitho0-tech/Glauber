-- ============================================================
-- CINEFLOW — C2: Ordem do Dia como entidade independente
-- Trilha 2 do Roadmap V2
-- Permite criar OD sem estar vinculada a um dia de filmagem
-- ============================================================

-- ---------- Altera tabela ordens_do_dia ----------

-- 1. Adiciona coluna projeto_id (essencial para RLS e contexto)
alter table public.ordens_do_dia
add column projeto_id uuid references public.projetos(id) on delete cascade;

-- 2. Torna dia_id nullable (OD pode existir sem dia)
alter table public.ordens_do_dia
alter column dia_id drop not null;

-- 3. Adiciona data própria da OD
alter table public.ordens_do_dia
add column data date;

-- 4. Adiciona locação própria (pode ser diferente do dia)
alter table public.ordens_do_dia
add column locacao_id uuid references public.locacoes(id) on delete set null;

-- 5. Tipo de OD (filmagem, ensaio, reunião, scouting, etc.)
alter table public.ordens_do_dia
add column tipo text default 'filmagem' check (tipo in ('filmagem','ensaio','reuniao','scouting','outra'));

-- 6. Departamentos estruturados (câmera, arte, som, elétrica, produção, figurino, etc.)
alter table public.ordens_do_dia
add column departamentos jsonb default '{}'::jsonb;
-- Exemplo de estrutura esperada:
-- {
--   "camera": { "secao": "Câmera", "pessoas": [...], "notas": "..." },
--   "arte": { "secao": "Arte", "pessoas": [...], "notas": "..." },
--   ...
-- }

-- 7. Lista de cenas do dia (cenas que serão filmadas)
alter table public.ordens_do_dia
add column cenas jsonb default '[]'::jsonb;
-- Exemplo:
-- [
--   { "numero": "1", "descricao": "Cena de abertura", "duracao_min": 5 },
--   { "numero": "2A", "descricao": "Diálogo na cozinha", "duracao_min": 3 }
-- ]

-- 8. Chamadas individuais (horário específico por pessoa)
alter table public.orders_do_dia
add column chamadas_individuais jsonb default '{}'::jsonb;
-- Exemplo:
-- {
--   "pessoa_id_uuid": { "horario_chamada": "07:30", "local": "entrada", "observacao": "chegar 15min antes" },
--   ...
-- }

-- ---------- Migração de dados existentes ----------

-- Para cada OD existente vinculada a um dia, herdar data e locacao_id do dia
update public.ordens_do_dia od
set
  projeto_id = df.projeto_id,
  data = df.data,
  locacao_id = df.locacao_id
from public.dias_filmagem df
where od.dia_id = df.id and od.projeto_id is null;

-- ---------- Índices novos ----------
create index on public.ordens_do_dia(projeto_id);
create index on public.ordens_do_dia(data);
create index on public.ordens_do_dia(locacao_id);

-- ---------- Atualiza RLS policies ----------

-- A política RLS precisa ser ajustada para validar via projeto_id também
-- Políticas antigas continuam válidas (via dia_id quando presente)
-- Novas políticas permitem acesso via projeto_id direto

drop policy if exists "od select org" on public.ordens_do_dia;
drop policy if exists "od insert org" on public.ordens_do_dia;
drop policy if exists "od update org" on public.ordens_do_dia;
drop policy if exists "od delete org" on public.ordens_do_dia;

create policy "od select org" on public.ordens_do_dia for select
  using (
    (dia_id in (select id from public.dias_filmagem where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))))
    or
    (projeto_id in (select id from public.projetos where org_id in (select public.user_orgs())))
  );

create policy "od insert org" on public.ordens_do_dia for insert
  with check (
    (dia_id in (select id from public.dias_filmagem where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))))
    or
    (projeto_id in (select id from public.projetos where org_id in (select public.user_orgs())))
  );

create policy "od update org" on public.ordens_do_dia for update
  using (
    (dia_id in (select id from public.dias_filmagem where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))))
    or
    (projeto_id in (select id from public.projetos where org_id in (select public.user_orgs())))
  );

create policy "od delete org" on public.ordens_do_dia for delete
  using (
    (dia_id in (select id from public.dias_filmagem where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))))
    or
    (projeto_id in (select id from public.projetos where org_id in (select public.user_orgs())))
  );

-- ============================================================
-- Próximos passos:
-- 1. Rodar esta migration no Supabase SQL Editor
-- 2. Refatorar CallSheetEditor.tsx para:
--    - Permitir criar OD sem escolher dia
--    - Adicionar seletor "Vincular a dia (opcional)"
--    - Adicionar seções por departamento
--    - Adicionar tabela de cenas
--    - Adicionar campos de chamada individual
-- 3. Atualizar PublicCallSheet.tsx para renderizar departamentos e cenas
-- 4. Deploy: vercel --prod
-- ============================================================
