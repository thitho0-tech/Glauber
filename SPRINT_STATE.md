# Estado Glauber — SPRINT 4 em execução (10/06/2026)

**Último commit:** 385b34e (4A+4B em origin/main; deploy confirmado em glauber.app.br)
**Build:** Limpo. `npx tsc --noEmit` = 0 erros (verificado 10/06 após 4B).
**Deploy:** glauber.app.br (Vercel)
**Migrations aplicadas em produção:** 39 (0001 → 0039).

> **FASE 4B CONCLUÍDA no Claude Code (10/06)** — L10–L12, F14, F15 implementados:
> - **L10**: Sidebar nova completa (Mural, Agenda, OD, Roteiro & Decupagem + DEPARTAMENTOS:
>   Produção-hub, Roteiro-depto, Direção, Arte, Fotografia, Som, Elenco, Pós Produção,
>   Mapa de Transporte, Administrativo, Configurações).
> - **L11**: Agenda absorve Cronograma (duas abas: Agenda + Planejamento).
>   `/cronograma` redireciona para `/agenda`.
> - **L12**: Mural novo: coluna "Próximos eventos" (somente leitura) + chat com 3 tabs
>   (Geral | Departamento | Privado).
> - **F14**: `useProjectDeptAccess` hook — RBAC por departamento (producao edita tudo;
>   direcao edita tudo menos Produção; arte/foto/som/elenco/pos editam o seu).
> - **F15**: Tipos de agenda com restrição por departamento (Select substituiu chips livres).
> - **Producao hub**: rota `/projetos/:id/producao` com sub-abas Equipe, Locações,
>   Financeiro, Fornecedores, Contrato, Prestação (rotas legadas mantidas).
> - **Placeholders**: Direção, Fotografia, Som, PosProducao, MapaTransporte, Administrativo.
> PENDENTE: commit + push + vercel --prod + smoke test da sidebar nova.
> Próxima sessão: **FASE 4C** (OD completa + PDF OD + PDF decupagem + abas Roteiro/Decupagem).

---

## Links de acesso

| Serviço | URL |
|---------|-----|
| App produção | https://glauber.app.br |
| Vercel dashboard | https://vercel.com/cineflow-s-projects/glauber-mvp |
| GitHub repo | https://github.com/thitho0-tech/Glauber |
| Supabase dashboard | https://supabase.com → projeto Glauber (dsrulpipsksvtskqwevc) |
| Supabase SQL Editor | https://supabase.com/dashboard/project/dsrulpipsksvtskqwevc/sql |
| Supabase Storage | https://supabase.com/dashboard/project/dsrulpipsksvtskqwevc/storage |
| Supabase Functions | https://supabase.com/dashboard/project/dsrulpipsksvtskqwevc/functions |
| Porto Digital pre-incubação | trilha institucional (prazo ~05/07/2026) |

---

## Estrutura de pastas

```
C:\Users\Thiago França\Documents\Claude\Projects\Glauber\
├── cineflow-mvp/                  ← código fonte principal
│   ├── src/
│   │   ├── pages/                 ← 28 páginas React (.tsx)
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   │   ├── CommandCenter.tsx
│   │   │   │   └── views/
│   │   │   │       ├── DPView.tsx
│   │   │   │       ├── DirectorView.tsx
│   │   │   │       ├── ADView.tsx
│   │   │   │       └── CollaboratorView.tsx
│   │   │   ├── layout/
│   │   │   │   └── Sidebar.tsx
│   │   │   └── finance/, auth/, ui/
│   │   ├── hooks/
│   │   │   ├── useProjectRole.ts  ← RBAC hook central
│   │   │   ├── useProjectKPIs.ts  ← KPIs com Realtime + polling 5s
│   │   │   └── useAuth.ts
│   │   ├── types/
│   │   │   └── dashboard.ts       ← ProjectKPIs, DashboardRole, mapRoleToDashboard
│   │   └── index.css              ← inclui @media print para PDF da OD
│   ├── supabase/
│   │   ├── migrations/            ← 36 arquivos SQL (0001→0036)
│   │   └── functions/
│   │       ├── notificar-od/      ← Edge Function email ao publicar OD
│   │       ├── send-email/        ← Gmail SMTP (denominailer)
│   │       ├── analisar-roteiro/  ← Tesseract OCR decupagem
│   │       ├── ocr-extract/
│   │       └── aceitar-convite/
│   ├── .env                       ← VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
│   │                                 (adicionar VITE_EDGE_SHARED_SECRET)
│   └── .env.example
├── SPRINT_STATE.md                ← este arquivo
├── CINEFLOW_Roadmap_V3.md         ← roadmap principal (fonte da verdade)
├── RELATORIO_SPRINT1C.md
├── DIAGNOSTICO_ESTADO_ATUAL_VS_ROADMAP.md
└── Glauber_Analise_Critica_Prototipo.docx  ← relatório Sprint 2C análise
```

---

## Comandos essenciais (PowerShell — NUNCA usar &&)

```powershell
# Entrar na pasta do projeto
cd "C:\Users\Thiago Franca\Documents\Claude\Projects\Glauber\cineflow-mvp"

# Deploy para produção
vercel --prod

# Git — commit e push
git add .
git commit -m "Sprint XX: descrição"
git push

# Se aparecer index.lock no git:
Remove-Item "C:\Users\Thiago Franca\Documents\Claude\Projects\Glauber\.git\index.lock"

# Deploy de Edge Function Supabase
supabase functions deploy notificar-od --no-verify-jwt
supabase functions deploy send-email --no-verify-jwt

# Verificar build local (opcional — Vercel faz o build também)
# Rodar via Claude Cowork (sandbox Linux), não no PowerShell local
```

---

## Regras críticas que NÃO podem esquecer

1. **PowerShell NÃO aceita `&&`** — usar `;` ou dois comandos separados
2. **NUNCA `supabase db push`** — sempre colar SQL no Editor do Supabase Dashboard
3. **`pessoas` NÃO tem `user_id`** — vínculo auth é sempre via email match:
   `lower(pe.email) = lower((select email from auth.users where id = auth.uid()))`
4. **`org_id` do usuário** → buscar via `select org_id from public.memberships where user_id = auth.uid() and ativo = true limit 1`
5. **`ordens_do_dia.data`** (não `data_filmagem`) — nome correto da coluna de data da OD
6. **`projetos.periodo_inicio`** (não `data_inicio`) — nome correto da coluna de início
7. **`roteiro_cenas.projeto_id`** existe diretamente na tabela
8. **pg_cron**: extensão precisa estar ativa antes de rodar SQL de cron.schedule()
9. **Editar arquivos .tsx grandes**: SEMPRE usar python3 via bash no Cowork (Edit/Write truncam JSX)
10. **`vercel --prod`** (não `vercel`) — o sem flag faz preview, não produção
11. **Radix `<SelectItem>` NUNCA com `value=""`** — quebra o componente (tela trava). Para opção "Nenhum/Limpar" usar valor-sentinela (`"__none__"`) e converter pra `null` ao salvar. `<option value="">` em `<select>` nativo HTML é OK; o cuidado é só com o Radix. String vazia em coluna `uuid` também gera 400 no Postgres.
12. **Fix cirúrgico (1-3 linhas) pode ser feito direto no Cowork** (Edit), sem abrir Claude Code — depois é só `git add/commit/push` + `vercel --prod` no PowerShell. Claude Code segue sendo o caminho para mudanças grandes/multi-arquivo.

---

## Sprints concluídas

| Sprint | Tema | Status | Commit |
|--------|------|--------|--------|
| 1A | Estrutura base, auth, projetos, OD, equipe | ✅ | — |
| 1B | Financeiro, contratos, figurino/arte, escalas | ✅ | — |
| 1C | Dashboard KPI, RBAC, audit log, fornecedores, roteiro | ✅ | — |
| 1D | Lixeira geral, agenda, notificações in-app, depto obrigatório | ✅ | 0677f4f |
| 2A | Bucket áudio, RBAC front, Edge Function email, pg_cron | ✅ | 11bc1d8 |
| 2B | Command Center dados reais (todas as views) | ✅ | 11bc1d8 |
| 2C | Stripboard, PDF OD, mobile Finance+Team | ✅ | a11c57d |
| 3A | Multi-função equipe, função do owner, fix notif, views Command Center | ✅ | d70cbb8 |
| 3B | Financeiro: fornecedor+autofill CNPJ, upload comprovante, status editável | ✅ | d49e3df |
| 3B.5 | Separar Configurações: aba Conta × Gestão do Projeto (obs 12/06) | ✅ | 85d660b |
| hotfix | Select do edital sem value vazio (crash Radix + 400 ao salvar projeto) | ✅ | 873688f |
| hotfix | Botão "Excluir projeto" (Zona de perigo) na aba Gestão do Projeto, fluxo 2 etapas | ✅ | 5112ce5 |

---

## Banco de dados — tabelas principais e relações

```
projetos (id, org_id, nome, tipo, periodo_inicio, periodo_fim, orcamento_total, edital_id, status, deleted_at)
  └── dias_filmagem (id, projeto_id, data, chamada_geral, locacao_id, status)
       └── ordens_do_dia (id, projeto_id, dia_id nullable, titulo, data, tipo, publicada_em, versao, token_publico)
       └── escalas (id, dia_id, pessoa_id)
       └── check_ins (id, projeto_pessoa_id, dia_id, entrada, saida)
  └── projeto_pessoas (id, projeto_id, pessoa_id, papel, funcao_av_id, valor_contratacao, notif_od_inapp, notif_od_email, deleted_at)
       └── projeto_pessoa_funcoes (id, projeto_pessoa_id, funcao_av_id, principal)  ← multi-função (Sprint 3A); trigger sincroniza principal→projeto_pessoas.funcao_av_id
  └── projeto_kpis (id, projeto_id, roteiro_filmado_pct, orcamento_comprometido_pct, prazos_criticos[], proximos_eventos[], updated_at)
  └── despesas (id, projeto_id, linha_orcamento_id, fornecedor_id, descricao, valor, data, status[pendente|aprovada|rejeitada|paga], comprovante_url, cnpj_emitente, forma_pagamento, deleted_at)
  └── contratos (id, projeto_id, nome, tipo, status, valor)
  └── roteiros (id, projeto_id, status, texto)
       └── roteiro_cenas (id, roteiro_id, ordem, numero_cena, cabecalho, dia_id nullable)
  └── agenda_eventos (id, projeto_id, titulo, tipo, data_inicio, status, deleted_at)
  └── canais (id, projeto_id, departamento, nome)
       └── mensagens (id, canal_id, autor_id, autor_nome, tipo, conteudo, audio_path)
  └── locacoes (id, projeto_id, nome, endereco, maps_url, deleted_at)
  └── fornecedores (id, projeto_id, nome, tipo, cnpj, cpf)

pessoas (id, org_id, nome, email, telefone, departamento, funcao)
funcoes_av (id, nome, departamento, nivel)
memberships (id, user_id, org_id, papel, ativo)
editais (id, org_id, nome, orgao, prazo_prestacao_meses)
validacoes_edital (id, despesa_id, status, mensagem)
notificacoes_inapp (id, projeto_id, pessoa_email, titulo, mensagem, lida, criado_em)
```

---

## Migrations por sprint (resumo)

| Migration | Tema |
|-----------|------|
| 0001–0008 | Base, OD, check-in, comunicação |
| 0009 | Chat canais + mensagens + Realtime |
| 0023–0024 | Roteiro + decupagem IA + projeto_kpis |
| 0025 | Storage bucket comprovantes |
| 0030–0032 | Soft-delete geral, agenda, notif prefs |
| 0033 | Storage bucket mensagens-audio (Sprint 2A) |
| 0034 | pg_cron purge lixeira 30d (Sprint 2A) |
| 0035 | Trigger populate_proximos_eventos (Sprint 2B) |
| 0036 | Stripboard: dia_id em roteiro_cenas (Sprint 2C) |
| 0037 | Multi-função: tabela projeto_pessoa_funcoes + trigger sync principal (Sprint 3A) |
| 0038 | despesas.fornecedor_id (FK) + status 'paga' + reload schema cache (Sprint 3B) |

---

## Edge Functions deployadas

| Função | Trigger | Secrets necessários |
|--------|---------|---------------------|
| `send-email` | POST manual ou outras funções | GMAIL_USER, GMAIL_APP_PASSWORD, GMAIL_FROM_NAME, EDGE_SHARED_SECRET |
| `notificar-od` | CallSheetEditor ao publicar OD | EDGE_SHARED_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY |
| `analisar-roteiro` | Roteiro.tsx ao enviar arquivo | — |
| `ocr-extract` | Finance.tsx upload comprovante | — |
| `aceitar-convite` | InviteAccept.tsx | — |

**VITE_EDGE_SHARED_SECRET** precisa ser adicionado no `.env` local para notificação de email funcionar ao publicar OD em produção.

---

## Variáveis de ambiente (.env local)

```env
VITE_SUPABASE_URL=https://dsrulpipsksvtskqwevc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  (não expor)
VITE_EDGE_SHARED_SECRET=...    (mesmo valor do EDGE_SHARED_SECRET no Supabase Secrets — PENDENTE adicionar)
```

---

## Storage buckets ativos

| Bucket | Público | Uso |
|--------|---------|-----|
| `comprovantes` | Não (privado) | NFs e comprovantes de despesas |
| `mensagens-audio` | Sim | Áudio do chat de comunicação |

---

## RBAC — papéis e permissões

| Papel no projeto | `canEdit` | Command Center view |
|-----------------|-----------|---------------------|
| owner | ✅ | DPView |
| admin | ✅ | DPView |
| producao | ✅ | DPView (produtor) |
| departamento | ❌ | ADView |
| leitor | ❌ | CollaboratorView |

Páginas com RBAC no front: Team, Finance, CallSheets, Locations

---

## Gaps remanescentes (Sprint 3+)

1. **VITE_EDGE_SHARED_SECRET** — adicionar no `.env` para email ao publicar OD funcionar
2. ~~**Roles cinematográficos explícitos**~~ — ✅ RESOLVIDO na Sprint 3A: hook useProjectFunction lê função principal; DirectorView/ContinuityView/CastView/PostView por departamento de função
3. **Contrato → Gov.br** — upload PDF + link assinatura digital
4. **Organograma visual** — por departamento na página Equipe
5. **Módulo Continuidade** — tabela de takes/status por cena para Continuísta
6. **Paginação** — queries sem paginação, crítico acima de 100 registros
7. **Exportação prestação PDF** — relatório de despesas como PDF
8. **Convite por email ponta-a-ponta** — não testado em produção (limite 3/h plano free Supabase)
9. **OCR específico NF** — Tesseract genérico, sem parser específico para Nota Fiscal
10. **DIT / Fluxo de mídia** — módulo para gerenciar arquivos de câmera por dia
11. **ProjectDetail.tsx órfã (código morto)** — `App.tsx` redireciona `/projetos/:id` → `dashboard` (Command Center); não há rota que renderize a ProjectDetail. A tela tinha cards de resumo (dias de filmagem, orçamento, já gasto) hoje inacessíveis. Decidir: restaurar uma rota/aba "Visão geral" reaproveitando esses cards, ou remover o arquivo. O botão de excluir já foi migrado pro Settings.

---

## Caça-bugs em aberto (sessão 05/06/2026)

O Thiago está usando o app e relatando "comportamentos estranhos" um a um. Status:

| Bug relatado | Causa-raiz | Status |
|---|---|---|
| Modal de adicionar integrante sem rolagem | falta `max-h-[90vh] overflow-y-auto` no modal | ✅ corrigido (e8c059f) |
| Tela trava + erro 400 ao salvar projeto | `<SelectItem value="">` no select de edital + `""` em coluna uuid | ✅ corrigido (873688f) |
| "Sumiu" o botão de excluir projeto | ProjectDetail órfã (rota redireciona pro Command Center) | ✅ contornado: botão recriado no Settings (5112ce5) |
| (próximos) | — | ⏳ Thiago vai trazer mais na próxima sessão |

**Como retomar a caça:** para cada bug novo, pedir ao Thiago: tela/módulo + o que fez vs. esperado + o vermelho do Console (F12). Triar em: (a) bug pré-existente, (b) regressão de 3A/3B/3B.5, (c) falta de implementação. Fixes pequenos: editar direto no Cowork; grandes: Claude Code.

---

## Programas e ferramentas utilizados

| Ferramenta | Uso | Como acessar |
|-----------|-----|-------------|
| Claude Cowork | Análise, planejamento, geração de código via bash | Este app |
| Claude Code (CLI) | Implementação de código grande no terminal | PowerShell → `cd cineflow-mvp` → `claude` |
| Vercel | Deploy do front-end | `vercel --prod` no PowerShell |
| Supabase | Banco PostgreSQL + Auth + Storage + Edge Functions | supabase.com → projeto Glauber |
| GitHub | Versionamento | github.com/thitho0-tech/Glauber |
| PowerShell | Terminal Windows | Usar `;` não `&&` |

---

## Como continuar numa próxima sessão

1. Abrir Claude Cowork → projeto Glauber
2. Ler este arquivo (`SPRINT_STATE.md`) para contexto completo
3. Verificar se há pendências manuais (SQL a rodar, .env a atualizar)
4. Propor próxima sprint com base nos gaps listados acima
5. Próximo tema sugerido: **3B stretch** (obs 12: separar Configurações usuário×projeto; prestação PDF + paginação Finance — itens 3B.5/3B.6 da SPRINT_3B_SPEC.md) **ou Sprint 3C — Documentos & Logística**: PDF decupagem/roteiro (16), PDF da OD (17), módulo Mapa de Transporte (18) + PDF (19). A coluna LOGÍSTICA da matriz já está reservada.

