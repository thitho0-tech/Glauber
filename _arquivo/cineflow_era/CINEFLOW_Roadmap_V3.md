# CINEFLOW — Roadmap V3
**Data:** 23/05/2026
**Autor:** Claude (consultor de implementação) com base em:
- `MVP - Observações de uso Cineflow (Thiago_Chico Amorim).pdf` (23/05/2026)
- `ORGANOGRAMA_COMPLETO_FUNCIONAMENTO_AUDIOVISUAL.docx` (23/05/2026)
- `CINEFLOW_Roadmap_V2.md` (22/05/2026)
- Decisões respondidas pelo Thiago em 23/05/2026

**Status do código:** `cineflow-mvp/` em produção (https://cineflow-mvp.vercel.app), migrations 0001 (init) + 0002 (seed SIC) aplicadas. Editais ativos: Funcultura PE, Lei Paulo Gustavo, SIC Recife 2024 — FIC e MIC.

---

## 1. Diagnóstico — o que mudou desde o V2

O V2 listou 15 requisitos em 4 trilhas. Esta V3 incorpora:

1. **4 decisões respondidas** (eliminam parte das incertezas que travavam Trilha 3 do V2).
2. **10 observações novas** (refinamentos de UI/UX + 1 item arquitetural novo: equipe POR projeto).
3. **Organograma definido** (~60 funções, 9 deptos, 4 níveis) — desbloqueia RBAC granular e OD aprimorada.
4. **Reordenação prática:** o que Claude faz sem precisar de você no caminho crítico vai pra Trilha A; o resto fica ordenado por dependência.

### 1.1 Decisões respondidas (fixas até nova ordem)

| Pergunta V2 | Resposta |
|---|---|
| Gateway de pagamento? | Indefinido. Modelar T1 com **stub de contrato** (sem integração real ainda). |
| Modelo billing? | **Por projeto / mensal** (cada projeto é uma assinatura). |
| Organograma? | Anexado. ~60 funções, 9 deptos, 4 níveis. |
| Check-in? | **Manual** (botão entrada/saída; sem GPS obrigatório nem QR). |
| Comunicação? | **Nativa** (canal interno na plataforma, não usar WhatsApp/Slack via API). |

### 1.2 Observações novas (N1–N10)

| # | Origem | Item | Tipo |
|---|---|---|---|
| N1 | Thiago | Renomear depto "Câmera" → "Fotografia" | UI 1 string |
| N2 | Thiago | Renomear "Valor diária (R$)" → "Valor de contratação (R$)" | UI 2 strings |
| N3 | Thiago | Travar DatePicker de "Novo dia de filmagem" ao intervalo do projeto | Validação form |
| N4 | Thiago | Botão "+ Novo dia" → "+ Planejamento" com tipo (Pré/Prod/Filmagem/Pós) + período (semana/mês/dia) | Migration + UI |
| N5 | Thiago | Locações com Google Maps/Waze (URL, lat/lng, botão abrir) | Migration + UI |
| N6 | Thiago | Configurações: "Edição de cadastro pessoal" + "Autorizações para editores" | UI nova página |
| N7 | Thiago | Excluir projeto: só criador + 2FA por e-mail | Backend + Edge Function |
| N8 | Thiago | Equipe POR PROJETO (não da produtora) — **redobra C4 do Chico** | Migration + UI refator |
| N9 | Thiago | Travar (opcional) orçamento ao teto do edital vinculado | RPC |
| N10 | Thiago | OD aprimorada com estrutura completa do organograma (10 blocos) | Migration + UI |

### 1.3 Cruzamento com o estado atual do código

| Arquivo / tabela | Estado | Item afetado |
|---|---|---|
| `src/pages/Team.tsx` | OK (campo nome já existe) | N1, N2, N8, B1 |
| `supabase/migrations/0001_init.sql` | aplicada — schema base | base para B1–B6 |
| `supabase/migrations/0002_seed_sic_recife_2024.sql` | aplicada — 4 editais, 48 rubricas | base para A8, A9 |
| Tabela `pessoas` | tem `org_id`, não `projeto_id` | precisa B1 |
| Tabela `dias_filmagem` | tem `data`, `chamada_geral`, `locacao_id`, sem fase | precisa B3 |
| Tabela `ordens_do_dia` | atrelada a `dia_id` (NOT NULL) | precisa B2 |
| Tabela `locacoes` | **já tem `lat`, `lng`**; falta `maps_url`/`waze_url` | precisa A5 (só URLs) |
| Tabela `escalas` | usa `dia_id`, existe mas não está na UI | precisa B4 |
| Tabela `projetos` | tem `periodo_inicio`, `periodo_fim` | A3 usa esses nomes |
| RPC `validar_despesa()` | só valida 3 regras | precisa A8 |

---

## 2. Tabela consolidada das 25 demandas (15 V2 + 10 novas)

Ordem por facilidade de resolução, com flag de autonomia.

| # | Item | Origem | Trilha | Autonomia | Estim. | Bloqueio |
|---|---|---|---|---|---|---|
| A1 | Rename "Câmera"→"Fotografia" | N1 | A | ✅ Claude sozinho | 5min | – |
| A2 | Rename "Valor diária"→"Valor de contratação" | N2 | A | ✅ Claude sozinho | 5min | – |
| A3 | Travar data de filmagem ao período do projeto | N3 | A | ✅ Claude sozinho | 20min | – |
| A4 | Botão "+ Planejamento" + tipo + período | N4 | A | ✅ Claude sozinho | 1-2h | – |
| A5 | Locações com Google Maps/Waze | N5 | A | ✅ Claude sozinho | 1h | – |
| A6 | Configurações: edição de cadastro pessoal | N6 (parte 1) | A | ✅ Claude sozinho | 1-2h | – |
| A7 | Seed funcoes_av (organograma) | – | A | ✅ Claude sozinho | 1h | – |
| A8 | T6.2: Validações SIC ativas (RPC) | T6.2 V2 | A | ✅ Claude sozinho | 2-3h | – |
| A9 | Travar orçamento ao teto do edital | N9 | A | ✅ Claude sozinho | 1h | – |
| B1 | C4a: Equipe POR projeto (`projeto_pessoas`) | N8 + C4 | B | ✅ Claude sozinho | 3-4h | – |
| B2 | C2: OD autônoma com seções por depto | C2 V2 | B | ✅ Claude sozinho | 4-6h | – |
| B3 | C3: Cronograma com fases | C3 V2 | B | ✅ Claude sozinho | 3-4h | – |
| B4 | C4b: Equipe vinculada ao cronograma | C4 V2 | B | ✅ Claude sozinho | 2-3h | depende B1+B3 |
| B5 | Exclusão de projeto + 2FA email | N7 | B | ⚠️ Claude codifica, Thiago configura SMTP | 3-4h | SMTP Supabase |
| B6 | OD aprimorada (10 blocos do organograma) | N10 | B | ✅ Claude sozinho | 4-6h | depende B2 |
| C1 | T1: 1 projeto = 1 contrato (stub) | T1 V2 | C | ✅ Claude sozinho com stub | 4-6h | gateway adiado |
| C2 | T4: Convite e-mail + OTP | T4 V2 | C | ⚠️ Thiago configura SMTP | 4-6h | SMTP Supabase |
| C3 | T3: Cadastro restrito por papel | T3 V2 | C | ⚠️ Thiago aprova matriz | 3-4h | matriz funções×permissões |
| C4 | T7: RBAC granular por função | T7 V2 | C | ⚠️ Thiago aprova matriz | 6-8h | depende A7+C3 |
| D1 | C5a: Figurino + arte (objetos, caracterização) | C5 V2 + Chico | D | ✅ Claude sozinho | 6-8h | – |
| D2 | C5b: Elenco separado da equipe técnica | C5 V2 | D | ✅ Claude sozinho | 4-6h | depende B1 |
| D3 | C5c: Análise técnica / decupagem | C5 V2 | D | ✅ Claude sozinho | 6-8h | – |
| D4 | T5: Check-in manual (hora in/out) | T5 V2 | D | ✅ Claude sozinho | 3-4h | depende B1+B4 |
| D5 | T8: Canal de comunicação texto + áudio | T8 V2 | D | ✅ Claude sozinho | 8-12h | – |
| D6 | T2: OCR onboarding (PDF tabelado) | T2 V2 | D | ⚠️ Thiago aprova engine | 6-10h | escolha OCR |
| D7 | T9: OCR OD/cronograma antigos | T9 V2 | D | ⚠️ Thiago aprova engine | 8-12h | escolha OCR |
| D8 | T10: OCR notas fiscais | T10 V2 | D | ⚠️ Thiago aprova engine | 8-12h | escolha OCR |

**Total Trilha A (autônomo, sem bloqueio):** ~9-13h → 1 sprint de 1-2 dias.
**Total Trilha B (autônomo refator):** ~19-27h → 1 sprint de 3-4 dias.
**Total Trilha C (depende decisão):** ~17-24h.
**Total Trilha D (módulos novos):** ~49-72h.

---

## 3. Passo a passo — Trilha A (executar primeiro)

Toda a Trilha A é Claude autônomo. Você só precisa: (i) confirmar que pode rodar; (ii) colar SQL no Supabase quando eu disser; (iii) rodar `vercel --prod` no final.

### A1 — Rename "Câmera" → "Fotografia"
**Arquivo 1:** `cineflow-mvp/src/pages/Team.tsx` linha 103.
**Mudança:** `<SelectItem value="camera">Câmera</SelectItem>` → `<SelectItem value="fotografia">Fotografia</SelectItem>`.
**Arquivo 2:** Migration `0003_rename_camera_fotografia.sql` — o check constraint em `pessoas.departamento` (linha 67 do init) hoje lista `'camera'` e precisa virar `'fotografia'`:
```sql
alter table public.pessoas drop constraint pessoas_departamento_check;
update public.pessoas set departamento='fotografia' where departamento='camera';
alter table public.pessoas add constraint pessoas_departamento_check
  check (departamento in ('producao','direcao','fotografia','arte','som','figurino','maquiagem','pos','elenco','outros'));
```

### A2 — Rename "Valor diária" → "Valor de contratação"
**Arquivo:** `Team.tsx` linhas 126-127 (label + placeholder do Input) + linha 152 (header da tabela) + linha 163 (não precisa).
**Mudança:** trocar 2 ocorrências de "Valor diária" / "Diária" pelo novo texto. Nome do campo `valor_diaria` no banco fica (compatibilidade); só muda o label.

### A3 — Travar DatePicker ao período do projeto
**Arquivos:** página de "Novo dia de filmagem" (`src/pages/Schedule.tsx` ou equivalente — vou localizar quando começar).
**Mudança:** ler `projeto.periodo_inicio` e `projeto.periodo_fim` da query; passar como `disabled={{ before, after }}` no DayPicker (react-day-picker).
**Validação backend:** trigger SQL `check_dia_no_periodo` que valida `data between projeto.periodo_inicio and projeto.periodo_fim`.

### A4 — Botão "+ Novo dia" → "+ Planejamento" com tipo + período
**Migration:** `0004_cronograma_fases.sql`
```sql
-- Adiciona campos novos sem renomear a tabela (preserva FKs de ordens_do_dia.dia_id e escalas.dia_id)
alter table public.dias_filmagem
  add column tipo text check (tipo in ('pre_producao','producao','dia_filmagem','pos_producao')) default 'dia_filmagem',
  add column periodo text check (periodo in ('dia','semana','mes')) default 'dia',
  add column data_fim date;  -- usado quando periodo != 'dia'
-- Bonus: remove unique(projeto_id, data) porque pré-prod/pós-prod podem coexistir com filmagem na mesma data
alter table public.dias_filmagem drop constraint if exists dias_filmagem_projeto_id_data_key;
```
**UI:** Renomear botão "+ Novo dia" → "+ Planejamento". Adicionar Select de Tipo (4 opções) + Select de Período (3 opções). Quando período≠'dia', mostrar campo `data_fim`. Renomeação visual (não da tabela): a listagem passa a se chamar "Cronograma & Planejamento" mas a tabela continua sendo `dias_filmagem` por enquanto, pra não quebrar nada.

### A5 — Locações com Google Maps/Waze
**Migration:** `0005_locacoes_geo.sql` (locacoes JÁ tem `lat` e `lng` — só faltam URLs)
```sql
alter table public.locacoes
  add column maps_url text,
  add column waze_url text;
```
**UI:** Em `Locacoes`: campo Input "Cole link do Google Maps"; ao colar, extrair lat/lng via regex `@(-?\d+\.\d+),(-?\d+\.\d+)` e preencher os campos. Mesma coisa para Waze. Botões "Abrir no Maps" / "Abrir no Waze" abrem `maps.google.com/?q=lat,lng` ou o URL salvo.

### A6 — Configurações: edição de cadastro pessoal
**Arquivo:** criar `src/pages/Settings.tsx` se não existir; adicionar rota.
**Conteúdo:** formulário para editar `auth.users.user_metadata` (nome, telefone, foto). Sem RBAC ainda (vem em C3/C4).

### A7 — Seed funcoes_av (organograma)
**Migration:** `0006_funcoes_av.sql`
```sql
create table public.funcoes_av (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nome text not null,
  departamento text not null check (departamento in (
    'desenvolvimento','direcao','producao','fotografia','arte','som','elenco','logistica','pos_producao'
  )),
  nivel int not null check (nivel between 1 and 4)
);
-- + 60 inserts (lista completa em memory project_cineflow_organograma_av.md)
```

### A8 — Validações SIC ativas (T6 parte 2)
**Migration:** `0007_validacoes_sic.sql`
Recria a RPC `validar_despesa()` para checar:
- Pagamento antecipado à NF (data_pagamento < data_emissao_nf).
- Mídias sociais > 30% (somar por rubrica `SIC_MIDIA`).
- Admin > 15% (somar por rubrica `SIC_ADM`).
- Fornecedor único > 30% (group by CNPJ).
- Pagamento por cartão de crédito (bloqueia tipo='cartao_credito').
- Bebida alcoólica / cigarros (palavras-chave em descrição, alerta).
- Data fora do período do Termo de Compromisso.
Cada falha vira linha em `validacoes_edital` com `tipo` e `mensagem`.

### A9 — Travar orçamento ao teto do edital
**Migration:** `0008_orcamento_teto.sql`
```sql
alter table public.editais add column teto_global numeric;
-- seed: SIC FIC tem teto de R$X (Thiago preenche depois);
-- Funcultura PE varia por linha — fica null
```
**RPC:** `check_orcamento_dentro_teto(projeto_id)` chamada antes de salvar orçamento.
**UI:** banner amarelo se ultrapassar (não bloquear, só alertar — a regra "condicionar" do Thiago vira só validação por enquanto; bloqueio rígido entra depois se ele confirmar).

---

## 4. Passo a passo — Trilha B (refator estrutural)

### B1 — Equipe POR projeto (`projeto_pessoas`)
**Migration:** `0008_projeto_pessoas.sql`
```sql
create table public.projeto_pessoas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  pessoa_id uuid not null references public.pessoas(id),
  funcao_av_id uuid references public.funcoes_av(id),
  valor_contratacao numeric default 0,
  unique(projeto_id, pessoa_id)
);
-- Backfill: para cada projeto existente, adicionar todas as pessoas da org
-- (decisão temporária para não perder dados)
```
**UI:** página `/projetos/:id/equipe` que substitui o uso de `/equipe` (catálogo da produtora vira tela secundária).

**Decisão importante de modelagem:** `pessoas` continua como catálogo da produtora (pessoa pode existir sem estar em projeto), e `projeto_pessoas` é o vínculo com função e cachê específicos daquele projeto. Isso atende Thiago (equipe por projeto) sem perder o catálogo.

### B2 — OD autônoma com seções por departamento
**Migration:** `0009_od_autonoma.sql`
```sql
alter table public.ordens_do_dia
  alter column dia_filmagem_id drop not null,
  add column data date,
  add column tipo text check (tipo in ('filmagem','ensaio','reuniao','pesquisa','outro')) default 'filmagem',
  add column titulo text;

create table public.od_secoes (
  id uuid primary key default gen_random_uuid(),
  od_id uuid not null references public.ordens_do_dia(id) on delete cascade,
  departamento text not null,
  conteudo jsonb not null default '{}',  -- campos livres por turno
  ordem int default 0
);

create table public.od_cenas (
  id uuid primary key default gen_random_uuid(),
  od_id uuid not null references public.ordens_do_dia(id) on delete cascade,
  numero text,
  descricao text,
  tempo_estimado interval
);
```
**UI:** redesenhar `/ordens-do-dia/:id` com abas por departamento e tabela de cenas.

### B3 — Cronograma com fases
Já feito parcialmente em A4 (renomeação para `planejamento`). Aqui completa: garantir que UI mostra agrupamento por fase, e que pré-prod / pós-prod aceitam datas largas (semana/mês).

### B4 — Equipe vinculada ao cronograma
**Migration:** `0010_escalas_planejamento.sql`
```sql
alter table public.escalas
  rename column dia_filmagem_id to planejamento_id;
alter table public.escalas
  alter column pessoa_id type uuid using pessoa_id::uuid,
  add column projeto_pessoa_id uuid references public.projeto_pessoas(id);
```
**UI:** ao abrir um Planejamento, mostrar tabela "Quem está escalado" puxando de `projeto_pessoas` do projeto.

### B5 — Exclusão de projeto + 2FA email
**Backend:** Edge Function `delete-project-confirm` (Supabase):
1. Recebe `projeto_id` + `user_id`.
2. Verifica RLS: `projeto.criado_por = user_id`.
3. Gera código 6 dígitos, salva em tabela `delete_confirmations` (TTL 15min).
4. Envia e-mail com código (via Resend ou SMTP do Supabase).
5. Endpoint segundo: `delete-project-execute` valida código e remove.
**Bloqueio:** Thiago precisa ter Resend conta OU SMTP configurado no Supabase. Se ainda não tiver, ficamos no esqueleto e ativamos depois.

### B6 — OD aprimorada (10 blocos do organograma)
**Migration:** `0011_od_completa.sql` — adicionar à `ordens_do_dia` os campos:
- `chegada_geral` time
- `hospital_proximo` text
- `bloqueio_ruas` boolean
- `estacionamento` text
- `cafe_horario` time, `almoco_inicio` time, `almoco_fim` time
- `clima_previsao` text
- `contatos_emergencia` jsonb (array {nome, funcao, telefone})
- `notas_importantes` text

**UI:** novo template de OD com os 10 blocos da seção 8 do organograma.

---

## 5. Passo a passo — Trilha C (depende decisão)

### C1 — T1 com stub de gateway
Migration `0012_contratos.sql`: tabela `contratos (projeto_id, status, valor_mensal, vigencia)`. Trigger `before insert on projetos`: se a org já tem contrato ativo, requer novo contrato. **Stub:** botão "Contratar projeto" só seta status='ativo' sem cobrar. Quando você decidir o gateway (Stripe/Iugu/Asaas/MercadoPago), eu plugo a Edge Function que cria a assinatura recorrente e dispara webhook.

### C2 — T4 convite e-mail + OTP
Supabase Auth tem `signInWithOtp` (magic link) nativo. Edge Function `invite-member` que:
1. Cria `projeto_pessoas` (vinda da B1).
2. Chama `auth.admin.inviteUserByEmail()`.
3. No callback `/invite/accept?token=...`, valida e redireciona para criar senha + login com OTP.
**Bloqueio:** Thiago precisa abrir Supabase → Authentication → Email Templates e customizar; e configurar SMTP (ou usar o builtin do Supabase com limite de 3 e-mails/h, que para teste serve).

### C3 — T3 cadastro restrito por papel + C4 RBAC granular
Depende de você aprovar a matriz funções×permissões. Tenho um rascunho na memória `cineflow-organograma-av` mas precisa sua validação caso a caso. Posso preparar a matriz em planilha e te mandar para revisar.

---

## 6. Passo a passo — Trilha D (módulos novos)

Cada um vira sprint próprio. Resumo:

- **D1 figurino+arte:** tabelas `pecas_arte`, `pecas_figurino` (categoria, descrição, fotos URL, status, custo, locação X aquisição). Página `/projetos/:id/arte`.
- **D2 elenco separado:** vira flag `tipo='elenco'` em `projeto_pessoas` + tabela `personagens` + tabela join `personagem_cenas`.
- **D3 análise técnica:** importar roteiro (texto ou PDF), tabela `cenas` (numero, descrição, locação, INT/EXT, dia/noite, personagens), página de decupagem.
- **D4 check-in manual:** tabela `check_ins (projeto_pessoa_id, planejamento_id, entrada, saida, observacao)`. Botão "Check-in" e "Check-out" na home do projeto.
- **D5 canal comunicação:** tabela `mensagens (projeto_id, autor_id, departamento_destino, tipo, conteudo, audio_url)` + Supabase Realtime + Storage para áudios. UI tipo Slack mínimo, por canal=departamento.
- **D6/D7/D8 OCR:** Edge Function que recebe PDF/imagem, chama Claude Vision (ou Tesseract local, ou Google Cloud Vision — você escolhe), parseia, devolve JSON estruturado.

---

## 7. Cronograma sugerido por sprint

| Sprint | Conteúdo | Estimativa | Pré-req |
|---|---|---|---|
| **S1 — Trilha A** | A1+A2+A3+A4+A5+A6+A7+A8+A9 | 1-2 dias | nenhum |
| **S2 — Trilha B parte 1** | B1+B3+B4 (equipe/cronograma) | 2-3 dias | S1 |
| **S3 — Trilha B parte 2** | B2+B6 (OD redesign) | 2-3 dias | S2 |
| **S4 — Trilha B parte 3** | B5 (excluir+2FA) | 1 dia | SMTP ativo |
| **S5 — Trilha C parte 1** | C1 (contrato stub) + C2 (convite OTP) | 2-3 dias | SMTP + sua aprovação |
| **S6 — Trilha C parte 2** | C3+C4 (RBAC) | 2 dias | matriz aprovada |
| **S7 — D5** | Canal comunicação interna | 2-3 dias | – |
| **S8 — D4** | Check-in manual | 1 dia | S2 |
| **S9 — D1+D2+D3** | Módulos arte/elenco/análise técnica | 5-7 dias | S2 |
| **S10 — D6+D7+D8** | Suite OCR | 5-7 dias | engine escolhida |

---

## 8. Perguntas que ficaram em aberto

(Não bloqueiam Trilha A, mas devo te perguntar em algum ponto:)

1. **Teto do orçamento por edital:** A9 vira alerta ou bloqueio rígido? (rascunho: alerta).
2. **Backfill da B1:** quando criar `projeto_pessoas`, copio todas as pessoas da org pra cada projeto existente, ou começo do zero?
3. **Funções vs categorias livres:** `pessoas.funcao` hoje é texto livre. Quando você tiver A7 (seed funcoes_av), faço opcional ou obrigatório linkar pessoa a uma função do organograma?
4. **OD ensaio/reunião:** essas ODs sem dia de filmagem aparecem na mesma listagem ou em aba separada?
5. **Notificação na publicação da OD** (item do Chico): por e-mail, in-app, ou ambos?
6. **Áudio do canal de comunicação (D5):** gravar no app (Web Audio API) ou só upload? Limite de duração?
7. **OCR engine:** prefere Claude Vision API (paga, melhor qualidade) ou alternativa gratuita (Tesseract local, vai precisar Edge Function com container customizado)?
8. **Excluir projeto:** soft-delete (recuperar 30 dias) ou hard-delete real?

---

## 9. O que **não** vai entrar nesta rodada

- Mobile app nativo.
- Importação de roteiro com IA (separação de cenas automática) — só vem depois de D3 funcionar com input manual.
- Integração com sistemas contábeis (eNotas, ContaAzul, etc.).
- Multi-idioma.
- Marketplace de prestadores.

---

## 10. Próximo passo recomendado

**Começar pela Trilha A inteira em uma sessão.** São 9 itens, todos autônomos, sem decisão pendente, e quando terminar você terá:
- 5 melhorias de UX visíveis (A1, A2, A3, A4, A5);
- 1 página nova (A6 configurações);
- 60 funções AV catalogadas no banco (A7);
- Validações SIC reais funcionando (A8);
- Alerta de teto de orçamento (A9).

E tudo isso sem te pedir nenhuma decisão de produto no caminho.

Depois disso conversamos sobre qual ordem você prefere para a Trilha B (refator estrutural).
