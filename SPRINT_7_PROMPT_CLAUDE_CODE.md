# SPRINT 7 — Prompt para Claude Code (features pós-teste, Onda 3)

> Cole este arquivo inteiro no Claude Code (dentro de `cineflow-mvp`). São 4 features de
> front. Banco já preparado na Onda 2 (migrações 0063–0066 aplicadas em produção).

## Contexto e convenções (LEIA ANTES)
- Projeto **Glauber** (ex-Cineflow). Repo: raiz `...\Glauber`, código em `cineflow-mvp`.
- Supabase prod `dsrulpipsksvtskqwevc`. Front em Vite/React + TanStack Query + Tailwind + shadcn/ui.
- **Permissões:** hook `usePermissions().can(recurso, acao)`. Recursos/ações vêm da função
  `minhas_permissoes`. Gate de UI por `can('equipe','editar')`, `can('od','editar')` etc.
- **Membership:** função SQL `is_membro_projeto(projeto_id)` (projeto_pessoas, `deleted_at is null`,
  match por e-mail). `pessoas` NÃO tem `user_id`; vínculo auth por e-mail.
- **Radix `<SelectItem>` nunca com `value=""`** — use sentinela (ex.: `"__none__"`) e converta p/ null.
- **Antes de cada deploy:** `npx tsc --noEmit` (PowerShell, sem `&&`). **Deploy real = `vercel --prod`**
  (push no GitHub NÃO faz deploy). Commit a partir da **raiz** do repo (`git add -A`).
- Datas/hora: armazenar e exibir a hora "de parede" sem conversão de fuso (ver `formatDataHora`
  em ProjectDashboard e `data_inicio.slice(11,16)` na Agenda — manter consistente).

---

## Feature 1 — Editar membro da equipe (T7)  [PRIORIDADE: resolve raiz de bug]
**Problema:** hoje, para corrigir a função de alguém, o usuário precisa REMOVER e ADICIONAR de novo,
o que gerava resíduo (já mitigado no banco pela migração 0066, que limpa derivados no soft-delete).
A solução definitiva é **poder editar** o membro sem remover.

**Onde:** `src/pages/Team.tsx` (form "Adicionar pessoa", const `DEPARTAMENTOS_AV`) e/ou `Settings.tsx`
(lista de membros). Reaproveite o MESMO formulário de adicionar para o modo edição.

**O que fazer:**
- Botão/ação **"Editar"** por linha de membro, visível se `can('equipe','editar')`. Nunca permitir
  editar/remover o criador do projeto na linha dele (já existe regra para "remover"; replicar).
- Abrir o form preenchido e permitir alterar: **departamento, função (funcao_av_id), papel/descrição,
  e os campos de dados que o form de adicionar já tem** (não o e-mail, que é a chave de vínculo —
  deixar e-mail somente-leitura no modo edição).
- Salvar = `update` em `projeto_pessoas` (funcao_av_id, papel_descricao/ papel_projeto, departamento se
  houver) **e** atualizar `projeto_pessoa_funcoes` (a função `principal`). NÃO criar novo registro.
- Invalidar as queries de equipe após salvar.

**Aceite:** trocar a função de um membro pela edição NÃO cria novo `projeto_pessoas` nem deixa função
antiga; a Agenda/permissões refletem a nova função.

---

## Feature 2 — Escalar ator: listar só quem é ator (T9)
**Onde:** `src/pages/Cast.tsx` (escalação de personagens). Verifique como hoje se monta a lista de
pessoas selecionáveis ao escalar um personagem.

**O que fazer:** ao escolher quem interpreta um personagem, **filtrar a lista para pessoas cujo
departamento/função seja Elenco** (em `funcoes_av.departamento = 'elenco'` via
`projeto_pessoa_funcoes → funcoes_av`, ou `projeto_pessoas.papel_projeto = 'ator'` — use o que o
schema já adota; confira). Não listar equipe técnica.

**Aceite:** o seletor de "quem interpreta" mostra apenas atores cadastrados no projeto.

---

## Feature 3 — OD: vincular cena do roteiro + atores (T10)
**Onde:** `src/pages/CallSheetEditor.tsx` (editor da Ordem do Dia).

**Contexto de dados:** a "decupagem" real são as `roteiro_cenas` (NÃO a tabela `decupagem`, que é
shot list). Personagens ligam a `projeto_pessoas` via `personagem_id`. Verifique se já existe tabela
de vínculo OD×cena (procure por `od_cenas`); **se não existir, crie uma migração**
`00XX_od_cenas.sql` com `od_cenas(id, od_id, roteiro_cena_id, ordem)` + RLS por `is_membro_projeto`
do projeto da OD (siga o padrão das policies existentes).

**O que fazer:**
1. No formulário de preenchimento da OD, permitir **selecionar uma ou mais cenas do roteiro**
   (`roteiro_cenas` do projeto) para o dia.
2. Ao vincular as cenas, **exibir os atores escalados** nessas cenas (via personagens da cena →
   `projeto_pessoas`), para compor a chamada do dia. Permitir confirmar/ajustar a lista.
3. Refletir as cenas/atores vinculados no PDF/within do `PublicCallSheet` se fizer sentido.

**Aceite:** ao montar a OD, dá para puxar as cenas do roteiro e ver os atores daquelas cenas.

> Esta é a feature mais aberta. Se o vínculo cena→personagem→ator ainda não existir no schema,
> proponha a migração mínima e confirme comigo (Thiago) antes de aplicar via SQL Editor.

---

## Feature 4 — Login social Google e Facebook (T13)
**Onde:** `src/pages/Login.tsx` e `Signup.tsx` (hoje usam `signInWithPassword` + `signInWithOtp`).

**Front:** adicionar botões "Entrar com Google" e "Entrar com Facebook" chamando
`supabase.auth.signInWithOAuth({ provider: 'google' | 'facebook', options: { redirectTo: <APP_URL>/ } })`.
Tratar o retorno/sessão como o fluxo OTP já trata.

**Config (Thiago faz no painel — sem isto os botões dão erro):**
- Supabase → Authentication → Providers → **Google**: habilitar, colar Client ID/Secret do
  Google Cloud Console (OAuth 2.0, Authorized redirect URI =
  `https://dsrulpipsksvtskqwevc.supabase.co/auth/v1/callback`).
- Idem **Facebook**: app no Meta for Developers (Facebook Login), App ID/Secret, mesmo redirect.
- Adicionar `https://glauber.app.br` em Authentication → URL Configuration (Site URL / Redirect URLs).

**Aceite:** botões aparecem; com os providers configurados, login social cria/loga o usuário.

---

## Ao terminar
1. `npx tsc --noEmit` (0 erros).
2. `vercel --prod`.
3. Commit da raiz: `git add -A; git commit -m "Sprint 7: editar membro, filtro de atores, OD x cena/atores, login social"`.
4. Avise o Thiago o que ficou pendente de config manual (providers OAuth).
