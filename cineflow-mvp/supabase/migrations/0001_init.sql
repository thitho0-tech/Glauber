-- ============================================================
-- CINEFLOW — Schema inicial (MVP)
-- Postgres 15 (Supabase)
-- ============================================================

-- ---------- Extensões ----------
create extension if not exists "pgcrypto";

-- ---------- Tabelas base ----------

create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  plano text default 'free',
  criado_em timestamptz default now()
);

create table public.editais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  orgao text not null,
  vigencia text,
  prazo_prestacao_meses int,
  observacoes text,
  criado_em timestamptz default now()
);

create table public.rubricas_edital (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid not null references public.editais(id) on delete cascade,
  codigo text not null,
  nome text not null,
  perc_max numeric,
  observacoes text
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null check (papel in ('owner','admin_financeiro','diretor_producao','diretor','ad','chefe_departamento','equipe')),
  departamento text,
  ativo boolean default true,
  criado_em timestamptz default now(),
  unique(org_id, user_id)
);

create table public.projetos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('curta','longa','serie','publicidade','clipe','documentario','outro')),
  status text default 'pre_producao' check (status in ('pre_producao','producao','pos_producao','concluido','cancelado')),
  edital_id uuid references public.editais(id),
  periodo_inicio date,
  periodo_fim date,
  orcamento_total numeric default 0,
  criado_em timestamptz default now()
);

create table public.pessoas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  nome text not null,
  funcao text,
  departamento text check (departamento in ('producao','direcao','camera','arte','som','figurino','maquiagem','pos','elenco','outros')),
  telefone text,
  email text,
  cpf text,
  banco_json jsonb,
  valor_diaria numeric default 0,
  foto_url text,
  criado_em timestamptz default now()
);

create table public.locacoes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  nome text not null,
  endereco text,
  lat numeric,
  lng numeric,
  contato_nome text,
  contato_telefone text,
  valor_diaria numeric,
  restricoes text,
  fotos_urls text[],
  criado_em timestamptz default now()
);

create table public.dias_filmagem (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  data date not null,
  chamada_geral time,
  locacao_id uuid references public.locacoes(id),
  status text default 'planejado' check (status in ('planejado','confirmado','em_filmagem','concluido','adiado')),
  observacoes text,
  criado_em timestamptz default now(),
  unique(projeto_id, data)
);

create table public.escalas (
  id uuid primary key default gen_random_uuid(),
  dia_id uuid not null references public.dias_filmagem(id) on delete cascade,
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  papel text,
  hora_chamada time,
  hora_almoco time,
  transporte text,
  observacoes text,
  unique(dia_id, pessoa_id)
);

create table public.ordens_do_dia (
  id uuid primary key default gen_random_uuid(),
  dia_id uuid not null references public.dias_filmagem(id) on delete cascade,
  versao int not null default 1,
  dados_json jsonb not null default '{}'::jsonb,
  token_publico text unique default encode(gen_random_bytes(16), 'hex'),
  publicada_em timestamptz,
  publicada_por uuid references auth.users(id),
  criado_em timestamptz default now()
);

create table public.entregas_od (
  id uuid primary key default gen_random_uuid(),
  ordem_id uuid not null references public.ordens_do_dia(id) on delete cascade,
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  canal text default 'app' check (canal in ('app','email','whatsapp','link')),
  enviada_em timestamptz default now(),
  lida_em timestamptz,
  confirmada_em timestamptz
);

create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  versao int default 1,
  total numeric default 0,
  aprovado_em timestamptz,
  criado_em timestamptz default now()
);

create table public.linhas_orcamento (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  rubrica_codigo text,
  descricao text not null,
  valor_previsto numeric default 0,
  valor_realizado numeric default 0
);

create table public.despesas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  linha_orcamento_id uuid references public.linhas_orcamento(id),
  descricao text not null,
  valor numeric not null,
  data date not null,
  departamento text,
  comprovante_url text,
  cnpj_emitente text,
  numero_nf text,
  status text default 'pendente' check (status in ('pendente','aprovada','rejeitada')),
  criado_por uuid references auth.users(id),
  criado_em timestamptz default now()
);

create table public.validacoes_edital (
  id uuid primary key default gen_random_uuid(),
  despesa_id uuid not null references public.despesas(id) on delete cascade,
  status text not null check (status in ('ok','warn','fail')),
  mensagem text,
  gerada_em timestamptz default now()
);

-- ---------- Índices ----------
create index on public.memberships(user_id);
create index on public.memberships(org_id);
create index on public.projetos(org_id);
create index on public.pessoas(org_id);
create index on public.locacoes(org_id);
create index on public.dias_filmagem(projeto_id);
create index on public.dias_filmagem(data);
create index on public.escalas(dia_id);
create index on public.ordens_do_dia(dia_id);
create index on public.despesas(projeto_id);
create index on public.linhas_orcamento(orcamento_id);
create index on public.validacoes_edital(despesa_id);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================

-- Helper: orgs que o usuário pertence
create or replace function public.user_orgs()
returns setof uuid
language sql security definer set search_path = public, pg_temp
as $$
  select org_id from public.memberships
  where user_id = auth.uid() and ativo = true
$$;

-- ---------- orgs ----------
alter table public.orgs enable row level security;
create policy "orgs select" on public.orgs for select
  using (id in (select public.user_orgs()));
create policy "orgs insert" on public.orgs for insert
  with check (true);
create policy "orgs update owner" on public.orgs for update
  using (id in (select org_id from public.memberships where user_id = auth.uid() and papel = 'owner' and ativo));

-- ---------- memberships ----------
alter table public.memberships enable row level security;
create policy "memberships select org" on public.memberships for select
  using (org_id in (select public.user_orgs()) or user_id = auth.uid());
create policy "memberships insert self" on public.memberships for insert
  with check (user_id = auth.uid() or org_id in (select org_id from public.memberships where user_id = auth.uid() and papel in ('owner','admin_financeiro') and ativo));
create policy "memberships update owner" on public.memberships for update
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and papel = 'owner' and ativo));
create policy "memberships delete owner" on public.memberships for delete
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and papel = 'owner' and ativo));

-- ---------- editais (públicos para leitura) ----------
alter table public.editais enable row level security;
create policy "editais select all" on public.editais for select using (true);

alter table public.rubricas_edital enable row level security;
create policy "rubricas select all" on public.rubricas_edital for select using (true);

-- ---------- projetos ----------
alter table public.projetos enable row level security;
create policy "projetos select" on public.projetos for select
  using (org_id in (select public.user_orgs()));
create policy "projetos insert" on public.projetos for insert
  with check (org_id in (select public.user_orgs()));
create policy "projetos update" on public.projetos for update
  using (org_id in (select public.user_orgs()));
create policy "projetos delete" on public.projetos for delete
  using (org_id in (select public.user_orgs()));

-- ---------- pessoas ----------
alter table public.pessoas enable row level security;
create policy "pessoas select" on public.pessoas for select
  using (org_id in (select public.user_orgs()));
create policy "pessoas all" on public.pessoas for all
  using (org_id in (select public.user_orgs()))
  with check (org_id in (select public.user_orgs()));

-- ---------- locacoes ----------
alter table public.locacoes enable row level security;
create policy "locacoes all" on public.locacoes for all
  using (org_id in (select public.user_orgs()))
  with check (org_id in (select public.user_orgs()));

-- ---------- dias_filmagem ----------
alter table public.dias_filmagem enable row level security;
create policy "dias all" on public.dias_filmagem for all
  using (projeto_id in (select id from public.projetos where org_id in (select public.user_orgs())))
  with check (projeto_id in (select id from public.projetos where org_id in (select public.user_orgs())));

-- ---------- escalas ----------
alter table public.escalas enable row level security;
create policy "escalas all" on public.escalas for all
  using (dia_id in (select id from public.dias_filmagem where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))))
  with check (dia_id in (select id from public.dias_filmagem where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))));

-- ---------- ordens_do_dia (público pelo token) ----------
alter table public.ordens_do_dia enable row level security;
create policy "od select org" on public.ordens_do_dia for select
  using (dia_id in (select id from public.dias_filmagem where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))));
create policy "od insert org" on public.ordens_do_dia for insert
  with check (dia_id in (select id from public.dias_filmagem where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))));
create policy "od update org" on public.ordens_do_dia for update
  using (dia_id in (select id from public.dias_filmagem where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))));
create policy "od delete org" on public.ordens_do_dia for delete
  using (dia_id in (select id from public.dias_filmagem where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))));

-- View pública por token (sem RLS, expõe só dados do JSON)
create or replace view public.ordens_do_dia_publico as
  select id, token_publico, versao, dados_json, publicada_em
  from public.ordens_do_dia
  where token_publico is not null and publicada_em is not null;
grant select on public.ordens_do_dia_publico to anon, authenticated;

-- ---------- entregas_od ----------
alter table public.entregas_od enable row level security;
create policy "entregas all" on public.entregas_od for all
  using (ordem_id in (select id from public.ordens_do_dia where dia_id in (select id from public.dias_filmagem where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs())))))
  with check (ordem_id in (select id from public.ordens_do_dia where dia_id in (select id from public.dias_filmagem where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs())))));

-- ---------- orcamentos + linhas ----------
alter table public.orcamentos enable row level security;
create policy "orcamentos all" on public.orcamentos for all
  using (projeto_id in (select id from public.projetos where org_id in (select public.user_orgs())))
  with check (projeto_id in (select id from public.projetos where org_id in (select public.user_orgs())));

alter table public.linhas_orcamento enable row level security;
create policy "linhas all" on public.linhas_orcamento for all
  using (orcamento_id in (select id from public.orcamentos where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))))
  with check (orcamento_id in (select id from public.orcamentos where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))));

-- ---------- despesas ----------
alter table public.despesas enable row level security;
create policy "despesas all" on public.despesas for all
  using (projeto_id in (select id from public.projetos where org_id in (select public.user_orgs())))
  with check (projeto_id in (select id from public.projetos where org_id in (select public.user_orgs())));

-- ---------- validacoes_edital ----------
alter table public.validacoes_edital enable row level security;
create policy "validacoes all" on public.validacoes_edital for all
  using (despesa_id in (select id from public.despesas where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))))
  with check (despesa_id in (select id from public.despesas where projeto_id in (select id from public.projetos where org_id in (select public.user_orgs()))));

-- ============================================================
-- Trigger: criar org + membership automático no signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
  v_org_nome text;
begin
  v_org_nome := coalesce(new.raw_user_meta_data->>'org_nome', 'Minha Produtora');
  insert into public.orgs (nome) values (v_org_nome) returning id into v_org_id;
  insert into public.memberships (org_id, user_id, papel) values (v_org_id, new.id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- RPC: validar despesa contra edital
-- ============================================================
create or replace function public.validar_despesa(p_despesa_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_despesa record;
  v_projeto record;
  v_rubrica record;
  v_total_rubrica numeric;
  v_perc numeric;
  v_status text;
  v_msg text;
begin
  -- Limpa validações anteriores
  delete from public.validacoes_edital where despesa_id = p_despesa_id;

  select d.*, lo.rubrica_codigo into v_despesa
    from public.despesas d
    left join public.linhas_orcamento lo on lo.id = d.linha_orcamento_id
    where d.id = p_despesa_id;

  select * into v_projeto from public.projetos where id = v_despesa.projeto_id;

  -- 1) Data no período?
  if v_projeto.periodo_inicio is not null and v_despesa.data < v_projeto.periodo_inicio then
    insert into public.validacoes_edital (despesa_id, status, mensagem)
      values (p_despesa_id, 'fail', 'Despesa anterior ao período de execução do projeto');
    return;
  end if;
  if v_projeto.periodo_fim is not null and v_despesa.data > v_projeto.periodo_fim then
    insert into public.validacoes_edital (despesa_id, status, mensagem)
      values (p_despesa_id, 'fail', 'Despesa posterior ao período de execução do projeto');
    return;
  end if;

  -- 2) CNPJ emitente preenchido?
  if v_despesa.cnpj_emitente is null or v_despesa.cnpj_emitente = '' then
    insert into public.validacoes_edital (despesa_id, status, mensagem)
      values (p_despesa_id, 'warn', 'CNPJ do emitente não preenchido — obrigatório na maioria dos editais');
  end if;

  -- 3) Rubrica + percentual máximo
  if v_projeto.edital_id is not null and v_despesa.rubrica_codigo is not null then
    select * into v_rubrica from public.rubricas_edital
      where edital_id = v_projeto.edital_id and codigo = v_despesa.rubrica_codigo limit 1;

    if found and v_rubrica.perc_max is not null and v_projeto.orcamento_total > 0 then
      select coalesce(sum(d.valor), 0) into v_total_rubrica
        from public.despesas d
        left join public.linhas_orcamento lo on lo.id = d.linha_orcamento_id
        where d.projeto_id = v_despesa.projeto_id and lo.rubrica_codigo = v_despesa.rubrica_codigo;

      v_perc := v_total_rubrica / v_projeto.orcamento_total;

      if v_perc > v_rubrica.perc_max then
        insert into public.validacoes_edital (despesa_id, status, mensagem)
          values (p_despesa_id, 'warn',
            'Rubrica ' || v_rubrica.codigo || ' já em ' ||
            to_char(v_perc * 100, 'FM999.00') || '% — limite do edital é ' ||
            to_char(v_rubrica.perc_max * 100, 'FM999') || '%');
      end if;
    end if;
  end if;

  -- 4) Tudo OK?
  if not exists (select 1 from public.validacoes_edital where despesa_id = p_despesa_id) then
    insert into public.validacoes_edital (despesa_id, status, mensagem)
      values (p_despesa_id, 'ok', 'Despesa em conformidade');
  end if;
end;
$$;

-- Trigger: validar automaticamente ao inserir/atualizar despesa
create or replace function public.trg_validar_despesa()
returns trigger language plpgsql as $$
begin
  perform public.validar_despesa(new.id);
  return new;
end;
$$;

drop trigger if exists trg_validar on public.despesas;
create trigger trg_validar
  after insert or update on public.despesas
  for each row execute procedure public.trg_validar_despesa();

-- ============================================================
-- SEED — Editais brasileiros
-- ============================================================

insert into public.editais (id, nome, orgao, vigencia, prazo_prestacao_meses, observacoes) values
('11111111-1111-1111-1111-111111111111', 'Funcultura Audiovisual 2025-2026', 'Secult-PE / Fundarpe', '2025-2026', 24,
 'Edital estadual de fomento ao audiovisual de Pernambuco. Manual de Prestação de Contas do Funcultura.'),
('22222222-2222-2222-2222-222222222222', 'Lei Paulo Gustavo — Audiovisual', 'MinC / Município ou Estado', '2024-2026', 24,
 'Repasse de recursos federais via municípios e estados para o setor audiovisual.');

insert into public.rubricas_edital (edital_id, codigo, nome, perc_max, observacoes) values
('11111111-1111-1111-1111-111111111111', 'EQUIPE',  'Cachês de equipe técnica',        0.55, 'Equipe técnica em todas as fases'),
('11111111-1111-1111-1111-111111111111', 'ELENCO',  'Cachês de elenco',                0.25, 'Elenco principal limitado a 25% do total'),
('11111111-1111-1111-1111-111111111111', 'EQUIP',   'Locação de equipamentos',         0.20, 'Câmera, lente, iluminação, som'),
('11111111-1111-1111-1111-111111111111', 'LOCACAO', 'Locações de cenário',             0.10, ''),
('11111111-1111-1111-1111-111111111111', 'ARTE',    'Direção de arte e figurino',      0.15, ''),
('11111111-1111-1111-1111-111111111111', 'POS',     'Pós-produção (montagem/som/cor)', 0.25, ''),
('11111111-1111-1111-1111-111111111111', 'ADM',     'Administração e contabilidade',   0.05, ''),
('11111111-1111-1111-1111-111111111111', 'TRANSP',  'Transporte e logística',          0.10, ''),
('11111111-1111-1111-1111-111111111111', 'ALIM',    'Alimentação de equipe',           0.08, ''),
('22222222-2222-2222-2222-222222222222', 'EQUIPE',  'Equipe técnica',                  0.50, ''),
('22222222-2222-2222-2222-222222222222', 'ELENCO',  'Elenco',                          0.20, ''),
('22222222-2222-2222-2222-222222222222', 'EQUIP',   'Equipamentos',                    0.25, ''),
('22222222-2222-2222-2222-222222222222', 'POS',     'Pós-produção',                    0.25, ''),
('22222222-2222-2222-2222-222222222222', 'ADM',     'Administração',                   0.05, '');
