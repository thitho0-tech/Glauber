# PROMPT — Claude Code · Leva 2 pós-teste (24/06/2026)

Você está em `cineflow-mvp` (repo Glauber, React + Vite + Supabase). Implemente os 3 itens abaixo
em um único ciclo: código → `npx tsc --noEmit` (0 erros) → commit → `vercel --prod`.
Migração SQL: criar o arquivo em `supabase/migrations/` e aplicar (db push / SQL Editor).

Regras do projeto: PowerShell não aceita `&&`; `git commit` sempre com `-m`; Radix `<SelectItem>`
nunca com `value=""` (usar sentinela e converter para null); `pessoas` NÃO tem `user_id`
(vínculo por email). Push no GitHub não dispara deploy — só `vercel --prod`.

---

## ITEM 5 — Clicar no evento destacado do Mural abre o detalhe na Agenda

**Hoje:** em `src/pages/ProjectDashboard.tsx`, o card de "Próximos eventos" é um `<div>` não-clicável
(por volta da linha 449, dentro de `eventosFiltrados.map(...)`).

**Fazer:**
1. No `ProjectDashboard.tsx`, transformar cada card de evento em um link/clicável que navega para
   `/projetos/${projetoId}/agenda?evento=${ev.id}` (usar `Link` do react-router-dom ou `useNavigate`).
   Adicionar `cursor-pointer` e manter o `hover:bg-muted/40` que já existe.
2. Em `src/pages/Agenda.tsx`:
   - Importar `useSearchParams`.
   - Após `eventos` carregar (query `agenda_eventos`), num `useEffect` que depende de `[eventos, searchParams]`:
     ler `searchParams.get("evento")`; se houver e existir `ev` em `eventos` com `ev.id === param`,
     chamar `setDetalhe(eventoToCalItem(ev))` e limpar o param da URL
     (`setSearchParams({}, { replace: true })`) para não reabrir ao fechar.
   - `eventoToCalItem` e o estado `detalhe` (linha ~515) e o `DetalheDialog` já existem; só dispará-los.

**Aceite:** clicar num evento do Mural leva à Agenda com o diálogo de detalhes daquele evento já aberto.

---

## ITEM 4 — Som de alerta para novas notificações

**Hoje:** `src/components/NotificationBell.tsx` usa polling (`refetchInterval: 30_000`) na tabela
`notificacoes_inapp`; não há som nem realtime.

**Fazer:**
1. Adicionar uma assinatura **realtime** em `NotificationBell.tsx`: `supabase.channel("notif:"+userId)`
   com `postgres_changes` `INSERT` em `public.notificacoes_inapp` filtrando pelo destinatário do usuário
   logado (conferir a coluna de destino da tabela — provavelmente `pessoa_id` ou `destinatario_id`;
   ler o schema antes). No callback: `qc.invalidateQueries` da query do sino **e** tocar o som.
2. Som sem depender de asset: usar Web Audio API para um "beep" curto (≈0.15s, sine 880Hz, volume baixo).
   Encapsular em `playBeep()` com try/catch (autoplay pode ser bloqueado antes da 1ª interação — silenciar erro).
3. Toggle de preferência: em `src/pages/Settings.tsx` (que já mexe com notificações), adicionar um switch
   "Som ao receber notificação" persistido em `localStorage` (`glauber_notif_som`, default `true`).
   `playBeep()` só toca se a preferência estiver ligada.
4. Limpar o canal no cleanup do `useEffect` (`supabase.removeChannel`).

**Aceite:** ao chegar uma notificação nova (ex.: novo evento, OD), o sino atualiza na hora e toca um beep,
respeitando o toggle em Settings.

---

## ITEM 7 — Isolamento por projeto: função do catálogo (corrige exibição E permissões)

**Causa-raiz confirmada:** a criação de projeto usa a RPC `criar_projeto_com_equipe`, que (a) reusa a
mesma `pessoas` por e-mail dentro da produtora, herdando a `pessoas.funcao` antiga, e (b) grava a função
nova só como texto livre em `projeto_pessoas.papel_descricao` — **nunca** em `funcao_av_id` nem em
`projeto_pessoa_funcoes`. A tela (`Team.tsx` `getPrincipalFuncao`) cai no fallback `pessoa.funcao` (global,
compartilhado entre projetos) e mostra a função antiga; e as permissões (`pode()` via `funcao_av_id`)
ficam quebradas. Cada projeto deve ser independente.

### 7.1 — Front: função vira seleção do catálogo na "Equipe Principal"

`src/components/EquipePrincipalImport.tsx` + `src/lib/parseTeamCsv.ts` + `src/pages/Projects.tsx`:

- Adicionar `funcao_av_id?: string` ao tipo `TeamRow` (em `parseTeamCsv.ts`).
- Em `Projects.tsx`, passar a lista `funcoesAv` (já carregada na query `funcoes-av`, linhas ~62-73) para
  `<EquipePrincipalImport funcoes={funcoesAv} ... />`.
- Em `EquipePrincipalImport.tsx`, na coluna "Função no projeto" da tabela (linha ~188), trocar o `<Input>`
  de texto livre por um **Select com busca** do catálogo `funcoes_av` (agrupar por `departamento`,
  ordenar por `nivel`; mostrar `nome`). Guardar `funcao_av_id` na linha. Manter o texto livre importado
  do CSV/OCR apenas como **dica/placeholder** (ex.: tentar pré-selecionar por match aproximado de `nome`,
  mas a seleção definitiva é do usuário). NUNCA `<SelectItem value="">`.
- Em `Projects.tsx` `criar` mutation, montar `equipeLimpa` incluindo `funcao_av_id` por linha
  (em vez de mandar só `funcao` texto).

### 7.2 — Migração: RPC passa a gravar função por projeto

Criar `supabase/migrations/0070_equipe_funcao_catalogo.sql` (a 0069 já existe = send_email_timeout_15s)
reescrevendo `criar_projeto_com_equipe` para:

- Ler `v_funcao_av_id := nullif(v_membro->>'funcao_av_id','')::uuid` de cada membro.
- Ao criar/reusar `pessoas`: **NÃO** setar `pessoas.funcao` (deixar null; ela é global e não deve carregar
  papel de projeto). Manter reuso por (org, email) só para dados cadastrais (nome/contato), não para função.
- No `insert ... projeto_pessoas`: setar `funcao_av_id = v_funcao_av_id` (além de `papel_descricao`
  opcional como rótulo livre).
- Após o vínculo, inserir em `projeto_pessoa_funcoes (projeto_pessoa_id, funcao_av_id, principal)`
  values (v_pp_id, v_funcao_av_id, true) quando `v_funcao_av_id` não for null
  (idempotente: `on conflict do nothing` ou checar duplicidade).
- Preservar hardening: `revoke execute ... from public, anon; grant execute ... to authenticated`.

### 7.3 — Display: parar de usar a função global

`src/pages/Team.tsx`, `getPrincipalFuncao` (linha ~134):
`return p?.funcao_av?.nome ?? v.pessoa?.funcao ?? null;`
→ trocar o fallback global por:
`return p?.funcao_av?.nome ?? v.papel_descricao ?? null;`
(idem em `getPrincipalDept`, linha ~140: usar `funcao_av?.departamento`, sem cair em `pessoa.departamento`
se isso também vazar entre projetos — avaliar).

### 7.4 — Backfill (no mesmo arquivo de migração, ao final)

Para vínculos já existentes com `funcao_av_id IS NULL` mas `papel_descricao` preenchido, tentar casar
`papel_descricao` com `funcoes_av.nome` (case-insensitive, unaccent se disponível) e popular `funcao_av_id`
+ `projeto_pessoa_funcoes`. Os que não casarem ficam null (o usuário corrige na tela "Editar membro").
Não tocar em `pessoas.funcao` (deixar como está; só paramos de exibi-la).

**Aceite:** criar um novo projeto e cadastrar a mesma pessoa com função diferente → a tela mostra a função
do NOVO projeto, e as permissões (`usePermissions.can`) correspondem à nova função, sem herdar nada do
projeto anterior.

---

## Fechamento (obrigatório)
1. `npx tsc --noEmit` → 0 erros.
2. `git add -A` (na RAIZ do repo) → `git commit -m "Leva 2: clique evento Mural->Agenda, som notificacao, funcao por projeto (0070)"`.
3. Aplicar a migração 0070 no banco.
4. `vercel --prod` em `cineflow-mvp/`.
5. Resumir o que mudou e o que precisa de reteste manual.
