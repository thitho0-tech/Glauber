-- ============================================================
-- CINEFLOW — Migration 0003: Trilha A do Roadmap V3 (consolidada)
-- Tudo em uma migration para o Thiago aplicar de uma vez.
-- ============================================================
-- Ordem dos blocos:
--   A1 — rename departamento "camera" → "fotografia" em pessoas
--   A3 — trigger que valida data de dia_filmagem dentro do período do projeto
--   A4 — colunas tipo / periodo / data_fim em dias_filmagem (cronograma com fases)
--   A5 — colunas maps_url / waze_url em locacoes
--   A7 — tabela funcoes_av + seed do organograma (48 funções, 9 deptos, 4 níveis)
--   A8 — RPC validar_despesa() expandida com regras SIC + coluna forma_pagamento
--   A9 — coluna teto_global em editais + RPC check_orcamento_dentro_teto
-- ============================================================

-- ---------- A1 — Rename "camera" → "fotografia" em pessoas ----------
-- Precisa dropar a check constraint antes do update, recriar depois.

alter table public.pessoas drop constraint if exists pessoas_departamento_check;

update public.pessoas set departamento = 'fotografia' where departamento = 'camera';

alter table public.pessoas add constraint pessoas_departamento_check
  check (departamento in (
    'producao','direcao','fotografia','arte','som','figurino',
    'maquiagem','pos','elenco','logistica','desenvolvimento','outros'
  ));

-- ---------- A4 — Cronograma com fases ----------
-- Adiciona campos sem renomear a tabela (preserva FKs existentes).

alter table public.dias_filmagem
  add column if not exists tipo text
    check (tipo in ('pre_producao','producao','dia_filmagem','pos_producao'))
    default 'dia_filmagem',
  add column if not exists periodo text
    check (periodo in ('dia','semana','mes'))
    default 'dia',
  add column if not exists data_fim date;

-- Remove o unique antigo (impedia pré-prod e filmagem na mesma data)
alter table public.dias_filmagem drop constraint if exists dias_filmagem_projeto_id_data_key;

-- ---------- A3 — Trigger: data de cronograma dentro do período do projeto ----------

create or replace function public.trg_check_planejamento_no_periodo()
returns trigger language plpgsql as $$
declare
  v_inicio date;
  v_fim date;
begin
  select periodo_inicio, periodo_fim into v_inicio, v_fim
    from public.projetos where id = new.projeto_id;

  if v_inicio is not null and new.data < v_inicio then
    raise exception 'Data % está antes do início do projeto (%)', new.data, v_inicio;
  end if;
  if v_fim is not null and new.data > v_fim then
    raise exception 'Data % está depois do fim do projeto (%)', new.data, v_fim;
  end if;
  if new.data_fim is not null and v_fim is not null and new.data_fim > v_fim then
    raise exception 'Data final % está depois do fim do projeto (%)', new.data_fim, v_fim;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_planejamento_periodo on public.dias_filmagem;
create trigger trg_planejamento_periodo
  before insert or update on public.dias_filmagem
  for each row execute procedure public.trg_check_planejamento_no_periodo();

-- ---------- A5 — Locações com links Google Maps / Waze ----------
-- (locacoes JÁ tem lat, lng — só faltam URLs)

alter table public.locacoes
  add column if not exists maps_url text,
  add column if not exists waze_url text;

-- ---------- A7 — Tabela funcoes_av (organograma AV) ----------

create table if not exists public.funcoes_av (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nome text not null,
  departamento text not null check (departamento in (
    'desenvolvimento','direcao','producao','fotografia','arte',
    'som','elenco','logistica','pos_producao'
  )),
  nivel int not null check (nivel between 1 and 4),
  descricao text
);

alter table public.funcoes_av enable row level security;
drop policy if exists "funcoes_av select all" on public.funcoes_av;
create policy "funcoes_av select all" on public.funcoes_av for select using (true);

-- Seed do organograma (49 funções)
insert into public.funcoes_av (codigo, nome, departamento, nivel) values
-- DESENVOLVIMENTO
('roteirista',                 'Roteirista',                   'desenvolvimento', 2),
('roteirista_adaptador',       'Roteirista Adaptador',         'desenvolvimento', 2),
-- DIREÇÃO
('diretor',                    'Diretor(a)',                   'direcao',          1),
('assistente_direcao',         'Assistente de Direção',        'direcao',          3),
('segundo_assistente_direcao', '2º Assistente de Direção',     'direcao',          3),
('script_continuista',         'Script / Continuísta',         'direcao',          3),
-- PRODUÇÃO
('produtor_geral',             'Produtor(a) Geral',            'producao',         1),
('produtor_executivo',         'Produtor(a) Executivo(a)',     'producao',         2),
('diretor_producao',           'Diretor(a) de Produção',       'producao',         2),
('coordenador_producao',       'Coordenador(a) de Produção',   'producao',         3),
('assistente_producao',        'Assistente de Produção',       'producao',         4),
('produtor_elenco',            'Produtor(a) de Elenco',        'producao',         3),
('preparador_elenco',          'Preparador(a) de Elenco',      'producao',         3),
('produtor_locacoes',          'Produtor(a) de Locações',      'producao',         3),
('motorista_producao',         'Motorista de Produção',        'producao',         4),
-- FOTOGRAFIA
('diretor_fotografia',         'Diretor(a) de Fotografia',     'fotografia',       2),
('camera_principal',           'Câmera Principal',             'fotografia',       4),
('primeiro_asst_camera',       '1º Assistente de Câmera',      'fotografia',       4),
('segundo_asst_camera',        '2º Assistente de Câmera',      'fotografia',       4),
('gaffer',                     'Iluminador Chefe / Gaffer',    'fotografia',       3),
('iluminador',                 'Iluminador(a)',                'fotografia',       4),
('eletricista',                'Eletricista',                  'fotografia',       4),
('op_grua_steadicam',          'Operador(a) de Grua/Steadicam','fotografia',       4),
('op_drone',                   'Operador(a) de Drone',         'fotografia',       4),
-- ARTE
('diretor_arte',               'Diretor(a) de Arte',           'arte',             2),
('cenografo',                  'Cenógrafo(a)',                 'arte',             3),
('decorador',                  'Decorador(a)',                 'arte',             3),
('figurinista',                'Figurinista',                  'arte',             3),
('maquiador_chefe',            'Maquiador(a) Chefe',           'arte',             3),
('maquiador',                  'Maquiador(a)',                 'arte',             4),
('cabeleireiro',               'Cabeleireiro(a)',              'arte',             4),
('supervisor_efeitos',         'Supervisor(a) Efeitos Especiais','arte',           3),
-- SOM
('diretor_som',                'Diretor(a) de Som',            'som',              2),
('op_som',                     'Operador(a) de Som',           'som',              4),
('boom_operator',              'Boom Operator',                'som',              4),
('tecnico_som',                'Técnico(a) de Som',            'som',              4),
-- ELENCO
('diretor_elenco',             'Diretor(a) de Elenco',         'elenco',           3),
('elenco_principal',           'Elenco Principal',             'elenco',           4),
('elenco_coadjuvante',         'Elenco Coadjuvante',           'elenco',           4),
('figurante',                  'Figurante / Extra',            'elenco',           4),
-- LOGÍSTICA
('gerente_locacao',            'Gerente Locação/Segurança',    'logistica',        3),
('assistente_locacao',         'Assistente de Locação',        'logistica',        4),
('seguranca',                  'Segurança / Vigilância',       'logistica',        4),
-- PÓS-PRODUÇÃO
('editor',                     'Editor(a) / Montador(a)',      'pos_producao',     3),
('colorista',                  'Colorista',                    'pos_producao',     3),
('compositor_trilha',          'Compositor(a) de Trilha Sonora','pos_producao',    3),
('tecnico_mixagem',            'Técnico(a) de Som / Mixagem',  'pos_producao',     3),
('supervisor_vfx',             'Supervisor(a) de Efeitos Visuais','pos_producao',  3),
('motion_graphics',            'Tipógrafo(a) / Motion Graphics','pos_producao',    4)
on conflict (codigo) do nothing;

-- ---------- A8 — Validações SIC ativas ----------
-- Adiciona coluna forma_pagamento em despesas para bloquear cartão de crédito.

alter table public.despesas
  add column if not exists forma_pagamento text
    check (forma_pagamento in ('pix','transferencia','dinheiro','cartao_debito','cartao_credito','outro'))
    default 'transferencia';

-- Adiciona coluna data_emissao_nf para checar antecipação.
alter table public.despesas
  add column if not exists data_emissao_nf date;

create or replace function public.validar_despesa(p_despesa_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_despesa record;
  v_projeto record;
  v_edital record;
  v_rubrica record;
  v_total_rubrica numeric;
  v_total_fornecedor numeric;
  v_perc numeric;
  v_perc_forn numeric;
  v_is_sic boolean;
  v_desc_lower text;
begin
  -- Limpa validações anteriores
  delete from public.validacoes_edital where despesa_id = p_despesa_id;

  select d.*, lo.rubrica_codigo into v_despesa
    from public.despesas d
    left join public.linhas_orcamento lo on lo.id = d.linha_orcamento_id
    where d.id = p_despesa_id;

  select * into v_projeto from public.projetos where id = v_despesa.projeto_id;
  select * into v_edital from public.editais where id = v_projeto.edital_id;

  v_is_sic := v_edital.nome ilike 'SIC Recife%';
  v_desc_lower := lower(coalesce(v_despesa.descricao, ''));

  -- 1) Data dentro do período
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

  -- 2) CNPJ emitente
  if v_despesa.cnpj_emitente is null or v_despesa.cnpj_emitente = '' then
    insert into public.validacoes_edital (despesa_id, status, mensagem)
      values (p_despesa_id, 'warn', 'CNPJ do emitente não preenchido — obrigatório na maioria dos editais');
  end if;

  -- 3) SIC: cartão de crédito vedado
  if v_is_sic and v_despesa.forma_pagamento = 'cartao_credito' then
    insert into public.validacoes_edital (despesa_id, status, mensagem)
      values (p_despesa_id, 'fail', 'SIC Recife veda pagamento via cartão de crédito — usar PIX ou transferência nominal');
  end if;

  -- 4) SIC: pagamento antecipado à NF
  if v_is_sic and v_despesa.data_emissao_nf is not null
     and v_despesa.data < v_despesa.data_emissao_nf then
    insert into public.validacoes_edital (despesa_id, status, mensagem)
      values (p_despesa_id, 'fail', 'Pagamento antecipado à emissão de NF é vedado no SIC Recife');
  end if;

  -- 5) SIC: palavras-chave de álcool/cigarro
  if v_is_sic and (
    v_desc_lower ~ '\m(cerveja|vinho|cacha[çc]a|whisky|vodka|gin|rum|champagne|alcool|alco[oó]lic|cigarro|tabaco|fumo)\M'
  ) then
    insert into public.validacoes_edital (despesa_id, status, mensagem)
      values (p_despesa_id, 'warn', 'Descrição menciona bebida alcoólica ou cigarro — vedado pelo SIC (exceto objeto de cena).');
  end if;

  -- 6) Percentual por rubrica vs perc_max
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

  -- 7) SIC: fornecedor único > 30% do projeto (por CNPJ)
  if v_is_sic and v_despesa.cnpj_emitente is not null and v_projeto.orcamento_total > 0 then
    select coalesce(sum(d.valor), 0) into v_total_fornecedor
      from public.despesas d
      where d.projeto_id = v_despesa.projeto_id
        and d.cnpj_emitente = v_despesa.cnpj_emitente;

    v_perc_forn := v_total_fornecedor / v_projeto.orcamento_total;

    if v_perc_forn > 0.30 then
      insert into public.validacoes_edital (despesa_id, status, mensagem)
        values (p_despesa_id, 'fail',
          'Fornecedor (CNPJ ' || v_despesa.cnpj_emitente || ') concentra ' ||
          to_char(v_perc_forn * 100, 'FM999.00') || '% do projeto — SIC limita a 30% por CNPJ');
    end if;
  end if;

  -- 8) Tudo OK?
  if not exists (select 1 from public.validacoes_edital where despesa_id = p_despesa_id) then
    insert into public.validacoes_edital (despesa_id, status, mensagem)
      values (p_despesa_id, 'ok', 'Despesa em conformidade');
  end if;
end;
$$;

-- ---------- A9 — Teto global por edital + RPC de checagem ----------

alter table public.editais
  add column if not exists teto_global numeric,
  add column if not exists teto_observacao text;

-- Atualiza editais conhecidos (Thiago pode refinar depois)
-- Funcultura PE e Lei Paulo Gustavo: tetos variam por linha, deixar null
-- SIC Recife FIC: pode ter teto por categoria; deixar null até confirmação
-- (esses valores são placeholders editáveis pelo dashboard do Supabase)

create or replace function public.check_orcamento_dentro_teto(p_projeto_id uuid)
returns table(status text, mensagem text, teto numeric, atual numeric)
language plpgsql stable as $$
declare
  v_projeto record;
  v_edital record;
begin
  select * into v_projeto from public.projetos where id = p_projeto_id;
  if v_projeto.edital_id is null then
    return query select 'ok'::text, 'Projeto sem edital vinculado'::text, null::numeric, v_projeto.orcamento_total;
    return;
  end if;
  select * into v_edital from public.editais where id = v_projeto.edital_id;
  if v_edital.teto_global is null then
    return query select 'ok'::text,
      'Edital ' || v_edital.nome || ' sem teto global cadastrado'::text,
      null::numeric, v_projeto.orcamento_total;
    return;
  end if;
  if v_projeto.orcamento_total > v_edital.teto_global then
    return query select 'warn'::text,
      'Orçamento ultrapassa teto do edital (' ||
      to_char(v_edital.teto_global, 'FM999G999G999D00') || ')'::text,
      v_edital.teto_global, v_projeto.orcamento_total;
  else
    return query select 'ok'::text,
      'Orçamento dentro do teto'::text,
      v_edital.teto_global, v_projeto.orcamento_total;
  end if;
end;
$$;

-- ============================================================
-- FIM. Verificação rápida:
--   select count(*) from public.funcoes_av;  -- deve retornar 49
--   select * from public.check_orcamento_dentro_teto('<um-projeto-id>');
-- ============================================================
