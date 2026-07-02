# Glauber — Arquitetura Técnica

> Última atualização: 30/06/2026

## Stack Resumida

```
Frontend:  React 18 + Vite + TypeScript + Tailwind + shadcn/ui
Backend:   Supabase (PostgreSQL 17 + Auth + Realtime + Storage + Edge Functions)
Deploy:    Vercel (frontend) — manual via `vercel --prod`
AI:        Mistral large (JSON mode) para decupagem; Tesseract para OCR
```

## Diagrama de Camadas

```
Browser (React SPA)
    │
    ├── TanStack Query (cache + sync)
    ├── Supabase JS Client (auth + db + realtime + storage)
    └── shadcn/ui + Tailwind (UI)
         │
         ▼
Supabase (sa-east-1 / dsrulpipsksvtskqwevc)
    ├── PostgreSQL 17
    │   ├── RLS (Row-Level Security) — políticas por projeto/org
    │   ├── Funções PL/pgSQL (pode(), minhas_permissoes(), etc.)
    │   ├── Triggers (KPIs, notificações, proteções)
    │   └── Extensões: pg_cron, unaccent
    ├── Auth (JWT, email+senha, magic link)
    ├── Realtime (postgres_changes + broadcast)
    ├── Storage (buckets: comprovantes, mensagens-audio)
    └── Edge Functions (Deno)
         │
         ▼
Vercel (CDN global)
    └── glauber.app.br
```

## Multi-Tenancy

Isolamento por `org_id` (produtora). RLS em todas as tabelas sensíveis.
Dentro da org, isolamento por `projeto_id`.

```
auth.users → memberships (user_id, org_id) → pessoas (org_id)
                                           → projetos (org_id)
                                                └── [todas as tabelas de projeto]
```

## Modelo de Permissões (RBAC Composite — Sprint 5)

Três camadas combinadas na função `pode()`:

```
perm_overrides      ← override específico por pessoa/projeto (sobrescreve tudo)
perm_funcao_grants  ← permissão por função AV (Diretor, AD, DP, etc.)
[nega por padrão]   ← tudo que não for explícito é negado
```

Papéis no projeto: `owner > admin > producao > departamento > leitor`

RLS de leitura: quem é membro do projeto vê tudo.
RLS de escrita: via `pode(recurso, acao, projeto_id)`.

## Edge Functions

| Função | Runtime | Secrets necessários | Deploy |
|--------|---------|---------------------|--------|
| `send-email` | Deno | GMAIL_USER, GMAIL_APP_PASSWORD, GMAIL_FROM_NAME, EDGE_SHARED_SECRET | `--no-verify-jwt` |
| `notificar-od` | Deno | EDGE_SHARED_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | padrão |
| `analisar-roteiro` | Deno | — (usa Mistral/Tesseract) | padrão |
| `ocr-extract` | Deno | — | padrão |
| `aceitar-convite` | Deno | — | padrão |

## Realtime

Dois usos principais:
1. **KPIs do projeto** — `useProjectKPIs` assina `postgres_changes` na tabela `projeto_kpis` + polling 5s de fallback
2. **Chat (Mural)** — `mensagens` via `postgres_changes` por `canal_id`
3. **Notificações (sino)** — `notificacoes_inapp` via `postgres_changes` por `pessoa_email`

## Fluxo da OD (ordem do dia)

```
Criar OD → status "pendente"
    → Direção aprova (trigger notifica equipe) → status "aprovada"
    → AD publica → publicada_em = now(), token_publico gerado
    → Edge Function notificar-od envia email
    → Editar OD publicada → versao++, selo "ATUALIZADA", re-notifica
    → Link público /od/:token (sem login)
```

## Decupagem IA

```
Upload PDF roteiro
    → Edge Function analisar-roteiro
    → Tesseract OCR extrai texto
    → Mistral large (JSON mode) retorna:
       { cenas: [{ numero, cabecalho, personagens[], locacao, arte[], figurino[] }] }
    → Front cria registros em: roteiro_cenas, personagens, locacoes, arte_objetos, figurinos
    → Usuário edita e verifica; Re-decupar faz MERGE (não DELETE+INSERT)
```

## Storage

```
Bucket "comprovantes" (privado):
  comprovantes/{projeto_id}/{despesa_id}/{filename}
  Acesso: signed URL 7 dias, gerada via supabase.storage.createSignedUrl()

Bucket "mensagens-audio" (público):
  audio/{canal_id}/{message_id}.webm
```

## Decisões de Arquitetura Registradas

| Decisão | Escolha | Motivação |
|---------|---------|-----------|
| ORM | Supabase JS direto (sem Prisma) | Realtime + RLS nativos |
| State | TanStack Query (sem Redux/Zustand) | Server state é 95% do caso |
| Auth | Supabase Auth | Integração RLS zero-friction |
| Social Login | Desativado (flag) | Providers não configurados; reativar com `SOCIAL_LOGIN_ENABLED = true` |
| Deploy | Vercel manual | Auto-deploy desabilitado intencionalmente |
| Migrations | SQL manual no Dashboard ou apply_migration | `supabase db push` NUNCA usado |
| OCR | Tesseract (local na Edge Fn) | Sem custo de API; latência aceitável |
| AI decupagem | Mistral large JSON mode | Melhor resultado estruturado para domínio AV |
