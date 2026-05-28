-- Migration: 0027_regimes_contratacao.sql
-- Sprint 1B — Tabela de regimes de contratação (RPA, CLT, MEI, PJ, etc.)

create table if not exists public.regimes_contratacao (
  id            uuid primary key default gen_random_uuid(),
  pessoa_id     uuid not null references public.pessoas(id) on delete cascade,
  projeto_id    uuid not null references public.projetos(id) on delete cascade,
  tipo          text not null check (tipo in ('rpa','clt','mei','pj','diarista','voluntario')),
  valor_bruto   numeric default 0,
  valor_liquido numeric default 0,
  dias_contrato int default 1,
  -- RPA: {inss_pct, ir_pct, observacao}
  dados_rpa     jsonb default '{}'::jsonb,
  ativo         boolean default true,
  criado_em     timestamptz default now(),
  unique(pessoa_id, projeto_id)
);

create index if not exists idx_regimes_projeto on regimes_contratacao(projeto_id);
create index if not exists idx_regimes_pessoa  on regimes_contratacao(pessoa_id);

alter table regimes_contratacao enable row level security;

create policy "regimes_projeto" on regimes_contratacao for all
  using (public.papel_no_projeto(projeto_id) is not null);

-- Função helper: calcula líquido RPA automaticamente
-- INSS 20%, IR simplificado (faixa 1: até 2259.20 isento, faixa 2: até 2826.65 → 7.5%, faixa 3: até 3751.05 → 15%)
create or replace function fn_calcular_liquido_rpa(p_bruto numeric, p_inss_pct numeric default 0.20)
returns numeric language plpgsql immutable as $$
declare
  v_inss      numeric;
  v_base_ir   numeric;
  v_ir        numeric;
  v_liquido   numeric;
begin
  v_inss    := round(p_bruto * p_inss_pct, 2);
  v_base_ir := p_bruto - v_inss;
  if    v_base_ir <= 2259.20 then v_ir := 0;
  elsif v_base_ir <= 2826.65 then v_ir := round(v_base_ir * 0.075 - 169.44, 2);
  elsif v_base_ir <= 3751.05 then v_ir := round(v_base_ir * 0.15  - 381.44, 2);
  elsif v_base_ir <= 4664.68 then v_ir := round(v_base_ir * 0.225 - 662.77, 2);
  else                             v_ir := round(v_base_ir * 0.275 - 896.00, 2);
  end if;
  v_ir      := greatest(v_ir, 0);
  v_liquido := p_bruto - v_inss - v_ir;
  return greatest(v_liquido, 0);
end;
$$;
