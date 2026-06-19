# C4 — Brief de Kickoff: Fusão Agenda + Planejamento

> **Para começar o C4 numa task nova:** ler, nesta ordem — `SPRINT_STATE.md`,
> este `C4_BRIEF_AGENDA.md`, e a seção "RELATÓRIO DO THIAGO" no fim (a preencher).
> As memórias do projeto (estado Sprint 5/6, backlog OD/Mural, campos do form da Agenda)
> também carregam automaticamente.

---

## 1. Estado do projeto ao iniciar o C4 (18/06/2026)

**Tudo abaixo está APLICADO e em PRODUÇÃO** (glauber.app.br), exceto onde indicado:

- **Segurança (Sprint 5):** modelo composite de permissões com `pode(projeto,recurso,acao)`
  no RLS (cutover aplicado), seed por função (matriz), `minhas_permissoes()`, owner
  permanente + trigger `protege_owner_pp`. Hardening anon concluído. Front lê via
  `usePermissions(projetoId).can(recurso,acao)`.
- **Features no ar:** aprovação de OD (C1) com alerta no sino; editar OD publicada + selo
  "ATUALIZADA" (C2); aprovação em Arte (figurinos/objetos) com diálogo "Avaliar"; status
  operacional de Arte (sugestao→pendente/adquirido/devolvido) e Locação (contato_pendente/
  contrato_ok); decupagem editável (roteiro_cenas) com vínculos para Elenco/Arte/Figurino/
  Locação; **C3 — Mural "Próximos eventos" personalizado** (filtro por participante/depto/
  alerta de OD; coluna `agenda_eventos.departamento` criada na 0061).
- **Migrações em prod:** 0001–0061 aplicadas. **PENDENTE só de commit no repo:** 0058–0061
  (aplicadas via conector; rodar `git add cineflow-mvp/supabase/migrations; git commit; git push`).
- **`0049_agenda_prep.sql` — PRONTA no repo, NÃO aplicada.** É a migração reservada do C4
  (ver seção 4).

---

## 2. Objetivo do C4

Fundir as duas sub-abas atuais de **Agenda** (`/agenda`) em **um único módulo de calendário
convencional**, com visualização **Dia / Semana / Mês**, e um **formulário único** de
atividade (sem campos redundantes).

**Estado atual da tela (`src/pages/Agenda.tsx`):** dois sub-tabs sobre duas tabelas —
- "Agenda" → `agenda_eventos` (reunião/ensaio/visita; tipos com restrição por depto).
- "Planejamento" → `dias_filmagem` (fases: pre_producao / dia_filmagem("Filmagem") / pos_producao;
  já tem toggle dia/semana/mes).

---

## 3. Decisões já confirmadas (não reabrir sem motivo)

1. **Não eliminar `dias_filmagem`** — é espinha dorsal de OD (`ordens_do_dia.dia_id`),
   escalas, check-ins e stripboard (`roteiro_cenas.dia_id`). A fusão é de UI/UX, não de dados.
2. **Classificação "Período de Produção"** (grava em `dias_filmagem`), 4 fases:
   `pre_producao` (Pré-produção), `producao` (Produção, NOVO), `dia_gravacao` (Dia de Gravação;
   renomeia o atual `dia_filmagem`/"Filmagem"), `pos_producao` (Pós-produção).
3. **Eventos pontuais** (reunião/ensaio/visita) seguem em `agenda_eventos`.
4. **Calendário único** Dia/Semana/Mês sobrepondo as duas fontes; sem os 2 sub-tabs.
5. **Visibilidade:** TODO o "Período de Produção" (as 4 fases) é visível a TODOS; só os
   **eventos pontuais** seguem o filtro personalizado do C3 (participante / departamento /
   alerta de OD). Owner/produção veem tudo.
6. **Formulário único** com `departamento` no evento (fecha o ciclo com o C3 — hoje eventos
   nascem sem depto). Campos preliminares (a CONFIRMAR no relatório): categoria
   (Evento × Período de Produção), tipo/fase, título, início, fim, chamada geral (só Dia de
   Gravação), local/locação, departamento, participantes, status, deadline, observações.
   (Memória: `project_glauber_agenda_form_fields`.)

---

## 4. Migração reservada `0049_agenda_prep.sql` (aplicar JUNTO do C4)

Conteúdo: (a) renomeia o valor `dia_filmagem`→`dia_gravacao` em `dias_filmagem.tipo`
(com novo check pre_producao/producao/dia_gravacao/pos_producao) — **quebra a aba
Planejamento atual até o front do C4 entrar**, por isso só roda junto; (b) adiciona
`agenda_eventos.departamento` (já aplicado à parte na 0061 — `if not exists`, idempotente).
⚠️ Conferir todos os usos do valor `'dia_filmagem'` no front antes (ex.: default em Agenda.tsx).

---

## 5. Pontas técnicas a verificar no início do C4

- `Schedule.tsx` (página antiga ainda importada no App.tsx) e `PlanejamentoDetalhe.tsx`
  (`/cronograma/:diaId`): decidir se a rota de detalhe do dia continua ou é absorvida.
- Caminho `projeto_id` para visibilidade já existe em `agenda_eventos` (direto) e
  `dias_filmagem` (direto).
- Reusar o estado `periodo` (dia/semana/mes) que já existe na aba Planejamento.
- Manter o protocolo Radix Tabs (`data-[state=inactive]:hidden`) se ainda houver tabs.

---

## 6. Faseamento sugerido do C4

1. **Migração:** aplicar `0049` (rename + departamento) — só no mesmo deploy do front.
2. **Front (Claude Code):** calendário único Dia/Semana/Mês; formulário único (com
   departamento); roteamento das categorias (Período de Produção→`dias_filmagem`,
   Evento→`agenda_eventos`); visibilidade conforme decisão 5.
3. **Validar** com o C3 (eventos com departamento agora filtram no Mural).

---

## 7. RELATÓRIO DO THIAGO — módulos da Agenda (a preencher)

1- Categoria — "Evento" ou "Período de Produção" (define onde grava e quais campos aparecem).
2- Tipo / Fase — se Evento: reunião, ensaio, visita de locação, TESTE DE ELENCO, MONTAGEM, FOLGA, (tipos atuais, restritos por depto); se Período de Produção: Pré-produção, Produção, Dia de Gravação (SE DIA DE GRAVAÇÃO, AO SALVAR NA AGENDA, GERA BOTÃO DE CRIAR OD), Pós-produção.
3- Título.
4- Início e Fim (OBRIGATÓRIO) — data/hora.
5- Chamada geral (horário) — aparece quando for "Dia de Gravação".
6- Local / Locação — seleção das locações cadastradas, com opção de texto livre.
7- Departamento (OPCIONAL)— usado pelo filtro de visibilidade; default = departamento de quem cria. (Itens de "Período de Produção" são visíveis a todos, independente disso.)
8- Participantes — multiseleção da equipe (OBRIGATÓRIO O PREENCHIMENTO DE, AO MENOS, MAIS UMA PESSOA; ADIONAR OPÇÃO DE MARCAR TODOS).
9- Status — agendado / realizado / cancelado.
10- Descrição
11- Observações

O que foi fundido/removido por ser redundante: "Descrição" e "Observações" viraram um campo só (não fundir, manter os dois campos); "data_fim" único; e o seletor Dia/Semana/Mês saiu do formulário — passa a ser o controle de visualização do calendário, não um campo da atividade. ADICIONAR BOTÃO PARA CONFIRMAÇÃO DE VISUALIZAÇÃO DO EVENTO; QUANDO CONFIRMADO A VIZUALIZAÇÃO, O NOME DE QUEM CONFIRMOU FICA REGISTRADO NOS DETALHES DO EVENTO MARCADO NA AGENDA. QUANDO O EVENTO FOR PARA O "MURAL" COMO VISUALIZAÇÃO RÁPIDA, DESTACAR APENAS "TÍTULO", "DATA" E "DESCRIÇÃO". aS INFORMAÇÕES DETALHADAS DO EVENTO MARCADO EM AGENDA SÃO VISIVEIS APENAS NA ABA "AGENDA" 

