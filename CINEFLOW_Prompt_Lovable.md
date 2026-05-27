# PROMPT-MESTRE PARA LOVABLE.DEV — CINEFLOW MVP

> **Instruções de uso**: cole o bloco abaixo (entre os marcadores `═══`) na primeira mensagem de um projeto novo no Lovable.dev. Após a geração inicial, use o botão **"Connect Supabase"** do Lovable para conectar ao seu projeto Supabase. Não cole as instruções acima — só o que está entre os marcadores.

═══════════════════════════════════════════════════════════════════

# Build CINEFLOW — Plataforma SaaS de Gestão de Produções Audiovisuais

Você vai construir o MVP de uma plataforma SaaS B2B chamada **CINEFLOW**, em português brasileiro, voltada para produtoras audiovisuais brasileiras (curtas, longas, séries, publicidade). A plataforma substitui o caos atual de gerir produção via WhatsApp + Google Sheets + Google Drive, oferecendo um único lugar para Ordem do Dia, equipe, orçamento e prestação de contas vinculada aos editais brasileiros (Funcultura PE, Lei Paulo Gustavo).

## 1. Stack obrigatória

- **React 18 + Vite + TypeScript**
- **Tailwind CSS + shadcn/ui** (todos os componentes via shadcn)
- **Supabase** (Auth + Postgres + Storage + Realtime) — usar conexão nativa do Lovable
- **React Router v6** para navegação
- **TanStack Query (React Query)** para cache de dados
- **Zustand** para estado UI global
- **date-fns** para datas (locale pt-BR)
- **lucide-react** para ícones
- **react-hook-form + zod** para formulários
- **sonner** para toasts

## 2. Design System

### Cores (cinematográfico/profissional, tema claro)
- **Primary**: `#1F3864` (azul-noite, headers e CTAs)
- **Secondary**: `#2E75B6` (azul-claro, links e destaques)
- **Accent**: `#D4A017` (âmbar/dourado, alertas positivos e "ação", referência ao cinema)
- **Success**: `#16A34A` | **Warning**: `#EAB308` | **Danger**: `#DC2626`
- **Background**: `#FAFAFA` | **Surface**: `#FFFFFF` | **Border**: `#E5E7EB`
- **Text**: `#111827` (principal), `#6B7280` (secundário)

### Tipografia
- Família: **Inter** (sans-serif) para UI; **Source Serif Pro** para títulos editoriais (opcional, só na landing/cabeçalho de relatório)
- Escala: 12 / 14 / 16 / 18 / 24 / 32 / 48
- Pesos: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Componentes-padrão
- Botões com cantos `rounded-lg`, hover suave, foco visível
- Cards `rounded-xl shadow-sm border border-border`
- Inputs altos (`h-11`) com label flutuante quando possível
- Tabelas alternando linhas com `bg-muted/30`
- Layout responsivo: sidebar colapsável no mobile (drawer)

## 3. Estrutura de navegação

### Sidebar (sempre visível em desktop)
- 🎬 **Dashboard** (`/`)
- 📋 **Projetos** (`/projetos`)
- 📅 **Cronograma** (`/projetos/:id/cronograma`)
- 📄 **Ordem do Dia** (`/projetos/:id/ordens-do-dia`)
- 👥 **Equipe** (`/projetos/:id/equipe`)
- 📍 **Locações** (`/projetos/:id/locacoes`)
- 💰 **Financeiro** (`/projetos/:id/financeiro`)
- 🧾 **Prestação de Contas** (`/projetos/:id/prestacao`)
- ⚙️ **Configurações** (`/configuracoes`)

### Topbar
- Logo CINEFLOW à esquerda
- Seletor de produtora (org switcher) e projeto ativo
- Notificações (sino)
- Avatar do usuário com menu (perfil, sair)

## 4. Modelo de Dados (Supabase / Postgres)

Crie estas tabelas com RLS habilitado. **Todo registro herda `org_id`** e a RLS garante que cada usuário só vê os dados das orgs em que é membro.

```sql
-- Organizações (produtoras)
create table orgs (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  plano text default 'free',
  criado_em timestamptz default now()
);

-- Vínculo usuário <-> org
create table memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null check (papel in ('owner','admin_financeiro','diretor_producao','diretor','ad','chefe_departamento','equipe')),
  departamento text,
  ativo boolean default true,
  criado_em timestamptz default now(),
  unique(org_id, user_id)
);

-- Editais (base de conhecimento)
create table editais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  orgao text not null,
  vigencia text,
  prazo_prestacao_meses int,
  observacoes text,
  criado_em timestamptz default now()
);

create table rubricas_edital (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid not null references editais(id) on delete cascade,
  codigo text not null,
  nome text not null,
  perc_max numeric,
  observacoes text
);

-- Projetos
create table projetos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('curta','longa','serie','publicidade','clipe','documentario','outro')),
  status text default 'pre_producao' check (status in ('pre_producao','producao','pos_producao','concluido','cancelado')),
  edital_id uuid references editais(id),
  periodo_inicio date,
  periodo_fim date,
  orcamento_total numeric default 0,
  criado_em timestamptz default now()
);

-- Pessoas (equipe e elenco, contatos da produtora)
create table pessoas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
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

-- Locações
create table locacoes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
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

-- Dias de filmagem
create table dias_filmagem (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  data date not null,
  chamada_geral time,
  locacao_id uuid references locacoes(id),
  status text default 'planejado' check (status in ('planejado','confirmado','em_filmagem','concluido','adiado')),
  observacoes text,
  criado_em timestamptz default now(),
  unique(projeto_id, data)
);

-- Escalas (quem trabalha em qual dia)
create table escalas (
  id uuid primary key default gen_random_uuid(),
  dia_id uuid not null references dias_filmagem(id) on delete cascade,
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  papel text,
  hora_chamada time,
  hora_almoco time,
  transporte text,
  observacoes text,
  unique(dia_id, pessoa_id)
);

-- Ordens do dia (documento publicado)
create table ordens_do_dia (
  id uuid primary key default gen_random_uuid(),
  dia_id uuid not null references dias_filmagem(id) on delete cascade,
  versao int not null default 1,
  dados_json jsonb not null,
  publicada_em timestamptz,
  publicada_por uuid references auth.users(id),
  criado_em timestamptz default now()
);

-- Confirmações de leitura
create table entregas_od (
  id uuid primary key default gen_random_uuid(),
  ordem_id uuid not null references ordens_do_dia(id) on delete cascade,
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  canal text check (canal in ('app','email','whatsapp','link')),
  enviada_em timestamptz default now(),
  lida_em timestamptz,
  confirmada_em timestamptz
);

-- Orçamento
create table orcamentos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  versao int default 1,
  total numeric default 0,
  aprovado_em timestamptz,
  criado_em timestamptz default now()
);

create table linhas_orcamento (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  rubrica_codigo text,
  descricao text not null,
  valor_previsto numeric default 0,
  valor_realizado numeric default 0
);

-- Despesas (lançamentos financeiros)
create table despesas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  linha_orcamento_id uuid references linhas_orcamento(id),
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

-- Validações contra edital
create table validacoes_edital (
  id uuid primary key default gen_random_uuid(),
  despesa_id uuid not null references despesas(id) on delete cascade,
  status text not null check (status in ('ok','warn','fail')),
  mensagem text,
  gerada_em timestamptz default now()
);
```

### RLS — exemplo de política
Para cada tabela, criar política que permite acesso só se `org_id` ∈ orgs do usuário:
```sql
alter table projetos enable row level security;
create policy "membros veem projetos da org" on projetos for select
  using (org_id in (select org_id from memberships where user_id = auth.uid() and ativo = true));
create policy "owners e admins inserem" on projetos for insert
  with check (org_id in (select org_id from memberships where user_id = auth.uid() and papel in ('owner','admin_financeiro','diretor_producao')));
-- mesma lógica para update/delete
```
Aplique padrão equivalente para todas as tabelas com `org_id` direto ou indireto.

## 5. Páginas e fluxos

### 5.1 Auth (`/login`, `/signup`)
- Login com e-mail/senha + "Continuar com Google"
- Signup pede nome, e-mail, nome da produtora — cria org e membership 'owner' automaticamente
- Recuperação de senha

### 5.2 Dashboard (`/`)
- Cards no topo: nº de projetos ativos, dias de filmagem nos próximos 7 dias, despesas pendentes, alertas de prestação
- Lista dos projetos com barra de progresso (orçamento gasto, dias rodados)
- Ordens do dia recentes
- Alertas de risco (orçamento ultrapassando 80%, OD não publicada para amanhã)

### 5.3 Projetos (`/projetos`)
- Lista de projetos com filtros (status, tipo, edital)
- Botão "Novo projeto" → modal com nome, tipo, edital (select), período, orçamento total
- Card de cada projeto com link para detalhe

### 5.4 Detalhe de projeto (`/projetos/:id`)
- Tabs: Visão Geral, Cronograma, Ordens do Dia, Equipe, Locações, Financeiro, Prestação
- Visão Geral: ficha do projeto + atalhos para tarefas pendentes

### 5.5 Cronograma (`/projetos/:id/cronograma`)
- Visualização em calendário (mês) + lista (tabela)
- Botão "Novo dia de filmagem" → modal com data, chamada geral, locação
- Cada dia clicável abre o painel lateral para escalas e ordem do dia

### 5.6 Ordem do Dia (`/projetos/:id/ordens-do-dia/:diaId`)
- Editor visual com seções colapsáveis:
  - Cabeçalho (data, dia da semana, chamada geral, locação principal com mapa)
  - Equipe e Elenco (tabela editável com nome, função, chamada individual, transporte)
  - Cenas a gravar (lista; checkbox por cena)
  - Refeições (horários)
  - Clima e nascer/pôr do sol (placeholder; integrar API depois)
  - Hospital mais próximo e contatos de emergência
  - Observações
- Botão "Publicar" → cria nova versão, dispara envios e gera link público
- Visualizador público sem login em `/od/:token` (mobile-first)
- Botão "Enviar via WhatsApp" → abre `wa.me/?text=` com texto formatado + link público

### 5.7 Equipe (`/projetos/:id/equipe`)
- Lista de pessoas vinculadas ao projeto + botão "Adicionar pessoa"
- Importar do catálogo da produtora (todas as pessoas da org)
- Cadastro com nome, função, departamento, contato, valor de diária, dados bancários (JSON)

### 5.8 Locações (`/projetos/:id/locacoes`)
- Cards com foto, endereço, contato, valor
- Mapa simples (placeholder; usar Mapbox depois)

### 5.9 Financeiro (`/projetos/:id/financeiro`)
- Visão por rubrica: tabela com rubrica, previsto, realizado, % consumido (barra)
- Botão "Nova despesa" → modal com data, valor, descrição, rubrica (select), departamento, upload de comprovante (foto/PDF)
- Lista de despesas com filtros (status, data, departamento)
- Cada despesa mostra status de validação contra edital (ícone verde/amarelo/vermelho)

### 5.10 Prestação de Contas (`/projetos/:id/prestacao`)
- Cabeçalho com edital vinculado e prazo
- Tabela de validações por rubrica (consolidado): OK / Atenção / Erro
- Lista de erros e avisos pendentes com link para cada despesa
- Botão "Gerar relatório final" (gera PDF — placeholder no MVP)

### 5.11 Configurações (`/configuracoes`)
- Aba "Produtora": nome, CNPJ, logo
- Aba "Equipe": gerenciar memberships e papéis
- Aba "Plano": placeholder de billing

## 6. Lógica de negócio importante

### Validação de despesa contra edital
Ao criar/editar uma despesa, executar (frontend chama RPC Supabase ou Edge Function):
1. Buscar rubrica do edital correspondente à `linha_orcamento_id`
2. Verificar: `data` está dentro de `projetos.periodo_inicio`/`periodo_fim`?
3. Verificar: somatório de despesas dessa rubrica não excede `perc_max` × `orcamento_total`?
4. Verificar: `cnpj_emitente` preenchido?
5. Inserir resultado em `validacoes_edital` (status `ok`, `warn` ou `fail`) com mensagem
6. Mostrar badge na UI com a cor do status

### Confirmação de leitura da OD
Quando OD é publicada:
1. Para cada pessoa escalada, inserir linha em `entregas_od` com canal 'app'
2. Mostrar à pessoa um badge "Nova OD disponível" no app
3. Quando ela abre, marcar `lida_em`
4. Botão "Confirmar presença" marca `confirmada_em`
5. Painel do AD mostra contadores: X de Y confirmaram

## 7. Dados de seed (criar ao primeiro acesso de um usuário novo)

```sql
-- Edital 1: Funcultura PE
insert into editais (nome, orgao, vigencia, prazo_prestacao_meses, observacoes) values
('Funcultura Audiovisual 2025-2026', 'Secult-PE / Fundarpe', '2025-2026', 24, 'Edital estadual de fomento ao audiovisual de Pernambuco');

insert into rubricas_edital (edital_id, codigo, nome, perc_max) values
((select id from editais where nome like 'Funcultura%'), 'EQUIPE', 'Cachês de equipe técnica', 0.55),
((select id from editais where nome like 'Funcultura%'), 'ELENCO', 'Cachês de elenco', 0.25),
((select id from editais where nome like 'Funcultura%'), 'EQUIP', 'Locação de equipamentos', 0.20),
((select id from editais where nome like 'Funcultura%'), 'LOCACAO', 'Locações de cenário', 0.10),
((select id from editais where nome like 'Funcultura%'), 'ARTE', 'Direção de arte e figurino', 0.15),
((select id from editais where nome like 'Funcultura%'), 'POS', 'Pós-produção (montagem, som, cor)', 0.25),
((select id from editais where nome like 'Funcultura%'), 'ADM', 'Administração e contabilidade', 0.05),
((select id from editais where nome like 'Funcultura%'), 'TRANSP', 'Transporte e logística', 0.10),
((select id from editais where nome like 'Funcultura%'), 'ALIM', 'Alimentação de equipe', 0.08);

-- Edital 2: Lei Paulo Gustavo
insert into editais (nome, orgao, vigencia, prazo_prestacao_meses, observacoes) values
('Lei Paulo Gustavo — Audiovisual', 'MinC / Município', '2024-2026', 24, 'Repasse de recursos federais via municípios e estados para o setor audiovisual');

insert into rubricas_edital (edital_id, codigo, nome, perc_max) values
((select id from editais where nome like 'Lei Paulo%'), 'EQUIPE', 'Equipe técnica', 0.50),
((select id from editais where nome like 'Lei Paulo%'), 'ELENCO', 'Elenco', 0.20),
((select id from editais where nome like 'Lei Paulo%'), 'EQUIP', 'Equipamentos', 0.25),
((select id from editais where nome like 'Lei Paulo%'), 'POS', 'Pós-produção', 0.25),
((select id from editais where nome like 'Lei Paulo%'), 'ADM', 'Administração', 0.05);
```

## 8. Critérios de aceite do MVP

- [ ] Usuário consegue criar conta, virar owner de uma produtora e convidar 2 pessoas
- [ ] Criar 1 projeto vinculado ao Funcultura
- [ ] Adicionar 5 pessoas (equipe) e 1 locação
- [ ] Criar 3 dias de filmagem
- [ ] Para 1 desses dias, criar a Ordem do Dia completa e publicar
- [ ] Ver a OD em link público mobile-friendly
- [ ] Outro usuário (papel "equipe") consegue abrir e confirmar a OD
- [ ] Criar orçamento com 5 linhas em rubricas diferentes
- [ ] Lançar 3 despesas (uma OK, uma com warn por % alta, uma rejeitada por estar fora do período)
- [ ] Página de prestação mostra os 3 status corretamente
- [ ] Tudo responsivo (testar em iPhone 14 e desktop 1440px)

## 9. Tom e copy
- Português brasileiro, voz ativa, profissional mas próximo
- Evitar jargão americano (use "Ordem do Dia", não "Call Sheet")
- Erros amigáveis com sugestão de ação
- Vazios com call-to-action ("Você ainda não tem nenhum projeto. Criar o primeiro?")

## 10. O que NÃO fazer no MVP (deixar para depois)
- Não implementar Push-to-Talk / VoIP (LiveKit virá no Sprint 6)
- Não implementar OCR de NF (Mindee virá no Sprint 4)
- Não implementar check-in GPS (Sprint 5)
- Não implementar parser de roteiro PDF (Sprint 7)
- Não implementar app nativo (PWA é suficiente)

**Comece criando o esquema Supabase, depois a auth, depois a navegação principal, depois cada módulo na ordem listada acima. Mantenha tudo em português. Use shadcn para 100% dos componentes UI.**

═══════════════════════════════════════════════════════════════════

## Dicas pós-prompt

Depois de colar o prompt acima, conforme o Lovable for gerando, você pode pedir refinamentos pontuais como:

- "Adicione um seletor de tema escuro no topbar"
- "A Ordem do Dia precisa de um campo para previsão do tempo (mock por enquanto)"
- "Crie um componente de mapa com Mapbox na tela de locação (peça a chave depois)"
- "A tabela de despesas precisa de filtros por departamento e por status"

E quando tudo estiver funcionando:

- "Conecte ao Supabase agora" (ele faz pelo botão nativo)
- "Faça push para o GitHub" (idem)
- "Mostre como conectar à Vercel"
