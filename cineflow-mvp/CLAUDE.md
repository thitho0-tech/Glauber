# GLAUBER — Contexto Técnico (cineflow-mvp)

> Para Claude Code e para operações de código. Leia junto com `../CLAUDE.md`.
> Última atualização: 30/06/2026

---

## STACK

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| UI | Tailwind CSS + shadcn/ui (Radix primitives) |
| Forms | React Hook Form + Zod |
| State / Queries | TanStack Query (React Query) |
| Realtime | Supabase Realtime (postgres_changes + broadcast) |
| Backend | Supabase PostgreSQL 17 (RLS, triggers, RPCs) |
| Auth | Supabase Auth (email+senha; magic link; social login desativado) |
| Storage | Supabase Storage (buckets privados + signed URLs) |
| Edge Functions | Deno (Supabase Functions) |
| Deploy | Vercel (manual `vercel --prod`) |
| Versionamento | Git → GitHub (thitho0-tech/Glauber) |

---

## ESTRUTURA DE PASTAS

```
cineflow-mvp/
├── src/
│   ├── pages/          # 36 telas React (.tsx)
│   ├── components/
│   │   ├── dashboard/  # CommandCenter.tsx + views (DP/Director/AD/Collaborator)
│   │   ├── layout/     # Sidebar.tsx
│   │   ├── finance/
│   │   ├── auth/
│   │   └── ui/         # shadcn components
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useProjectRole.ts   # RBAC hook central
│   │   ├── usePermissions.ts   # pode() via minhas_permissoes()
│   │   ├── useProjectKPIs.ts   # KPIs com Realtime + polling 5s
│   │   └── useProjectDeptAccess.ts
│   ├── contexts/
│   ├── lib/
│   │   └── supabase.ts         # cliente Supabase
│   ├── types/
│   │   └── dashboard.ts        # ProjectKPIs, DashboardRole
│   └── index.css               # inclui @media print (PDF da OD)
├── supabase/
│   ├── migrations/     # 0001–0070 — NUNCA apagar; ordem importa
│   └── functions/
│       ├── send-email/         # Gmail SMTP — deploy com --no-verify-jwt
│       ├── notificar-od/       # Email ao publicar OD
│       ├── analisar-roteiro/   # Decupagem IA (Tesseract + Mistral)
│       ├── ocr-extract/        # Comprovantes fiscais
│       └── aceitar-convite/    # Fluxo sem login
├── .env                        # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY + VITE_EDGE_SHARED_SECRET
├── .env.example
├── vercel.json
└── package.json
```

---

## VARIÁVEIS DE AMBIENTE

```env
VITE_SUPABASE_URL=https://dsrulpipsksvtskqwevc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...   # não expor
VITE_EDGE_SHARED_SECRET=...     # mesmo valor do EDGE_SHARED_SECRET no Supabase Secrets
```

**Secrets no Supabase (Edge Functions):**
`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `GMAIL_FROM_NAME`, `EDGE_SHARED_SECRET`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

## SCHEMA — TABELAS PRINCIPAIS

```
projetos          (id, org_id, nome, tipo, periodo_inicio, periodo_fim,
                   orcamento_total, edital_id, status, deleted_at)
  └── dias_filmagem      (id, projeto_id, data, chamada_geral, locacao_id, status)
       └── ordens_do_dia (id, projeto_id, dia_id nullable, titulo, data,
                          tipo, publicada_em, versao, token_publico, status_aprovacao)
       └── escalas        (id, dia_id, pessoa_id)
       └── check_ins      (id, projeto_pessoa_id, dia_id, entrada, saida)

  └── projeto_pessoas    (id, projeto_id, pessoa_id, papel, funcao_av_id,
                          valor_contratacao, notif_od_inapp, notif_od_email, deleted_at)
       └── projeto_pessoa_funcoes (id, projeto_pessoa_id, funcao_av_id, principal)
                                   ← multi-função; trigger sync principal→pp.funcao_av_id

  └── projeto_kpis       (id, projeto_id, roteiro_filmado_pct,
                          orcamento_comprometido_pct, prazos_criticos[],
                          proximos_eventos[], updated_at)

  └── despesas           (id, projeto_id, linha_orcamento_id, fornecedor_id,
                          descricao, valor, data, status, comprovante_url,
                          cnpj_emitente, forma_pagamento, deleted_at)

  └── roteiros           (id, projeto_id, status, texto)
       └── roteiro_cenas (id, roteiro_id, projeto_id, ordem, numero_cena,
                          cabecalho, dia_id nullable, cena_id nullable)

  └── agenda_eventos     (id, projeto_id, titulo, tipo, data_inicio,
                          status, departamento, deleted_at)

  └── canais             (id, projeto_id, departamento, nome)
       └── mensagens     (id, canal_id, autor_id, autor_nome, tipo,
                          conteudo, audio_path)

  └── locacoes           (id, projeto_id, nome, endereco, maps_url,
                          lat, lng, deleted_at)
  └── fornecedores       (id, projeto_id, nome, tipo, cnpj, cpf)

pessoas            (id, org_id, nome, email, telefone, departamento, funcao)
                   ← NÃO tem user_id; vínculo auth via lower(email) match
funcoes_av         (id, nome, departamento, nivel)
memberships        (id, user_id, org_id, papel, ativo)
editais            (id, org_id, nome, orgao, prazo_prestacao_meses)
linhas_orcamento   (id, projeto_id, rubrica_id, descricao, valor_orcado)
rubricas           (id, edital_id, codigo, nome, teto, tipo)
validacoes_edital  (id, despesa_id, status, mensagem)
notificacoes_inapp (id, projeto_id, pessoa_email, titulo, mensagem, lida, criado_em)

-- Permissões composite (Sprint 5)
perm_recursos      (id, nome, descricao)
perm_funcao_grants (id, funcao_av_id, recurso_id, acoes[])
perm_overrides     (id, projeto_pessoa_id, recurso_id, conceder bool)
```

**Nomes de colunas críticos (armadilhas):**
- `ordens_do_dia.data` (NÃO `data_filmagem`)
- `projetos.periodo_inicio` (NÃO `data_inicio`)
- Vínculo auth: `lower(pessoas.email) = lower((select email from auth.users where id = auth.uid()))`
- `org_id` do usuário → `select org_id from memberships where user_id = auth.uid() and ativo = true`

---

## STORAGE BUCKETS

| Bucket | Público | Uso |
|--------|---------|-----|
| `comprovantes` | Não (privado) | NFs e comprovantes de despesas |
| `mensagens-audio` | Sim | Áudio do chat (Mural) |

---

## MODELO DE PERMISSÕES — função pode()

```sql
-- Verifica se usuário autenticado pode executar ação em recurso dentro do projeto
pode(recurso text, acao text, projeto_id uuid) → boolean
```

No front: hook `usePermissions` → método `.can(recurso, acao)`.
Dados via RPC `minhas_permissoes(projeto_id)`.

Recursos implementados (seed 0051): `od/publicar`, `od/aprovar`, `equipe/gerenciar`,
`despesas/editar`, `figurino_arte/aprovar`, `roteiro/editar`, `decupagem/editar`, etc.

---

## PADRÕES DE CÓDIGO

### Queries (React Query)
```tsx
const { data, isLoading } = useQuery({
  queryKey: ['chave', id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('tabela')
      .select('...')
      .eq('projeto_id', id)
    if (error) throw error
    return data
  }
})
```

### Mutations
```tsx
const mutation = useMutation({
  mutationFn: async (payload) => {
    const { error } = await supabase.from('tabela').insert(payload)
    if (error) throw error
  },
  onSuccess: () => qc.invalidateQueries({ queryKey: ['chave'] })
})
```

### Radix Select — ATENÇÃO
```tsx
// ❌ QUEBRA A TELA
<SelectItem value="">Nenhum</SelectItem>

// ✅ CORRETO — sentinela + conversão para null ao salvar
<SelectItem value="__none__">Nenhum</SelectItem>
// ao salvar: valor === '__none__' ? null : valor
```

### Social Login (DESATIVADO)
```tsx
// Em Login.tsx e Signup.tsx: flag controla visibilidade
const SOCIAL_LOGIN_ENABLED = false  // ← não mudar sem configurar providers
```

---

## COMANDOS ESSENCIAIS (PowerShell — NUNCA usar &&)

```powershell
# Entrar na pasta do código
cd "C:\Users\Thiago Franca\Documents\Claude\Projects\Glauber\cineflow-mvp"

# Checar erros de TS antes de deployar
npx tsc --noEmit

# Deploy de produção (SEMPRE --prod, não só vercel)
vercel --prod

# Git — sempre da RAIZ (não de cineflow-mvp)
cd "C:\Users\Thiago Franca\Documents\Claude\Projects\Glauber"
git add -A
git commit -m "descrição"
git push

# Deploy de Edge Function (send-email PRECISA do --no-verify-jwt)
supabase functions deploy send-email --no-verify-jwt
supabase functions deploy notificar-od --no-verify-jwt

# Se travar index.lock do git
Remove-Item "C:\Users\Thiago Franca\Documents\Claude\Projects\Glauber\.git\index.lock"
```

---

## MIGRATIONS — CONVENÇÃO

```
supabase/migrations/XXXX_nome_descritivo.sql
```

- Próxima: `0071_...`
- Sempre incluir `revoke execute on function nova_funcao from public, anon;`
  seguido de `grant execute on function nova_funcao to authenticated;`
- Triggers: revogar de todos (não executam via auth, só via evento)
- Testar com `execute_sql` (conector Supabase) antes de `apply_migration`

---

## DEPLOY — WORKFLOW COMPLETO

```
1. Editar código em cineflow-mvp/src/
2. npx tsc --noEmit          → 0 erros
3. cd Glauber/ (raiz)
4. git add -A
5. git commit -m "Sprint XX: descrição"
6. git push
7. cd cineflow-mvp/
8. vercel --prod             → aguardar URL de produção
9. Ctrl+Shift+R no browser   → testar build novo (limpa cache)
```

**Push no GitHub NÃO dispara deploy automático** — Vercel está em modo manual.
