# 📋 BRIEF SPRINT 1B — GLAUBER
**Data:** 27 de maio de 2026  
**Status:** ✅ Completo — Pronto para Claude Code  
**Duração Estimada:** 2-3 semanas  
**Total:** 8 tasks | 36 story points

---

## 🎯 VISÃO GERAL

**Fundação Fiscal** — Colocar dados reais no Command Center.

Sprint 1A entregou o dashboard bonito e em tempo real. Sprint 1B entrega os **dados que o preenchem**: upload de NF, comprovantes, fornecedores, regime de contratação e audit trail. Quando 1B terminar, o DP abre o Command Center e vê números reais — não zeros.

**Impacto:** Confiança → o usuário deixa de usar planilha paralela.

---

## 🗺️ ESTADO ATUAL DO PROJETO (O QUE JÁ EXISTE)

### ✅ Já implementado (NÃO reescrever)

| Módulo | Arquivo | O que faz |
|--------|---------|-----------|
| Finance | `src/pages/Finance.tsx` (333 linhas) | Rubricas, lançamento de despesas, tabs, validação edital |
| Accountability | `src/pages/Accountability.tsx` | Prestação por rubrica, status ok/warn/fail |
| Contract | `src/pages/Contract.tsx` | Contratos por pessoa |
| Tabela `despesas` | `0001_init.sql` + `0003_trilha_a.sql` | valor, data, comprovante_url, cnpj, nf, forma_pagamento, data_emissao_nf |
| Tabela `orcamentos` + `linhas_orcamento` | `0001_init.sql` | Orçamento com rubricas |
| Tabela `locacoes` | `0001_init.sql` | Locações por projeto |
| Tabela `validacoes_edital` | `0001_init.sql` | status ok/warn/fail por despesa |
| Tabela `documentos_pessoa` | `0017_d6_documentos.sql` | Docs por pessoa com arquivo_url |
| RPC `validar_despesa()` | `0003_trilha_a.sql` | Validação automática SIC Recife |
| RPC `papel_no_projeto()` | `0016_c3_c4_rbac.sql` | RBAC por projeto |

### ❌ O que FALTA (escopo da Sprint 1B)

1. **Storage bucket privado** para comprovantes/NF (hoje `comprovante_url` é string vazia)
2. **Upload de arquivo** no formulário de despesa (Finance.tsx tem campo mas não faz upload)
3. **Tabela `fornecedores`** — hoje CNPJ é texto livre sem vinculação
4. **Tabela `regimes_contratacao`** — RPA, CLT, MEI, PJ estão no campo livre de `pessoas`
5. **Audit log** — nenhuma tabela rastreia quem fez o quê
6. **Integração KPIs** — trigger de `orcamento_comprometido_pct` já existe (0024), mas `proximos_eventos` nunca é preenchido automaticamente

---

## 🏗️ ARQUITETURA SPRINT 1B

```
Storage (Supabase)
└── bucket: "comprovantes" (privado, RLS por projeto)
    └── path: {org_id}/{projeto_id}/{despesa_id}/{filename}
    └── signed URL válida por 1h para download

Novas tabelas:
├── fornecedores (id, org_id, nome, cnpj, tipo, dados_bancarios jsonb)
├── regimes_contratacao (id, pessoa_id, projeto_id, tipo, valor_bruto, dados_rpa jsonb)
└── audit_log (id, tabela, registro_id, operacao, dados_antes jsonb, dados_depois jsonb, user_id, criado_em)

Melhorias em tabelas existentes:
├── despesas: ADD COLUMN fornecedor_id uuid references fornecedores(id)
├── despesas: ADD COLUMN comprovante_path text (path no storage, não URL completa)
└── projeto_kpis: proximos_eventos populated via função + trigger em editais

Componentes novos:
├── src/components/finance/UploadComprovante.tsx
├── src/components/finance/FornecedorSelect.tsx
└── src/pages/Fornecedores.tsx

Componentes modificados:
└── src/pages/Finance.tsx (adicionar upload + fornecedor no form de despesa)
```

---

## 📊 SCHEMAS SQL

### Tabela: `fornecedores`

```sql
create table if not exists public.fornecedores (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs(id) on delete cascade,
  nome         text not null,
  cnpj         text,
  cpf          text,
  tipo         text check (tipo in ('pj','pf','mei','outro')) default 'pj',
  email        text,
  telefone     text,
  dados_bancarios jsonb default '{}'::jsonb,
  ativo        boolean default true,
  criado_em    timestamptz default now(),
  constraint fornecedores_doc_check check (cnpj is not null or cpf is not null)
);
create index if not exists idx_fornecedores_org on fornecedores(org_id);
create index if not exists idx_fornecedores_cnpj on fornecedores(cnpj) where cnpj is not null;
alter table fornecedores enable row level security;
create policy "fornecedores_org" on fornecedores for all
  using (org_id in (select org_id from memberships where user_id = auth.uid() and ativo));
```

### Tabela: `regimes_contratacao`

```sql
create table if not exists public.regimes_contratacao (
  id            uuid primary key default gen_random_uuid(),
  pessoa_id     uuid not null references public.pessoas(id) on delete cascade,
  projeto_id    uuid not null references public.projetos(id) on delete cascade,
  tipo          text not null check (tipo in ('rpa','clt','mei','pj','diarista','voluntario')),
  valor_bruto   numeric default 0,
  valor_liquido numeric default 0,
  dias_contrato int default 1,
  dados_rpa     jsonb default '{}'::jsonb,  -- {inss_pct, ir_pct, observacao}
  ativo         boolean default true,
  criado_em     timestamptz default now(),
  unique(pessoa_id, projeto_id)
);
create index if not exists idx_regimes_projeto on regimes_contratacao(projeto_id);
alter table regimes_contratacao enable row level security;
create policy "regimes_projeto" on regimes_contratacao for all
  using (public.papel_no_projeto(projeto_id) is not null);
```

### Tabela: `audit_log`

```sql
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  tabela      text not null,
  registro_id uuid,
  operacao    text not null check (operacao in ('insert','update','delete')),
  dados_antes jsonb,
  dados_depois jsonb,
  user_id     uuid references auth.users(id),
  projeto_id  uuid,                          -- para filtro rápido por projeto
  criado_em   timestamptz default now()
);
create index if not exists idx_audit_tabela on audit_log(tabela, registro_id);
create index if not exists idx_audit_projeto on audit_log(projeto_id, criado_em desc);
create index if not exists idx_audit_user on audit_log(user_id, criado_em desc);
-- Imutável: sem UPDATE, sem DELETE para usuários normais
alter table audit_log enable row level security;
create policy "audit_select" on audit_log for select
  using (public.papel_no_projeto(projeto_id) is not null);
create policy "audit_insert_system" on audit_log for insert
  with check (true);  -- triggers (security definer) podem inserir
```

### Alterações em `despesas`

```sql
alter table public.despesas
  add column if not exists fornecedor_id uuid references public.fornecedores(id),
  add column if not exists comprovante_path text;  -- path no storage: org/proj/despesa/file.pdf
```

### Storage bucket

```sql
-- Criar via Dashboard: Storage → New bucket → "comprovantes" → Private
-- Políticas (rodar no SQL Editor):
insert into storage.buckets (id, name, public) values ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;

create policy "comprovantes_upload" on storage.objects for insert
  with check (
    bucket_id = 'comprovantes'
    and auth.role() = 'authenticated'
  );

create policy "comprovantes_select" on storage.objects for select
  using (
    bucket_id = 'comprovantes'
    and auth.role() = 'authenticated'
  );
```

### Trigger audit em `despesas`

```sql
create or replace function fn_audit_despesas()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (tabela, registro_id, operacao, dados_antes, dados_depois, user_id, projeto_id)
  values (
    'despesas',
    coalesce(new.id, old.id),
    lower(tg_op),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    auth.uid(),
    coalesce(new.projeto_id, old.projeto_id)
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_despesas on despesas;
create trigger trg_audit_despesas
  after insert or update or delete on despesas
  for each row execute function fn_audit_despesas();
```

### Função `fn_proximos_eventos_projeto()` (alimentar KPI)

```sql
-- Recalcula proximos_eventos no projeto_kpis baseado em editais e dias_filmagem
create or replace function fn_recalcular_proximos_eventos(p_projeto_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update projeto_kpis
  set
    proximos_eventos = (
      select jsonb_agg(evt order by (evt->>'data'))
      from (
        -- Prazos de editais
        select jsonb_build_object(
          'tipo', 'edital',
          'data', e.vencimento::text,
          'titulo', e.nome,
          'responsavel', (select email from auth.users where id = p.criado_por limit 1)
        ) as evt
        from editais e
        join projetos p on p.edital_id = e.id
        where p.id = p_projeto_id and e.vencimento > now()

        union all

        -- Próximos dias de filmagem confirmados
        select jsonb_build_object(
          'tipo', 'evento_criativo',
          'data', df.data::text,
          'titulo', 'Dia de filmagem — ' || coalesce(l.nome, 'locação a definir'),
          'responsavel', ''
        ) as evt
        from dias_filmagem df
        left join locacoes l on l.id = df.locacao_id
        where df.projeto_id = p_projeto_id
          and df.data >= current_date
          and df.status in ('confirmado','em_filmagem')
        limit 5
      ) sub
      limit 5
    ),
    updated_at = now()
  where projeto_id = p_projeto_id;
end;
$$;
```

---

## ⚙️ TIPOS TYPESCRIPT

```typescript
// src/types/fiscal.ts

type Fornecedor = {
  id: string;
  org_id: string;
  nome: string;
  cnpj: string | null;
  cpf: string | null;
  tipo: 'pj' | 'pf' | 'mei' | 'outro';
  email: string | null;
  telefone: string | null;
  dados_bancarios: {
    banco?: string;
    agencia?: string;
    conta?: string;
    tipo_conta?: 'corrente' | 'poupanca' | 'pix';
    chave_pix?: string;
  };
  ativo: boolean;
};

type RegimeContratacao = {
  id: string;
  pessoa_id: string;
  projeto_id: string;
  tipo: 'rpa' | 'clt' | 'mei' | 'pj' | 'diarista' | 'voluntario';
  valor_bruto: number;
  valor_liquido: number;
  dias_contrato: number;
  dados_rpa: {
    inss_pct?: number;
    ir_pct?: number;
    observacao?: string;
  };
};

type AuditEntry = {
  id: string;
  tabela: string;
  registro_id: string;
  operacao: 'insert' | 'update' | 'delete';
  dados_antes: Record<string, any> | null;
  dados_depois: Record<string, any> | null;
  user_id: string;
  projeto_id: string;
  criado_em: string;
};
```

---

## 🧩 COMPONENTES

### `<UploadComprovante despesaId projectId onUploaded />`

- Input type="file" aceita PDF, JPG, PNG (max 10MB)
- Upload para `storage/comprovantes/{org_id}/{projeto_id}/{despesa_id}/{uuid}.{ext}`
- Salva `comprovante_path` na despesa via UPDATE
- Mostra preview (ícone PDF ou thumbnail imagem)
- Botão "Ver comprovante" gera signed URL (1h) e abre em nova aba
- Estados: idle → uploading → uploaded → error

### `<FornecedorSelect orgId value onChange />`

- Combobox com busca por nome ou CNPJ
- Opção "+ Novo fornecedor" abre dialog inline
- Dialog: nome, CNPJ/CPF, tipo, email (campos mínimos para criar rápido)

### `<Fornecedores />` (página `/projetos/:id/fornecedores`)

- Tabela: nome | CNPJ/CPF | tipo | email | ações
- Botão "Novo fornecedor" abre drawer com formulário completo (dados bancários)
- Filtro por tipo (PJ / PF / MEI)

### Modificar `<Finance />` (existente)

Adicionar ao form de nova despesa:
1. Campo `<FornecedorSelect />` (opcional, mas recomendado)
2. Campo upload de comprovante (após criação da despesa, via `<UploadComprovante />`)
3. Coluna "Comprovante" na tabela de despesas (ícone se tem arquivo)

---

## 📋 8 TASKS (Ordem de Execução)

### **1B.1: Storage bucket + políticas (1 dia)**

- [ ] 1B.1.1 — Migration `0025_storage_comprovantes.sql` (2 pts)
  - AC: bucket "comprovantes" existe, políticas RLS ok, signed URL funciona

### **1B.2: Locações — ficha completa (1.5 dias)**

- [ ] 1B.2.1 — Expandir página Locations.tsx com ficha detalhada (3 pts)
  - Hoje: só lista nome/endereço. Falta: contato, valor diária, fotos, disponibilidade
  - AC: CRUD completo, campo fotos (upload storage bucket "locacoes-fotos")
  - Arquivo: `src/pages/Locations.tsx` (verificar estado atual antes)

### **1B.3: Fornecedores (2 dias)**

- [ ] 1B.3.1 — Migration `0026_fornecedores.sql` (2 pts)
  - AC: tabela criada, RLS ativa, índice CNPJ
- [ ] 1B.3.2 — Página Fornecedores + componente FornecedorSelect (3 pts)
  - AC: CRUD completo, busca funciona, select aparece no form de despesa
  - Arquivos novos: `src/pages/Fornecedores.tsx`, `src/components/finance/FornecedorSelect.tsx`
- [ ] 1B.3.3 — Rota + Sidebar (1 pt) [Depende: 1B.3.2]
  - AC: `/projetos/:id/fornecedores` acessível, link no sidebar do projeto

### **1B.4: Upload NF/comprovante (2 dias)**

- [ ] 1B.4.1 — Componente UploadComprovante (3 pts) [Depende: 1B.1.1]
  - AC: upload funciona, signed URL abre arquivo, erro de tamanho aparece
  - Arquivo: `src/components/finance/UploadComprovante.tsx`
- [ ] 1B.4.2 — Integrar no Finance.tsx (2 pts) [Depende: 1B.4.1, 1B.3.2]
  - AC: form de despesa tem fornecedor + upload, tabela mostra ícone de comprovante
  - ALTER TABLE despesas: add fornecedor_id, add comprovante_path

### **1B.5: Regime de contratação (1.5 dias)**

- [ ] 1B.5.1 — Migration `0027_regimes_contratacao.sql` (2 pts)
  - AC: tabela criada, cálculo de RPA automático (INSS 20%, IR por tabela)
- [ ] 1B.5.2 — UI na página Team.tsx (2 pts) [Depende: 1B.5.1]
  - AC: cada pessoa na equipe tem badge do regime, DP pode editar
  - Arquivo existente: `src/pages/Team.tsx`

### **1B.6: Audit log (1 dia)**

- [ ] 1B.6.1 — Migration `0028_audit_log.sql` (2 pts)
  - AC: trigger em `despesas` dispara, audit_log tem registro, imutável (sem DELETE)
- [ ] 1B.6.2 — Widget de auditoria na Accountability.tsx (2 pts) [Depende: 1B.6.1]
  - AC: seção "Histórico de alterações" mostra últimas 20 mudanças em despesas

### **1B.7: Integração KPIs — proximos_eventos (1.5 dias)**

- [ ] 1B.7.1 — Função `fn_recalcular_proximos_eventos()` + triggers (3 pts)
  - AC: salvar/editar edital popula `proximos_eventos` no projeto_kpis
  - AC: criar dia de filmagem confirmado aparece como evento_criativo
  - Rodar no SQL Editor (ou migration `0029_kpi_eventos.sql`)
- [ ] 1B.7.2 — EventsCard mostra dados reais (1 pt) [Depende: 1B.7.1]
  - AC: Command Center mostra eventos reais, não array vazio
  - Arquivo: `src/components/dashboard/EventsCard.tsx` (verificar se precisa ajuste)

### **1B.8: Testes + validação DP (1 dia)**

- [ ] 1B.8.1 — Teste ponta-a-ponta (2 pts) [Depende: todas]
  - Inserir despesa com comprovante → verificar audit_log → verificar KPI atualizado
  - AC: fluxo completo sem erros, `vercel --prod` limpo

---

## ✅ DEFINITION OF DONE

Cada task "Pronta" quando:
- ✅ Código commitado, sem `console.log`
- ✅ Migration aplica sem erro no SQL Editor do Supabase
- ✅ Build `npx vite build --outDir /tmp/test-build` limpo
- ✅ `vercel --prod` após todas as tasks

---

## 🎯 SUCCESS CRITERIA (Fim Sprint 1B)

- ✅ DP consegue registrar despesa com NF em anexo em < 3 cliques
- ✅ Comprovante fica salvo com segurança (não público, signed URL)
- ✅ Command Center mostra próximos eventos reais (editais + dias confirmados)
- ✅ Toda alteração em despesa gera registro no audit_log
- ✅ Fornecedores com CNPJ vinculados às despesas
- ✅ Regime de contratação visível por pessoa na equipe

---

## 📊 DEPENDÊNCIAS ENTRE TASKS

```
1B.1.1 (storage)
  └── 1B.4.1 (UploadComprovante)
        └── 1B.4.2 (Finance.tsx integrado)
              └── 1B.8.1 (teste ponta-a-ponta)

1B.3.1 (migration fornecedores)
  └── 1B.3.2 (página + componente)
        ├── 1B.3.3 (rota + sidebar)
        └── 1B.4.2 (Finance.tsx integrado)

1B.6.1 (audit log migration)
  └── 1B.6.2 (widget accountability)

1B.7.1 (fn_proximos_eventos + triggers)
  └── 1B.7.2 (EventsCard)

1B.5.1 (regime migration) → 1B.5.2 (Team.tsx) — independente
1B.2.1 (Locations) — independente
```

---

## 🚀 COMO USAR ESTE BRIEF

**Pro Claude Code:**

```
"Ler arquivo BRIEF_SPRINT1B.md (este arquivo).
Implementar Sprint 1B seguindo as 8 tasks na ordem das dependências.
Verificar o que já existe em Finance.tsx, Locations.tsx e Team.tsx antes de modificar.
Não pergunte; arquivo tem tudo. Só implementa e avisa quando pronto pra teste."
```

**Nota importante sobre Storage:**
O bucket "comprovantes" deve ser criado via SQL (migration 0025) — não via Dashboard manual.
As políticas RLS do storage usam `auth.uid()` e o path inclui `org_id` para isolamento.

**Nota sobre migrations:**
Aplicar cada migration no SQL Editor do Supabase (não via `supabase db push` — problema de histórico local não sincronizado com remoto).

---

**Dados reais no Command Center. Sprint 1B. Vamos! 🚀**
