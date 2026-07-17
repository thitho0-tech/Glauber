# GLAUBER — Sprint 1: Guia Técnico de Implementação

**Sprint 1 — Fundação Fiscal & Auth**  
**Duração:** 3-4 semanas  
**Equipe:** DP (Diretor de Produção) + Produtor como validadores  
**Objetivo:** Ter prestação de contas Funcultura defensável em telas

---

## 📋 O Que Será Entregue

- ✅ Storage privado com signed URLs (documentos_fiscais bucket)
- ✅ Senha mínima 8 chars em signup + convite
- ✅ Locações por projeto (não mais por org)
- ✅ Upload NF + RPA + comprovante (sem parsing XML ainda — PDF simples)
- ✅ Regime de contratação (enum: CLT/MEI/RPA/PJ)
- ✅ Dados bancários de contratados
- ✅ Fornecedores básicos (cadastro + cotação simples)
- ✅ Conta bancária do projeto
- ✅ Trilha de auditoria (audit_log)
- ✅ F1 mínimo (storage privado + lib useAnexo)
- ✅ F3 núcleo (tabelas fiscal/auditoria)

---

## 🗂️ Estrutura de Tarefas

### Semana 1: Infraestrutura + Auth

#### Task 1.1: Configurar Supabase Storage (2 dias)
**Objetivo:** Criar bucket privado com políticas de acesso  
**Arquivos a modificar:**
- `supabase/migrations/0024_storage_setup.sql`
- `.env.example`, `.env.local`

**Checklist:**
- [ ] Criar bucket `documentos_fiscais` (private)
- [ ] Criar bucket `referencias_visuais` (private)
- [ ] Criar bucket `rushes` (private)
- [ ] Configurar RLS: usuário só vê documentos do seu projeto
- [ ] Configurar signed URLs com expiração 24h
- [ ] Testar upload/download via Admin API

**Código SQL modelo:**
```sql
-- Criar bucket
insert into storage.buckets (id, name, public) 
values ('documentos_fiscais', 'documentos_fiscais', false);

-- RLS: usuário só vê docs do seu projeto
create policy "Users can upload own docs" on storage.objects
  for insert with check (
    auth.uid() in (
      select user_id from projeto_pessoas 
      where projeto_id = (storage.foldername(name)::uuid)
    )
  );
```

---

#### Task 1.2: Lib useAnexo + Upload Component (2 dias)
**Objetivo:** Componente React reutilizável para upload com preview  
**Arquivos a criar:**
- `lib/hooks/useAnexo.ts`
- `components/FormAnexo.tsx`
- `types/anexo.ts`

**Interface esperada:**
```typescript
// useAnexo hook
const { 
  upload, 
  isLoading, 
  error, 
  preview,
  anexo 
} = useAnexo('documentos_fiscais', projeto_id);

// Retorno do hook
interface AnexoResult {
  id: string;
  url: string;
  signed_url: string;
  bucket: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}
```

**Funcionalidades:**
- Aceitar JPG, PNG, PDF (até 8MB)
- Mostrar preview de imagem/PDF primeira página
- Barra de progresso
- Retry automático em falha (3 tentativas)
- Cancelamento de upload
- Validação mimetype no frontend + backend

---

#### Task 1.3: Corrigir Password Validation (1 dia)
**Objetivo:** Standardizar senha mínima 8 chars  
**Arquivos a modificar:**
- `lib/auth.ts` (validatePassword function)
- `pages/auth/signup.tsx`
- `pages/auth/[token]/accept-invite.tsx`
- Supabase Auth schema (se custom)

**Checklist:**
- [ ] minLength: 8 em todos os pontos de signup
- [ ] Regex: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/`
  - Pelo menos 1 minúscula
  - Pelo menos 1 maiúscula
  - Pelo menos 1 dígito
  - 8+ caracteres total
- [ ] Mensagem: "Mínimo 8 caracteres, 1 maiúscula, 1 número"
- [ ] Testar com senhas válidas/inválidas

**Endpoints afetados:**
- POST `/api/auth/signup`
- POST `/api/auth/invite/[token]`
- POST `/api/auth/reset-password`

---

#### Task 1.4: Magic Link Recovery (1 dia)
**Objetivo:** Fluxo não-bloqueador de recuperação de senha  
**Arquivos a modificar:**
- `pages/auth/forgot-password.tsx`
- `pages/auth/reset-password/[token].tsx`
- `lib/auth.ts`

**Fluxo:**
1. Usuário entra email → Supabase envia magic link
2. Link válido por 1 hora
3. Ao clicar: tela de nova senha (sem reconfirmar email)
4. Sucesso: volta pra login com mensagem "Senha resetada"

**Mensagens de erro:**
- ❌ Genérica: "Não conseguimos processar seu pedido. Tente novamente."
- ❌ Nunca: "Este email não existe"

---

### Semana 2: Schema Locações + Fornecedores

#### Task 2.1: Migration Locações por Projeto (1 dia)
**Objetivo:** Quebrar locações de org para projeto  
**Arquivo:**
- `supabase/migrations/0025_locacoes_por_projeto.sql`

**Mudanças:**
```sql
-- Tabela locacoes: era (id, org_id, ...) agora é (id, projeto_id, ...)
ALTER TABLE locacoes DROP CONSTRAINT locacoes_org_id_fk;
ALTER TABLE locacoes ADD COLUMN projeto_id uuid references projetos(id) on delete cascade;
ALTER TABLE locacoes DROP COLUMN org_id;
CREATE INDEX idx_locacoes_projeto ON locacoes(projeto_id);

-- Ficha de locação: planta, fotos, autorização, energia, hospital
ALTER TABLE locacoes ADD COLUMN (
  planta_url text,              -- signed URL do PDF da planta
  fotos_urls text[],            -- array de signed URLs
  autorizacao_url text,         -- signed URL comprovante de autorização
  energia_trifasica boolean,
  energia_monofasica boolean,
  hospital_proximo text,        -- nome/km do hospital mais próximo,
  ruidos_externos text          -- descrição de riscos sonoros
);
```

**Checklist:**
- [ ] Migration sem downtime (add column, populate, drop)
- [ ] Índice em projeto_id
- [ ] Testar rollback
- [ ] Atualizar ORM/types

---

#### Task 2.2: Componente FormLocação Completo (2 dias)
**Objetivo:** Tela de cadastro/edição de locação com ficha completa  
**Arquivos a criar:**
- `components/forms/FormLocacao.tsx`
- `pages/projetos/[id]/locacoes/[locacao_id]/edit.tsx`
- `pages/projetos/[id]/locacoes/new.tsx`

**Campos:**
- Nome, endereço, CEP
- Upload planta (PDF)
- Upload fotos (múltiplas)
- Upload comprovante autorização (PDF)
- Checkboxes trifásica/monofásica
- Input hospital próximo
- Textarea riscos sonoros

**Funcionalidades:**
- Preview PDF primeira página (lib pdfjs)
- Galeria de fotos com drag-and-drop reorder
- Validar CEP via ViaCEP
- Botão "Duplicar locação" (cópia rápida)

---

#### Task 2.3: Modelo Fornecedores + Cotação (2 dias)
**Objetivo:** Tabelas de fornecedor e cotação simples  
**Arquivo:**
- `supabase/migrations/0026_fornecedores_cotacoes.sql`

**Schema:**
```sql
-- Fornecedores
create table fornecedores (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references projetos(id) on delete cascade,
  razao_social text not null,
  cnpj text,
  email text,
  telefone text,
  endereco text,
  category text, -- 'gravacao', 'locacao', 'catering', 'transporte', etc
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Cotações (pedido de orçamento)
create table cotacoes (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid references fornecedores(id) on delete cascade,
  projeto_id uuid references projetos(id) on delete cascade,
  servico text not null,
  quantidade int default 1,
  valor_unitario money,
  total money,
  status text default 'pendente', -- 'pendente', 'respondida', 'rejeitada'
  resposta_data timestamp,
  resposta_valor money,
  created_at timestamp default now()
);

-- Índices
create index idx_fornecedores_projeto on fornecedores(projeto_id);
create index idx_cotacoes_fornecedor on cotacoes(fornecedor_id);
```

**RLS:**
```sql
-- Fornecedores: usuário acessa só do seu projeto
create policy "Users can view fornecedores of their project" on fornecedores
  for select using (
    auth.uid() in (
      select user_id from projeto_pessoas where projeto_id = fornecedores.projeto_id
    )
  );
```

---

### Semana 2-3: Upload NF + Regime Contratação

#### Task 3.1: Criar Tabelas Despesas + RPA (2 dias)
**Objetivo:** Schema para receber NF/RPA/Comprovante  
**Arquivo:**
- `supabase/migrations/0027_despesas_rpa.sql`

**Schema:**
```sql
create table despesas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references projetos(id),
  tipo text not null, -- 'nf', 'rpa', 'cupom', 'boleto'
  fornecedor_id uuid references fornecedores(id),
  descricao text,
  valor_bruto money,
  valor_liquido money,
  data_emissao date,
  nf_numero text,
  nf_serie text,
  nf_chave_acesso text, -- para parsing XML depois
  nf_url text, -- signed URL do PDF/XML
  comprovante_pagamento_url text,
  status text default 'lançada', -- 'lançada', 'auditada', 'aprovada', 'paga'
  created_at timestamp default now(),
  updated_at timestamp default now(),
  created_by uuid references auth.users(id)
);

create table rpa_emitidos (
  id uuid primary key default gen_random_uuid(),
  despesa_id uuid references despesas(id),
  pessoa_id uuid references pessoas(id),
  numero text,
  data_emissao date,
  valor_bruto money,
  retencoes_inss money,
  retencoes_ir money,
  retencoes_iss money,
  valor_liquido money,
  pdf_url text, -- signed URL
  status text default 'emitido'
);
```

---

#### Task 3.2: FormUploadNF Component (2 dias)
**Objetivo:** Componente para upload NF com preview + validações  
**Arquivos:**
- `components/forms/FormUploadNF.tsx`
- `lib/nfe-parser.ts` (será usado em Sprint 6, mas skeleton agora)
- `pages/projetos/[id]/financeiro/despesas/nova.tsx`

**Interface:**
```typescript
interface NovaDepesa {
  tipo: 'nf' | 'rpa' | 'cupom' | 'boleto';
  fornecedor_id: string;
  descricao: string;
  valor: number;
  data_emissao: Date;
  arquivo_nf: File; // PDF ou XML
  comprovante: File; // foto cupom ou comprovante pagamento
}
```

**Validações:**
- [ ] Arquivo ≤ 8MB
- [ ] Formato: PDF ou XML (extensão válida)
- [ ] Fornecedor obrigatório
- [ ] Valor > 0
- [ ] Data não no futuro

**Fluxo:**
1. Seleciona tipo (NF/RPA/Cupom)
2. Seleciona fornecedor ou cria novo
3. Upload NF (PDF) + preview
4. Upload comprovante pagamento
5. Confirma → guarda em storage

---

#### Task 3.3: Atualizar Projeto_Pessoas com Regime (1 dia)
**Objetivo:** Adicionar enum regime de contratação  
**Arquivo:**
- `supabase/migrations/0028_regime_contratacao.sql`

**Schema:**
```sql
alter table projeto_pessoas add column (
  regime text, -- enum: 'clt', 'mei', 'rpa', 'pj'
  banco_agencia text,
  banco_conta text,
  banco_dv text,
  cpf_cnpj text,
  pix_key text
);

-- Tipo enum se quiser
create type regime_contratacao as enum ('clt', 'mei', 'rpa', 'pj');
alter table projeto_pessoas alter column regime type regime_contratacao;
```

**UI:**
- Dropdown regime
- Campos dinâmicos baseado em regime:
  - **CLT:** dados CTPS (numero, serie) → vai pra folha depois
  - **MEI/RPA/PJ:** dados bancários (agência, conta, DV, CPF/CNPJ)
  - **PIX:** input pix_key como alternativa

---

### Semana 3: Audit Log + Validações

#### Task 4.1: Implementar Audit Log (2 dias)
**Objetivo:** Tabela polimórfica imutável de todas as ações  
**Arquivo:**
- `supabase/migrations/0029_audit_log.sql`

**Schema:**
```sql
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references projetos(id),
  usuario_id uuid references auth.users(id),
  entidade_tipo text, -- 'despesa', 'locacao', 'pessoa', 'fornecedor'
  entidade_id uuid, -- ID do recurso que foi modificado
  acao text, -- 'create', 'update', 'delete', 'upload', 'approve'
  dados_anteriores jsonb, -- snapshot antes da mudança
  dados_novos jsonb, -- snapshot depois
  cambio_campo text, -- qual campo mudou (se update)
  motivo text, -- por que mudou (opcional)
  criado_em timestamp default now(),
  constraint audit_log_imutavel check(true) -- no delete/update allowed
);

-- Policy: usuário só lê seu projeto
create policy "Users can view audit log of their project" on audit_log
  for select using (
    auth.uid() in (
      select user_id from projeto_pessoas where projeto_id = audit_log.projeto_id
    )
  );

-- Trigger: ao atualizar despesa, registra em audit
create or replace function log_despesa_update()
returns trigger as $$
begin
  insert into audit_log (
    projeto_id, usuario_id, entidade_tipo, entidade_id,
    acao, dados_anteriores, dados_novos, cambio_campo
  ) values (
    new.projeto_id,
    auth.uid(),
    'despesa',
    new.id,
    'update',
    row_to_json(old),
    row_to_json(new),
    -- lógica pra detect qual campo mudou
  );
  return new;
end;
$$ language plpgsql;

create trigger despesas_audit after update on despesas
  for each row execute function log_despesa_update();
```

---

#### Task 4.2: Validações de Edital (1 dia)
**Objetivo:** Regras Funcultura checadas em background (sem UI bloqueante)  
**Arquivos:**
- `lib/validators/edital-funcultura.ts`
- `lib/hooks/useEditalValidator.ts`

**Validações iniciais:**
- [ ] Despesa ≤ valor máximo por categoria
- [ ] CNPJ fornecedor válido (formato)
- [ ] NF data não anterior a data de contratação
- [ ] Valor unitário não descabido (comparar com histórico)

**Retorno:**
```typescript
interface EditalValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

// Usar em toast ao lado de "Despesa lançada"
// Ex: "⚠️ Esta categoria já usou 85% do limite"
```

---

## 🔧 Tarefas de Suporte

### Task S1: Documentação API (Ao longo)
- [ ] Atualizar Swagger/OpenAPI
- [ ] Documentar novo endpoints `/api/anexos/*`
- [ ] Documentar novo endpoints `/api/locacoes/*`
- [ ] Documentar novo endpoints `/api/despesas/*`

### Task S2: Testes (Ao longo)
- [ ] Unit: useAnexo hook (upload, error, retry)
- [ ] Unit: validatePassword (10 casos)
- [ ] Integration: upload NF → audit_log registra
- [ ] E2E: produtor loga → upload NF → vê em dashboard

### Task S3: Migration de Dados (Final)
- [ ] Script pra migrar locações existentes (org → projeto)
- [ ] Testar em ambiente staging
- [ ] Rollback plan

---

## 📊 Definition of Done (DoD)

Sprint 1 termina quando:

- ✅ Storage privado funciona (upload/download/signed URL)
- ✅ Senha 8 chars em todos os paths de auth
- ✅ Locações por projeto (tabela migrada, UI funcional)
- ✅ Upload NF funciona (arquivo salvo em storage, registrado em BD)
- ✅ Regime contratação salva per pessoa
- ✅ Fornecedores e cotação básica funcionam
- ✅ Conta bancária do projeto pode ser preenchida
- ✅ Audit log registra todas as ações
- ✅ Testes passam (unit + integration + E2E)
- ✅ Docs atualizadas
- ✅ Staging deployable
- ✅ DP e Produtor podem logar + usar storage + upload NF

---

## 🚨 Riscos Sprint 1

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---|---|---|
| Supabase RLS complexo = bugs | Média | Alto | Code review + teste pentest antes staging |
| Storage signed URLs expiram errado | Baixa | Alto | Testar extensivamente; usar 24h default |
| Arquivo 8MB = timeout | Média | Médio | Testar com arquivos 5MB+; considerar chunking |
| Usuário antigo em CINEFLOW não loga em GLAUBER | Baixa | Médio | Migration script de dados |
| Audit log gerado por todos os updates = lento | Baixa | Médio | Índices criados; monitorar performance |

---

## 📅 Calendário Estimado

| Semana | Tasks | Status |
|--------|-------|--------|
| 1 | 1.1-1.4: Infra + Auth | 🚀 |
| 2 | 2.1-2.3: Locações + Fornecedores | 🏗️ |
| 2-3 | 3.1-3.3: Despesas + Regime | 🏗️ |
| 3 | 4.1-4.2: Audit + Validações | 🏗️ |
| 3-4 | S1-S3: Docs + Testes + Migration | 🔧 |
| Fim S1 | Staging deploy + validação com DP | ✅ |

---

## 🎯 Success Criteria

**DP consegue:**
1. Logar com senha 8 chars
2. Criar fornecedor + cotação
3. Upload NF em PDF
4. Ver histórico de uploads (audit log)
5. Preencher conta bancária do projeto
6. Atribuir regime de contratação a pessoas

**Produtor consegue:**
1. Ver documentos upload (NF) de forma segura (signed URL)
2. Não vê documentos de outro projeto

**Tecnicamente:**
1. Zero erros de segurança RLS
2. Storage funcionando sem timeout
3. Audit log completo + imutável
4. Testes passando
5. Staging clean deploy

---

## 📞 Contato/Escalação

- **Dúvida RLS:** escalate para Tech Lead
- **Dúvida Supabase:** docs.supabase.com ou Discord
- **Dúvida Funcultura:** validar com DP (Tereza)
- **Dúvida UX:** validar com Produtor (Chico)

---

**Sprint 1 começa:** Segunda-feira próxima  
**Review planejada:** Sexta-feira semana 4  
**Próximo sprint:** Sprint 2 (Conversa Criativa)
