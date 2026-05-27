# PLANO DE AÇÃO — GLAUBER em 40 DIAS

**Data:** 26/05/2026
**Deadline produção real:** ~05/07/2026
**Status:** MVP virou Protótipo. Rebrand CINEFLOW → Glauber. 4 auditorias de personas (Produtor, AD, Diretor, DP) na mão.

---

## 1. Leitura honesta da situação

Os 4 relatos de uso (Produtor, 1º AD, Diretor, DP) revelam algo claro: **o produto sabe operar — não sabe ainda costurar**. Há módulos bonitos, IA promissora, OD melhor que concorrentes — mas as ilhas não conversam e algumas fundações fiscais críticas não existem.

Em 40 dias **não dá pra fechar tudo**. O que dá é entregar um piloto utilizável numa produção real com:

1. **Painel central de visualização** (pedido explícito desta sessão — também é a #1 prioridade do Relatório Técnico).
2. **Costura mínima** entre roteiro, cronograma e OD (sem isso o AD volta pro Movie Magic em 3 dias).
3. **Fundação fiscal mínima** (upload de NF + RPA + regime de contratação — sem isso, prestação Funcultura é teatro).
4. **Conversa criativa básica** (tarefas + atas + @menção — o que torna o Diretor um usuário, não só visitante).
5. **Rebranding** (Cineflow → Glauber em todo o produto).

Tudo o que **não cabe** em 40 dias (stripboard arrastável, DOOD completo, player de vídeo Frame.io, folha de pagamento, festivais, multi-moeda, conciliação OFX) vai pro pós-piloto — com confiança de que o piloto já gerou aprendizado real.

---

## 2. Plano em 6 Fases (40 dias úteis)

```
DIA 01-02   ▌FASE 0  Rebranding Cineflow → Glauber
DIA 03-06   ▌FASE 1  Auditoria + Quick wins P0
DIA 07-16   ▌FASE 2  Command Center realtime (pedido principal)
DIA 17-26   ▌FASE 3  Fundação Fiscal mínima
DIA 27-33   ▌FASE 4  Costura Roteiro ↔ Cronograma ↔ OD
DIA 34-38   ▌FASE 5  Conversa Criativa (tarefas/atas/@menção/anexo)
DIA 39-40   ▌FASE 6  Hardening + deploy produção + onboarding equipe real
```

> Total: ~40 dias úteis. Cada fase tem critério de aceite e pode ser entregue isoladamente em staging. Se uma fase atrasar, sacrifica-se a Fase 5 (conversa criativa) — não a Fase 3 (fiscal), porque a Fase 3 é o que separa "ferramenta de demonstração" de "ferramenta de produção real".

### FASE 0 — Rebranding (dia 1-2)

**Por quê primeiro:** evita refazer tudo depois. Toda fase seguinte já nasce com o nome correto.

**Entregas:**
- Repositório renomeado de `cineflow-mvp/` para `glauber-mvp/` (manter alias de redirect no GitHub).
- Search & replace global `Cineflow` → `Glauber` em código, README, e-mails transacionais, meta tags, manifest.json.
- Logo nova substituída (já está na pasta Drive como "Nova Logo Glauber").
- Favicon novo + OG image atualizada.
- Variáveis de ambiente: `VITE_APP_NAME=Glauber`.
- Projeto Vercel renomeado (ou criado novo) + domínio definitivo.
- E-mail de comunicado ao time (1 parágrafo): "Por contratempo legal, Cineflow agora é Glauber. Nada muda no produto."

**Aceite:** abrir o app, ver "Glauber" em todo lugar, tirar print.

### FASE 1 — Auditoria + Quick Wins P0 (dia 3-6)

**Por quê:** antes de construir novo, validar o estado real do código e fechar buracos pequenos que travam usabilidade hoje. Tudo cabe em uma branch única.

**Auditoria (1 dia):**
- `git status` + `git log --oneline -30` para ver o que mudou desde a última sessão.
- `npm audit` para vulnerabilidades P0.
- Listar Edge Functions ativas no Supabase + RLS check por tabela.
- Lighthouse no dashboard atual (baseline de performance).
- Inventário do que existe vs. o que os relatórios assumiram que existia.

**Quick wins P0 (3 dias) — tudo do relatório do Produtor + correções da Tereza:**
- Senha mínima 8 chars no `/signup` (hoje aceita 6 — login do convidado falha silenciosamente).
- Coluna "status do convite" (pendente/aceito/recusado) na tabela Team.
- Máscara de CNPJ no Finance (`12.345.678/0001-90`).
- Validação dígito CNPJ.
- Aviso "PDF até 8MB" no input do roteiro.
- Confirmação "Vai apagar X cenas. Confirma?" no botão Re-decupar.
- Campo `regime_contratacao` (CLT/MEI/RPA/PJ) no `projeto_pessoas`.
- 4 campos de `conta_bancaria_projeto` (banco, agência, conta, PIX) na tabela `projetos`.
- Renomear depto "Câmera" → "Fotografia" no Team.tsx.
- Renomear "Valor diária" → "Valor de contratação" no Team.tsx.
- Trava de DatePicker de dias de filmagem ao intervalo do projeto.
- Locação com link Maps/Waze + lat/lng + botão "abrir no mapa".

**Aceite:** todos os quick wins em produção, validados manualmente em 1h de teste.

### FASE 2 — Command Center (dia 7-16, 7-10 dias) ⭐

**Por quê:** é o pedido explícito desta conversa **E** a #1 do Relatório Técnico **E** a fundação psicológica do produto (usuário entra, vê valor, continua).

**Base:** está tudo especificado em `BRIEF_SPRINT1A.md` (18 tasks, 50 story points). Não precisa redocumentar — só implementar.

**Stack:**
- Migration 0024 — tabela `projeto_kpis` + triggers (roteiro_filmado_pct, orcamento_comprometido_pct, prazos_criticos, proximos_eventos).
- Supabase Realtime + hook `useProjectKPIs(projetoId)` com fallback de polling 5s.
- Componente `<CommandCenter projectId userRole/>` com 4 views segmentadas:
  - **DP / Produtor / Diretor:** vêem TUDO (KPIs financeiros, prazos críticos, alertas edital, calendário, status de todos os departamentos).
  - **AD:** stripboard próximos 3 dias + OD status + dependências de equipe.
  - **Chefe de departamento (Fotografia, Arte, Figurino…):** vê só seu departamento + o que toca seu setor (orçamento da rubrica, equipe escalada, locações da semana, atas que mencionam o setor).
  - **Colaborador (técnico, ator, figurante):** vê só suas tarefas, prazos, próxima chamada, OD do dia.
- **RBAC por departamento + função** — o hook `useDeptScope(userId)` decide o que aparece. Mapeia `funcao_av_id` → `departamento_id` → conjunto de tabelas visíveis. Reaproveita o seed funcao_av do organograma já catalogado.
- **Ferramentas contextuais por departamento** — não só dados, também botões. Ex.: chefe de arte vê "+ Novo item de arte"; AD vê "+ Nova OD"; DP vê "+ Nova despesa"; ator vê "Confirmar leitura da OD".

**Sucesso:** dashboard <2s load, realtime <500ms, 50+ usuários simultâneos sem crash, DP e Chefe-de-Depto dizem "É isso que esperava".

**Aceite:** demo gravada em vídeo (1 min) mostrando 4 logins diferentes vendo painéis diferentes do mesmo projeto.

### FASE 3 — Fundação Fiscal mínima (dia 17-26, 7-10 dias)

**Por quê:** sem isso, a Tereza (DP) abandona o produto na primeira prestação. Crítica para uso REAL em edital.

**Entregas (cortadas no osso — sem folha de pagamento, sem petty cash, sem conciliação OFX — esses ficam pro pós-piloto):**

1. **Storage privado** — bucket `documentos_fiscais/`, signed URL 7 dias, RLS por projeto.
2. **Upload de NF/recibo/RPA** anexado à despesa (PDF, JPG, PNG, XML). Drop zone + preview.
3. **Parser XML NFe básico** — Edge Function que recebe XML, extrai emitente/valor/data/itens e preenche o formulário.
4. **Regime de contratação completo** — CLT/MEI/RPA/PJ + dados bancários + CPF/CNPJ + dependentes IR.
5. **Rateio de despesa** — 1 NF pode atender N rubricas com % cada.
6. **Audit log polimórfico** — tabela `audit_log` com `entidade_tipo, entidade_id, acao, usuario_id, payload_antes, payload_depois, timestamp`. Trigger em todas as tabelas críticas (despesa, orcamento, projeto_pessoas, contratos).
7. **Validações de edital ativas** — função SQL `validar_despesa_sic(despesa_id)` retornando OK/WARN/FAIL + motivo, rodando em trigger after-insert. Aproveita o `edital_sic_recife_2024` já catalogado.
8. **Comprovante de pagamento como 2º anexo** (NF + comprovante de transferência são dois documentos distintos).

**Aceite:** lançar 5 despesas reais (1 NF empresa, 1 RPA pessoa física, 1 recibo simples, 1 cupom fiscal, 1 RPA estrangeiro), todas com anexo, todas com validação de edital pintada com badge correta.

### FASE 4 — Costura Roteiro ↔ Cronograma ↔ OD (dia 27-33, 5-7 dias)

**Por quê:** é a quebra-promessa que mais machuca. O produto diz "tudo conectado" mas a IA decupa e joga 80% do valor fora.

**Entregas:**

1. **Migration nova:** tabela `dia_cenas (dia_id FK, cena_id FK, ordem int, status text, call_time time)`. Tabela `roteiro_cenas` ganha colunas `eighths int, intext text, diaornoite text, status text (planejada/rodada/omitida)`.
2. **Edge Function `aplicar-decupagem(roteiro_id, modos[])`** — pega o output do `analisar-roteiro` e cria registros com dedupe em: `personagens`, `figurinos`, `arte_objetos`, `locacoes` (como candidatas). Modo `dry-run` mostra o que vai criar antes de confirmar.
3. **Edição de cena** — botão "Editar cena" + "Marcar como verificada" no roteiro. Re-decupar passa a fazer MERGE inteligente em vez de DELETE+INSERT (preserva edições manuais).
4. **Tela `/projetos/:id/stripboard` simplificada** — lista de cenas com filtro por I/E, D/N, locação, personagem. Drag-and-drop para um dia de filmagem (com dnd-kit). Versão completa do stripboard fica pro pós-piloto.
5. **OD V2** — nova seção `<CenasDoDiaSection>` que puxa de `dia_cenas` (número, locação, personagens em cena, páginas, call time). Bloco "anexos do dia" (mapa, planta, autorização).
6. **Sol nascer/pôr + clima** via API OpenWeather pelo CEP da locação — quick win do AD.

**Aceite:** subir roteiro PDF → IA decupa → 1 clique cria 8 personagens + 5 locações candidatas + 6 figurinos → AD arrasta cenas 18,19,20 pro dia 14 → OD do dia 14 já mostra essas 3 cenas com personagens e horários. Tudo em <5 min.

### FASE 5 — Conversa Criativa (dia 34-38, 4-6 dias)

**Por quê:** sem isso o Diretor (Caio) usa Frame.io + Milanote + WhatsApp em paralelo e o Glauber só serve à produção, não à criação. Sem player de vídeo (vai pro pós-piloto), mas com o suficiente pra registrar decisões.

**Entregas:**

1. **Tabela `tarefas` simples** — titulo, descricao, responsavel_id, prazo, status (aberta/em_andamento/concluida/cancelada), `entidade_alvo` polimórfica (cena/plano/personagem/departamento/projeto).
2. **Tabela `atas`** — data, participantes (array de user_ids), agenda, decisoes (markdown), gera tarefas vinculadas.
3. **Tabelas `aprovacoes` e `comentarios` polimórficas** — anexáveis a cena, plano, mensagem, arquivo, decisão de ata. Estado: pendente/aprovada/precisa_ajuste/rejeitada + comentário.
4. **Chat upgrade:** `@menção` (com autocomplete e push notification), upload de imagem como anexo, vincular mensagem a entidade (cena/plano/personagem) — vira card clicável na sidebar.
5. **Widget "Minhas pendências"** no Command Center — tarefas atribuídas + aprovações esperando minha resposta. Atualizado realtime.

**Aceite:** diretor cria 5 tarefas em 5 reuniões diferentes, todos os responsáveis recebem notificação, vê pendências no Command Center, aprova 2 e pede ajuste em 1 com comentário no ponto exato.

### FASE 6 — Hardening + Deploy + Onboarding (dia 39-40)

**Entregas:**
- Load test 50+ usuários (k6 ou Artillery em staging).
- RLS audit final — script automatizado tentando acessar dados de outra org com cada user.
- Recuperação de senha ("Esqueci minha senha") — buraco de segurança apontado pelo relatório.
- Backup automático Supabase configurado (point-in-time recovery).
- Documento de 4-6 páginas: "Como usar o Glauber na sua produção" (PDF, em pt-BR, com prints).
- Treinamento ao vivo de 90 min com a equipe da produção real (gravado).
- Deploy `vercel --prod` definitivo.
- Definir canal de suporte (WhatsApp? Slack?) com SLA mínimo do piloto.

**Aceite:** equipe da produção real entra, completa o fluxo do smoke test (criar projeto → roteiro → equipe → 1 OD → 3 despesas com NF) sem precisar do Thiago olhando.

---

## 3. RBAC do Command Center — desenho proposto

O ponto chave do que você pediu ("diretor de produção e AD vêem tudo; pontas de departamento vêem só seu departamento e ferramentas coerentes com sua função") tem 3 camadas:

**Camada 1 — Papel no projeto (já existe parcialmente):**

| Papel | Vê Command Center | Edita orçamento | Aprova despesa | Cria OD |
|-------|-------------------|-----------------|----------------|---------|
| Owner (produtor exec) | Total | ✓ | ✓ | ✓ |
| DP | Total | ✓ | ✓ | ✓ |
| Diretor | Total + foco criativo | leitura | leitura | leitura |
| AD | Total operacional | leitura | leitura | ✓ |
| Chefe Depto | Só seu depto | leitura da rubrica | – | – |
| Colaborador | Só suas tarefas/OD | – | – | – |

**Camada 2 — Departamento (do organograma já catalogado):**

Cada `funcao_av` aponta para um `departamento_id`. Chefes de departamento (nível 1 do organograma) ganham visão consolidada do seu setor; subordinados só vêem o que toca a função deles.

**Camada 3 — Ferramentas contextuais (botões e atalhos):**

Não é só o que o usuário vê — é o que ele PODE fazer. Ex.:
- Chefe de Arte → atalho "+ Novo item de arte", "+ Novo orçamento de cenografia", "Solicitar aprovação ao diretor".
- Eletricista → "Bater ponto", "Ver OD do dia", "Reportar problema com equipamento".
- Casting → "Subir vídeo de teste", "Convocar para callback".

Isso é **implementação extra** sobre o que está em `BRIEF_SPRINT1A.md` — vou querer alinhar contigo, na Fase 2, qual o conjunto mínimo de atalhos por papel. Sugiro pegarmos os 4 papéis principais (DP/Diretor/AD/Colaborador) no piloto e expandir os chefes de departamento na próxima rodada.

---

## 4. Cowork vs. Claude Code — decisão pragmática para os 40 dias

Você já adotou o workflow 3-fases (Specs em Cowork → Local Setup → Código em Claude Code) — está na sua memória, está validado. Para um piloto de 40 dias, recomendo intensificar o uso de **Claude Code** porque:

1. **Já tem specs.** `BRIEF_SPRINT1A.md`, `SCHEMA_SPRINT1A.md`, `REACT_INTERFACES_SPRINT1A.md` cobrem ~30% do trabalho. Os outros 70% (Fases 3-5) podem ser especificados em mini-briefs de 1 página cada, dentro do próprio Claude Code, sem ida ao Cowork.
2. **Token economy.** Implementar via Cowork você gasta ~80-120K tokens por fase (Claude precisa Read/Edit/Write em vários arquivos, contexto pesado). Via Claude Code, ~30-50K por fase. Em 6 fases isso é a diferença entre **180-300K** (Cowork) e **180-300K** (Claude Code), MAS Claude Code testa e roda o código, então cada token é mais produtivo.
3. **Velocidade.** Claude Code rodando local consegue: editar → npm run dev → testar → commit em ciclo de minutos. Cowork não tem ambiente de execução do seu repo — você ia precisar baixar, rodar, devolver erro.

**Regra prática para os 40 dias:**

| Tarefa | Onde fazer | Por quê |
|--------|------------|---------|
| Decidir prioridades, escopo, RBAC | **Cowork** | Iteração rápida comigo + DP/Chico |
| Brief de cada fase (1 página) | **Cowork** | Você revisa + colamos no Claude Code |
| Migrations SQL + seeds | **Claude Code** | Roda local + testa |
| Componentes React + hooks | **Claude Code** | Itera com `npm run dev` |
| Edge Functions Supabase | **Claude Code** | Testa com `supabase functions serve` |
| Deploy + load test + smoke | **Claude Code** | Roda comandos diretos |
| Validação com DP/equipe | **Cowork** + reunião | Conversa, não código |
| Memória de decisões | **Cowork** | É aqui que vive a sua memória persistente |

**Fluxo recomendado por fase:**

```
1. Cowork (20 min):  "Para Fase X, quero entregar A, B, C. Validar comigo, gerar BRIEF_FASE_X.md"
2. Local (5 min):    git checkout -b fase-X, colar BRIEF_FASE_X.md no repo
3. Claude Code (~3-5 dias por fase):
   "Read BRIEF_FASE_X.md e implemente. Pergunta apenas se houver ambiguidade. Testa antes de commitar."
4. Cowork (30 min):  Validação visual, decisões de UX, ajustes
5. Local (1 min):    vercel --prod
```

---

## 5. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Fase 2 (Command Center) demorar mais que 10 dias por complexidade do RBAC | Média | Alto | MVP do RBAC = 2 perfis (admin/colaborador), refinar pós-piloto |
| Fase 3 (fiscal) descobrir que upload de NF quebra outras telas | Média | Alto | Smoke test ao fim de cada fase, não só no fim |
| Supabase Realtime falhar com 50+ usuários | Baixa | Alto | Load test antecipado na Fase 2 (não esperar Fase 6) |
| Equipe da produção real desistir do Glauber em 1 semana | Média | Crítico | Onboarding ao vivo + canal de suporte com SLA <2h no piloto |
| Bug crítico em produção sem rollback | Baixa | Alto | Branch protection no `main` + deploy pelo Vercel com 1 clique de rollback |
| Você ficar sozinho na resposta a suporte da equipe real | Alta | Médio | Documento "FAQ Glauber" desde a Fase 6, mantido vivo |

---

## 6. Sequência de ação para HOJE

Caso queira começar agora (próximas 2 horas):

1. **(10 min)** Confirmar a logo nova na pasta Drive — anotar URL exata.
2. **(5 min)** Me responder: alguma fase deveria mudar de prioridade? (ex: quer adiar Fase 5 e expandir Fase 2?)
3. **(20 min)** Abrir Claude Code, criar branch `rebrand-glauber`, começar Fase 0.
4. **(30 min)** Quando terminar Fase 0, voltar pro Cowork e me pedir: "Brief detalhado da Fase 1 (auditoria + quick wins)".

Eu mantenho a Lista de Tarefas atualizada (8 tasks já criadas) e vamos marcando `completed` a cada fase fechada. A cada fase, sugiro me chamar pra um check curto (15 min) antes de avançar — barato em token, caro o estrago se passa direto com bug.

---

## 7. O que NÃO está no plano (e por quê)

Item por item dos relatos que ficam pro pós-piloto, com justificativa:

| Item | Por que adiar | Quando voltar |
|------|---------------|----------------|
| Stripboard arrastável completo (estilo MMSched) | 2-3 semanas só dele | Sprint 4 pós-piloto |
| DOOD completo (códigos SW/W/H/WF) | Depende de stripboard | Sprint 4 pós-piloto |
| Folha de pagamento + RPA emissão | 2-3 semanas, fora do escopo de piloto | Sprint 5 pós-piloto |
| Player de vídeo com timecode (Frame.io BR) | 4-6 semanas, infraestrutura nova | Sprint 6 pós-piloto |
| Petty cash + cartão produção | 1 semana, não bloqueia primeira prestação | Sprint 5 pós-piloto |
| Conciliação OFX | 1 semana, contadora aceita CSV no curto prazo | Sprint 5 pós-piloto |
| Módulo de festivais / EPK | Pós-produção (fim do filme) | Sprint 7 pós-piloto |
| Lookbook + versionamento de roteiro | 2 semanas | Sprint 4 pós-piloto |
| Folha de obra orçamentária 3 níveis + fringes | 1 semana | Sprint 5 pós-piloto |
| Continuidade digital (script supervisor) | 2 semanas | Sprint 6 pós-piloto |
| Figuração como módulo | 1 semana | Sprint 5 pós-piloto |
| Multi-produtora real (seletor de org) | 3-4 dias | Pode caber em quick win extra na Fase 1 se sobrar tempo |

**Insight:** se a equipe real do piloto pedir 2-3 itens dessa lista após uma semana de uso, esses sobem para Fase 7 (extensão de 2 semanas). Hoje o risco de incluir é maior que o risco de adiar.

---

**Resumo de 1 frase:** Em 40 dias, entregamos um Glauber com painel central que funciona, fiscal mínimo defensável, costura roteiro→OD funcional, e conversa criativa básica — o resto vem com aprendizado real do piloto.
