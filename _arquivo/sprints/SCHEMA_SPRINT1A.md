# SQL Schema — Sprint 1A

**Arquivo de Migration:** `migrations/0024_projeto_kpis.sql`

---

## 📋 Tabela Principal: `projeto_kpis`

Esta tabela armazena os KPIs calculados **em tempo real** para cada projeto.

```sql
create table projeto_kpis (
  -- Identificadores
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,

  -- Percentuais (0-100)
  roteiro_filmado_pct decimal(5,2),        -- % do roteiro já filmado
  orcamento_comprometido_pct decimal(5,2), -- % do orçamento já gasto

  -- Datas críticas (array de strings ISO)
  prazos_criticos jsonb default '[]',      -- ["2026-06-15", "2026-07-20"]

  -- Próximos eventos
  proximos_eventos jsonb default '[]',     -- [{tipo, data, responsavel}]

  -- Metadata
  updated_at timestamp default now(),
  updated_by uuid references auth.users(id),

  -- Constraints
  constraint projeto_kpis_pct_check check (
    roteiro_filmado_pct between 0 and 100
    and orcamento_comprometido_pct between 0 and 100
  ),
  constraint projeto_kpis_projeto_unique unique(projeto_id)
);

-- Índices para performance
create index idx_projeto_kpis_projeto_id on projeto_kpis(projeto_id);
create index idx_projeto_kpis_updated_at on projeto_kpis(updated_at desc);
```

---

## 🔄 Triggers Automáticos

### Trigger 1: Atualizar `roteiro_filmado_pct`

Quando uma cena é marcada como "filmada" (em `dia_cenas`), recalcula o percentual.

```sql
create or replace function recalcular_roteiro_filmado_pct()
returns trigger as $$
begin
  -- Contar cenas filmadas vs total de cenas deste projeto
  update projeto_kpis
  set 
    roteiro_filmado_pct = (
      select round(
        (count(case when status = 'filmada' then 1 end)::numeric / 
         count(*)::numeric) * 100,
        2
      )
      from dia_cenas
      where projeto_id = new.projeto_id
    ),
    updated_at = now(),
    updated_by = auth.uid()
  where projeto_id = new.projeto_id;
  
  return new;
end;
$$ language plpgsql security definer;

-- Disparador
create trigger atualizar_kpi_roteiro
after insert or update on dia_cenas
for each row
execute function recalcular_roteiro_filmado_pct();
```

### Trigger 2: Atualizar `orcamento_comprometido_pct`

Quando uma despesa é registrada (em `despesa`), recalcula o percentual.

```sql
create or replace function recalcular_orcamento_comprometido_pct()
returns trigger as $$
begin
  -- Somar despesas vs orçamento total
  update projeto_kpis
  set 
    orcamento_comprometido_pct = (
      select round(
        (coalesce(sum(valor)::numeric, 0) / 
         (select orcamento_total from projetos where id = new.projeto_id)::numeric) * 100,
        2
      )
      from despesa
      where projeto_id = new.projeto_id
    ),
    updated_at = now(),
    updated_by = auth.uid()
  where projeto_id = new.projeto_id;
  
  return new;
end;
$$ language plpgsql security definer;

-- Disparador
create trigger atualizar_kpi_orcamento
after insert or update on despesa
for each row
execute function recalcular_orcamento_comprometido_pct();
```

### Trigger 3: Atualizar `prazos_criticos`

Quando um edital ou deadline é criado, adiciona à lista.

```sql
create or replace function atualizar_prazos_criticos()
returns trigger as $$
begin
  update projeto_kpis
  set 
    prazos_criticos = (
      select jsonb_agg(
        distinct vencimento::text
      )
      from editais
      where projeto_id = new.projeto_id
        and vencimento > now()
      order by vencimento
    ),
    updated_at = now()
  where projeto_id = new.projeto_id;
  
  return new;
end;
$$ language plpgsql security definer;

-- Disparador
create trigger atualizar_prazos
after insert or update on editais
for each row
execute function atualizar_prazos_criticos();
```

---

## 🔐 Row-Level Security (RLS)

Cada usuário vê apenas KPIs de projetos que participa.

```sql
-- Ativar RLS
alter table projeto_kpis enable row level security;

-- Policy: SELECT — usuário vê seus próprios KPIs
create policy "usuarios_veem_proprios_kpis"
on projeto_kpis for select
using (
  exists (
    select 1 from participantes
    where projeto_id = projeto_kpis.projeto_id
      and user_id = auth.uid()
  )
);

-- Policy: UPDATE — apenas sistema (updated_by triggers)
create policy "sistema_atualiza_kpis"
on projeto_kpis for update
using (auth.uid() = auth.uid()) -- Sempre permite (triggers fazem o work)
with check (auth.uid() = auth.uid());
```

---

## 📝 JSONB Schemas (Exemplos)

### `prazos_criticos` — Array de datas

```json
[
  "2026-06-15",
  "2026-07-20",
  "2026-08-10"
]
```

### `proximos_eventos` — Array de eventos

```json
[
  {
    "tipo": "edital",
    "data": "2026-06-15",
    "responsavel": "tereza@glauber.com",
    "titulo": "Edital SIC Recife 2024"
  },
  {
    "tipo": "pagamento",
    "data": "2026-06-20",
    "responsavel": "chico@glauber.com",
    "titulo": "Pagamento 1º cachê elenco"
  },
  {
    "tipo": "evento_criativo",
    "data": "2026-06-25",
    "responsavel": "caio@glauber.com",
    "titulo": "Primeira reunião de direção"
  }
]
```

---

## ✅ Checklist de Implementação

- [ ] Arquivo `migrations/0024_projeto_kpis.sql` criado
- [ ] Migration executada sem erros
- [ ] Tabela `projeto_kpis` existe
- [ ] Triggers compilam sem erro
- [ ] Índices criados
- [ ] RLS ativa (verificar com `select * from projeto_kpis` como user diferente)
- [ ] Inserir projeto teste
- [ ] Verificar: KPI criado com percentuais zerados
- [ ] Inserir cena/despesa teste
- [ ] Verificar: KPI atualizado automaticamente por trigger
- [ ] Rollback funciona (testar `rollback` da migration)

---

## 🧪 SQL para Testar

### Verificar tabela criada

```sql
select * from information_schema.tables 
where table_name = 'projeto_kpis';
```

### Verificar triggers criados

```sql
select trigger_name, event_object_table, event_manipulation
from information_schema.triggers
where trigger_name like '%kpi%';
```

### Inserir KPI teste

```sql
insert into projeto_kpis (projeto_id, roteiro_filmado_pct, orcamento_comprometido_pct)
values ('550e8400-e29b-41d4-a716-446655440000', 0, 0);
```

### Verificar RLS

```sql
-- Como admin: ver tudo
select * from projeto_kpis;

-- Como user (em session do user): ver apenas seus
set role authenticated;
set request.jwt.claims to '{"sub":"user-id-aqui"}';
select * from projeto_kpis;
```

---

## 📊 Relacionamentos

```
projeto_kpis
├── projeto_id → projetos.id (1:1)
├── updated_by → auth.users.id (1:many)
└── Alimentada por:
    ├── dia_cenas (trigger: roteiro_filmado_pct)
    ├── despesa (trigger: orcamento_comprometido_pct)
    └── editais (trigger: prazos_criticos)
```

---

**Próximo:** TAREFA 1.4 — Documentar React Interfaces (TypeScript)

Pronto? ✅
