# BRIEF — Sprint 1D: "Segurança de Dados & Agenda"
**Data:** 27/05/2026  
**Autor:** Claude (consultor de implementação)  
**Base:** 8 decisões de produto respondidas + gap analysis pós-Sprint 1C  
**Deploy alvo:** glauber.app.br via `vercel --prod`  
**Prioridade máxima:** Lixeira + Soft-delete (gap de segurança grave identificado)

---

## Contexto

Com as 8 decisões respondidas, dois temas dominam este sprint:

1. **Segurança de dados** — o app hoje apaga itens permanentemente sem recuperação. Para qualquer usuário real, perder uma despesa, um dia de filmagem ou uma OD por engano é crítico. Isso precisa ser resolvido antes de qualquer demonstração séria.

2. **Agenda simples** — ODs só se aplicam a dias de filmagem. Todos os outros eventos (ensaios, reuniões, visitas de locação, testes) precisam de um módulo leve de agenda que não exija o peso de uma OD completa.

**Nenhuma das tarefas deste sprint exige decisão adicional sua** — todas as escolhas foram respondidas na sessão anterior.

---

## Tarefas em ordem de execução

### D1 — Git commit das sprints 1B e 1C (você faz, 5 min)
**Por quê primeiro:** As sprints 1B e 1C nunca foram commitadas. O git HEAD ainda é a versão pré-1B. Se algo der errado no Vercel ou você precisar voltar no histórico, o trabalho das últimas duas sprints está em risco.

**Comando no PowerShell** (dentro de `cineflow-mvp/`):
```powershell
git add .
git commit -m "Sprint 1B + 1C: modulos completos, polimento e fluxos"
git push
```

**Você precisa fazer isso antes de começarmos o código deste sprint.**

---

### D2 — Soft-delete + Lixeira geral ⚠️ PRIORIDADE MÁXIMA
**Migration:** `0030_soft_delete.sql`

Adicionar `deleted_at timestamptz default null` nas tabelas principais. Quando `deleted_at IS NOT NULL`, o item está na lixeira. Após 30 dias, um job `pg_cron` limpa definitivamente.

**Tabelas afetadas:**
- `projetos` (já tem 2FA para excluir — agora vira soft-delete)
- `despesas`
- `dias_filmagem`
- `ordens_do_dia`
- `projeto_pessoas`
- `locacoes`

**RLS:** Todas as queries existentes ganham `.is("deleted_at", null)` automaticamente via policy ou view. Itens com `deleted_at` não aparecem nas listagens normais.

**Nova página:** `/lixeira` acessível nas Settings ou menu global — lista todos os itens excluídos de todos os projetos do usuário, agrupados por tipo, com botão "Restaurar" e botão "Excluir definitivamente". Botão "Esvaziar lixeira" no topo (útil para testes).

**Job de limpeza automática:**
```sql
-- pg_cron: rodar todo dia à meia-noite
select cron.schedule('limpar-lixeira', '0 0 * * *', $$
  delete from projetos where deleted_at < now() - interval '30 days';
  delete from despesas where deleted_at < now() - interval '30 days';
  -- etc.
$$);
```

**Impacto nos componentes existentes:** Em Finance.tsx, Team.tsx, Schedule.tsx, CallSheets.tsx — o botão "Excluir" passa a fazer soft-delete (setar `deleted_at = now()`) em vez de `delete`. Toast muda para "Movido para a lixeira. Restaurar?"

---

### D3 — Agenda simples (módulo novo)
**Migration:** `0031_agenda_eventos.sql`

```sql
create table public.agenda_eventos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  tipo text not null,  -- texto livre: "ensaio", "reunião", "visita de locação", "teste de figurino", etc.
  titulo text not null,
  data_inicio timestamptz not null,
  data_fim timestamptz,
  periodo text check (periodo in ('dia', 'semana', 'mes')) default 'dia',
  local text,
  descricao text,
  deadline date,
  status text check (status in ('agendado', 'realizado', 'cancelado')) default 'agendado',
  criado_por uuid references auth.users(id),
  criado_em timestamptz default now(),
  deleted_at timestamptz default null
);

-- Tabela de participantes do evento
create table public.agenda_participantes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.agenda_eventos(id) on delete cascade,
  projeto_pessoa_id uuid references public.projeto_pessoas(id),
  confirmado boolean default false
);
```

**Nova página:** `/projetos/:id/agenda` — lista de eventos em formato de agenda (agrupados por data), com botão "+ Novo evento". Formulário simples: tipo (text com sugestões), título, data/hora início, data/hora fim, local, pessoas (multiselect da equipe do projeto), deadline, descrição.

**Atalho:** Adicionar "Agenda" no array `atalhos` de `ProjectDetail.tsx` e no Sidebar do projeto.

**Integração com Cronograma:** No `Schedule.tsx`, eventos de agenda aparecem como marcadores leves (não como dias de filmagem) — distinção visual clara (cor diferente, ícone diferente).

---

### D4 — Notificações configuráveis por usuário
**Migration:** `0032_notif_prefs.sql`

```sql
alter table public.projeto_pessoas
  add column notif_od_inapp boolean default true,
  add column notif_od_email boolean default false;
```

**Settings.tsx:** Nova aba "Notificações" dentro das configurações do projeto — toggle "Receber sino quando OD for publicada" e toggle "Receber email quando OD for publicada". Valores salvos em `projeto_pessoas` para o usuário logado naquele projeto.

**CallSheetEditor.tsx:** Ao publicar uma OD (botão "Publicar"), disparar:
1. Inserir linha em tabela `notificacoes_inapp` para cada membro com `notif_od_inapp = true`
2. Chamar Edge Function `notify-od-published` via Supabase para cada membro com `notif_od_email = true` (envia email via Resend)

**Sino in-app:** Ícone de sino no header (Sidebar ou Navbar) com badge de contagem. Clicar abre dropdown com lista das últimas notificações. Marcar como lida ao clicar.

**Email via Resend:** Requer que você forneça a API Key do Resend (resend.com/api-keys) e o domínio remetente (`noreply@glauber.app.br` ou similar). Eu preparo a Edge Function, você coloca a variável de ambiente no Vercel (`RESEND_API_KEY`).

---

### D5 — Função do organograma: departamento obrigatório
**Arquivo:** `src/pages/Team.tsx`  
**Mudança:** No formulário de adicionar/editar membro da equipe, quando o usuário preencher o campo "Função", o campo "Departamento" passa a ser obrigatório (não pode salvar sem departamento se tiver função). Se não preencher função, departamento continua opcional.

Isso não exige migration — é validação de formulário no front-end. O campo `funcao_av_id` em `projeto_pessoas` já existe (pode ser null = função não informada).

**Select de Departamento:** 9 opções fixas (do organograma): Desenvolvimento, Direção, Produção, Fotografia, Arte, Som, Elenco, Logística, Pós-produção.

**Select de Função:** populado dinamicamente pelo banco (`funcoes_av`) filtrado pelo departamento selecionado. Se o usuário quiser uma função fora do organograma, pode digitar livremente no campo `funcao` (text) sem vincular ao `funcao_av_id`.

---

### D6 — Build check + git commit + vercel --prod
**Você executa:**
```powershell
cd C:\Users\Thiago Franca\Documents\Claude\Projects\Glauber\cineflow-mvp
git add .
git commit -m "Sprint 1D: lixeira, agenda, notificacoes"
git push
vercel --prod
```

---

## Migrações necessárias (você cola no Supabase SQL Editor)

| Arquivo | Conteúdo | Quando aplicar |
|---|---|---|
| `0030_soft_delete.sql` | Colunas `deleted_at` + RLS updates + pg_cron job | Antes de D2 |
| `0031_agenda_eventos.sql` | Tabelas `agenda_eventos` + `agenda_participantes` | Antes de D3 |
| `0032_notif_prefs.sql` | Colunas `notif_*` em `projeto_pessoas` + tabela `notificacoes_inapp` | Antes de D4 |

**Total: 3 migrations.** Todas simples — sem refatoração de schema existente.

---

## O que você precisa preparar antes de executar

1. **Git commit** (D1) — fazer antes de qualquer coisa
2. **Resend API Key** para D4 — acessar resend.com/api-keys, criar uma key com nome "Glauber Production" e guardar o valor. Vou pedir quando chegar em D4.
3. **Domínio remetente** no Resend — verificar se `glauber.app.br` já está configurado como domínio no Resend (painel Resend → Domains). Se não, orientarei como adicionar.

---

## Estimativa

| Tarefa | Esforço | Quem |
|---|---|---|
| D1 — Git commit | 5 min | Thiago |
| D2 — Soft-delete + Lixeira | 3-4h | Claude |
| D3 — Agenda simples | 2-3h | Claude |
| D4 — Notificações | 2-3h | Claude + Thiago (Resend key) |
| D5 — Função + departamento | 30min | Claude |
| D6 — Build + deploy | 10min | Thiago |

**Total:** ~8-10h de implementação + ~20 min de ações suas.

---

## Critérios de aceite

1. **D2:** Clicar "Excluir" em qualquer despesa → item some da lista + toast "Movido para a lixeira". Acessar `/lixeira` → item aparece. Clicar "Restaurar" → volta para a lista. Clicar "Excluir definitivamente" → gone for good.
2. **D2:** Excluir projeto → vai para lixeira (não apaga imediatamente). Lixeira mostra o projeto com botão restaurar.
3. **D3:** Entrar em qualquer projeto → atalho "Agenda" visível. Criar evento "Ensaio" com data, local e 3 pessoas → aparece na listagem. Editar e cancelar funcionam.
4. **D4:** Nas Settings do projeto, toggle de notificação visível. Publicar OD → sino acende para membros com notif_inapp ativo.
5. **D5:** Ao adicionar membro com função preenchida → campo departamento é obrigatório e bloqueia salvar se vazio.
6. **D6:** Build limpo, zero erros, deploy em produção.

---

## Nota sobre próximos sprints

Com Sprint 1D concluída, o app estará **pitch-ready** — seguro, com agenda funcional e notificações. O sprint seguinte (1E) pode focar em:
- Dados de demo realistas para a apresentação do Porto Digital
- RBAC visível no front-end (botões destrutivos somem para viewers)
- Responsividade mobile nas tabelas principais

**LEMBRETE:** Ao finalizar Sprint 1D, rodar `vercel --prod` no PowerShell dentro de `cineflow-mvp/`.
