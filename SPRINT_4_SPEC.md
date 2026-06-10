# SPRINT 4 — "Formato definitivo" (10/06 → 20/06/2026)

**Objetivo:** protótipo utilizável nas mãos das equipes de teste em 10 dias.
**Fontes:** pLANILHA oRIENTAÇÃO gLAUBER.xlsx (guia mestre), ALTERAÇÕES PARA LAYOUT.pdf, OBSERVAÇÕES GLAUBER.pdf (26 itens), Destaques planilha glauber.txt, screenshots de erro (09/06).
**Decisões do Thiago (10/06):** isolamento REAL no banco; RBAC simplificado (admin + produção mantidos; departamentos/funções definem o resto); 4 blocos grandes são todos indispensáveis.

---

## 1. CHECKLIST DEMANDA → SOLUÇÃO (priorizado por facilidade)

### 🔴 BUGS (todos resolvidos pela migração 0039 + fixes pequenos no front)

| # | Demanda (origem) | Causa-raiz | Solução | Fase |
|---|---|---|---|---|
| B1 | "column e.vencimento does not exist" ao criar planejamento (screenshot) | `fn_recalcular_proximos_eventos` (0029) consulta `editais.vencimento`, coluna que não existe | 0039 Bloco 2 recria a função sem o bloco de editais | 4A |
| B2 | RLS violation ao criar OD (screenshot) | Em produção vale a policy do 0001 que exige `dia_id`; OD autônoma (dia_id null) falha | 0039 Bloco 3 recria as 4 policies aceitando `projeto_id` OU `dia_id` | 4A |
| B3 | "permission denied for table users" ao criar evento (screenshot) | Policies do 0031 fazem SELECT em `auth.users` (proibido p/ authenticated) | 0039 Blocos 1+4: helper `user_email()` security definer + policies recriadas | 4A |
| B4 | duplicate key `projeto_pessoas_projeto_id_pessoa_id_key` ao adicionar pessoa (screenshot) | Pessoa já vinculada; modal insere de novo em vez de adicionar função | Team.tsx: se vínculo existe, inserir apenas em `projeto_pessoa_funcoes` (toast "função adicionada") | 4A |
| B5 | "Você não é membro deste projeto" nas Notificações (obs 04/15 + screenshot) | Owner sem linha em projeto_pessoas (projetos antigos) | 0039 Bloco 5: backfill + trigger criador→membro | 4A |
| B6 | Pessoa nova não aparece no painel de equipe (obs 14/20) | Mesmo fluxo do B4 (insert falhava silenciosamente) | Resolvido com B4 + invalidateQueries após salvar | 4A |
| B7 | "Erro ao carregar KPIs: [object Object]" (screenshot Alterações) | projeto sem linha em projeto_kpis + erro renderizado como objeto | 0039 Bloco 2 (backfill de linhas) + front: `e.message ?? JSON.stringify(e)` | 4A |
| B8 | Contrato salva mas não sai da página (screenshot) | onSuccess sem navegação/reset | Contract.tsx: toast + navigate de volta à lista / resetar form p/ novo contrato | 4A |
| B9 | Modal de agenda/equipe sem rolagem (screenshot) | falta `max-h-[90vh] overflow-y-auto` | aplicar nos DialogContent de Agenda, Team e demais modais grandes | 4A |
| B10 | Erro fornecedor_id schema cache (obs 09) | 0038 já corrigiu; se reaparecer | `notify pgrst, 'reload schema'` já incluso no fim da 0039 | 4A |

### 🟠 LAYOUT / RENOMEAÇÕES (rápidos — 1 sessão)

| # | Demanda (origem) | Solução | Fase |
|---|---|---|---|
| L1 | Dashboard → "Página Inicial" (obs 22 + PDF) | Sidebar.tsx + título da página | 4A |
| L2 | Command Center → "Mural" (obs 24 + PDF) | Sidebar.tsx + ProjectDashboard.tsx | 4A |
| L3 | Substituir logo por "PERSONA LOGO" + "Nova Logo Glauber" (PDF) | converter os .jpeg da pasta p/ assets, trocar em Sidebar/Login/favicon | 4A |
| L4 | Mover Lixeira do Geral p/ Configurações (obs 23) | remover do nav GERAL; já existe card Lixeira em Settings | 4A |
| L5 | Remover campo "Tipo" da Nova OD (screenshot X vermelho) | CallSheets.tsx: remover select, default 'filmagem' | 4A |
| L6 | Remover campo "Papel livre (opcional)" do modal de equipe (screenshot X) | Team.tsx | 4A |
| L7 | Remover cards do Mural: Roteiro Filmado, Orçamento Comprometido, Contratos Pendentes, Equipe do Projeto (screenshot Comand center, 4 X) | DPView/views do Command Center | 4A |
| L8 | Departamento condiciona Função (obs 13 + PDF item 2 + screenshot) | Team.tsx: filtrar checkboxes de função pelo departamento selecionado em AMBAS as abas | 4A |
| L9 | Esconder catálogo entre projetos (obs 26 / PDF item 1) | Team.tsx: remover aba "Do catálogo" (isolamento de dados já vem da 0039 Bloco 5) | 4A |
| L10 | Sidebar nova completa (planilha + PDF): Mural, Agenda, Ordem do Dia, Roteiro & Decupagem, Produção, Roteiro, Direção, Dep de Arte, Dep de Fotografia, Dep de Som, Elenco, Pós Produção, Mapa de Transporte, Administrativo, Configurações | Sidebar.tsx reescrita + rotas novas em App.tsx; páginas de departamento agregam as antigas (ver §3) | 4B |
| L11 | Fundir Cronograma + Agenda (obs 21 + PDF) | Agenda absorve o planejamento por fases; rota /cronograma redireciona p/ /agenda | 4B |
| L12 | Mural = resumo de agenda (lista dos compromissos do usuário) + chat com 3 categorias (planilha) | novo Mural: coluna agenda (somente leitura) + coluna chat (geral/departamento/privado — DM usa canal tipo 'privado' da 0039 Bloco 9) | 4B |

### 🟡 FUNCIONALIDADES NOVAS (núcleo do teste)

| # | Demanda (origem) | Solução | Fase |
|---|---|---|---|
| F1 | OD completa: formulário baseado nos 3 exemplos (obs 18/19/25) | Formulário por seções no CallSheetEditor (campos no §4), salvo em dados_json | 4C |
| F2 | PDF da OD (obs 17/19) | já existe @media print da OD — revisar layout com as novas seções, botão "Baixar PDF" | 4C |
| F3 | Quem cria OD: Diretor(a), AD, Produtor(a) Geral + admin/produção (planilha) | gate no botão Nova OD via useProjectFunction + papel | 4C |
| F4 | OD publicada → alerta no Mural + agenda de todos (obs 19) | 0039 Bloco 6 (trigger) — front só exibe | 4A (DB) |
| F5 | PDF da decupagem (obs 16 / PDF item 5) | botão exportar na aba Decupagem usando @media print (mesma técnica da OD) | 4C |
| F6 | Roteiro × Decupagem em abas separadas + substituir roteiro com confirmação + comentários (PDF item 15 / txt 01) | Roteiro.tsx: Tabs "Roteiro" / "Decupagem"; confirmação já existe no substituir — adicionar dialog; comentários = campo observacoes | 4C |
| F7 | Decupagem alimenta Elenco (personagens) (PDF item 15 OBS) | pós-decupagem: upsert personagens detectados (nome) em `personagens` | 4C |
| F8 | Mapa de Transporte CRUD + links Maps + PDF + link público (obs 18/19 + planilha) | tabelas da 0039 Bloco 7; página nova MapaTransporte.tsx (lista→editor de trechos→print) | 4D |
| F9 | Fichas de elenco: foto, medidas, DRT, agente, menor de idade + docs do responsável, autorização de imagem (PDF itens 10/11/17 + planilha) | colunas da 0039 Bloco 8; Cast.tsx ganha modal de ficha completa + uploads (bucket documentos) | 4D |
| F10 | Arte/Figurino: aprovação do diretor (visto/em análise/aprovado/cancelado) + comentários + origem (acervo/aluguel/compra/empréstimo) + foto + vínculo personagem (PDF itens 12/16) | colunas da 0039 Bloco 8; FigurinoArte.tsx: badges de status + select origem + upload imagem | 4D |
| F11 | Locações: responsável, contatos, comentários/regras internas (PDF item 13) | colunas da 0039 Bloco 8; Locations.tsx: 3 campos novos | 4D |
| F12 | Docs de equipe: foto, RG, CPF, cartão CNPJ, residência, comprovante bancário (PDF item 3) | pessoas.documentos jsonb + bucket documentos; modal "Documentos" na Equipe | 4D |
| F13 | Upload de NF/recibos no financeiro (PDF itens 6/7) | já existe upload de comprovante (Sprint 3B) — aceitar PNG/PDF/JPEG (obs 08, conferir accept) | ✅/4A |
| F14 | RBAC: manter admin+produção; departamento/função define o resto (decisão Thiago) | useProjectFunction: mapa departamento→{abas visíveis, abas editáveis} conforme planilha (Produção edita tudo; Direção edita quase tudo; cada depto edita o seu; todos veem tudo) | 4B |
| F15 | Agenda: tipos de compromisso com regras por depto (planilha) | tipos: período de produção (só Produção), dia de gravação (Prod+Direção), reunião (todos), visita locação (Prod+Direção), teste/ensaio elenco (Elenco+Direção+Prod), tarefa (todos); validação no form | 4B |
| F16 | Aba Administrativo (planilha): contrato pessoal, docs, status de pagamento | v1 mínima: página que mostra o contrato + despesas/pagamentos da pessoa logada + upload de docs pessoais | 4D (stretch) |

### ⚪ ADIADO (registrar no roadmap, não cabe nos 10 dias)

| Demanda | Motivo |
|---|---|
| Mapa de transporte com IA de rotas (PDF item 4) | v1 manual com links Maps; IA de roteirização fica p/ pós-teste |
| Upload de orçamento → rubricas automáticas (PDF item 9) | precisa parser de planilha; pós-teste |
| Criar/editar recibos no financeiro (PDF item 8) | template de recibo; pós-teste |
| Chat com menções @pessoa (PDF item 14) | DM (canal privado) já cobre o "ser direcionado"; menções depois |
| Pós-produção: vídeo com comentários na timeline (planilha) | infra de vídeo pesada; placeholder na aba |
| Matriz fina por função (60+ funções) | decisão: departamento+admin/produção basta p/ teste |
| Boletins de gravação/logger (Foto/Som, planilha) | placeholder nas abas de depto |
| OBSERVAÇÕES ANTIGAS.txt | contemplado (convites, check-in, SIC, organograma, áudio) ou superado |

---

## 2. ORDEM DE EXECUÇÃO (10 dias)

| Fase | Dias | Entrega | Via |
|---|---|---|---|
| **4A** | D1–D2 | Migração 0039 no SQL Editor + todos os bugs/renomeações (B1–B10, L1–L9) | SQL Editor + Claude Code sessão 1 |
| **4B** | D3–D5 | Sidebar nova + rotas de departamento + Mural (agenda+chat) + Agenda unificada + RBAC por depto (L10–L12, F14, F15) | Claude Code sessão 2 |
| **4C** | D6–D7 | OD completa + PDF OD + PDF decupagem + abas Roteiro/Decupagem + personagens automáticos (F1–F7) | Claude Code sessão 3 |
| **4D** | D8–D9 | Mapa de Transporte + fichas Elenco/Arte/Locações/Docs equipe (F8–F12, F16 se sobrar) | Claude Code sessão 4 |
| **4E** | D10 | Caça-bugs final, teste de fluxo completo, deploy, convite às equipes | Cowork + PowerShell |

Depois de CADA sessão: `git add .` → `git commit` → `git push` → `vercel --prod` (PowerShell, sem `&&`).

---

## 3. SIDEBAR NOVA (mapa de rotas)

```
GERAL:    Página Inicial (/) · Projetos · Onboarding
PROJETO:  Mural               → ProjectDashboard renovado (agenda resumo + chat)
          Agenda              → Agenda unificada (absorve Cronograma)
          Ordem do Dia        → CallSheets/CallSheetEditor
          Roteiro & Decupagem → Roteiro.tsx (abas: Roteiro | Decupagem) — visualização geral
          ── DEPARTAMENTOS (visíveis a todos; edição conforme F14) ──
          Produção            → hub com sub-abas: Equipe · Locações · Financeiro ·
                                Fornecedores · Contrato · Prestação
          Roteiro (depto)     → edição de roteiro/decupagem
          Direção             → criar OD · stripboard · continuidade (placeholder)
          Dep de Arte         → Figurino e Arte (com aprovações)
          Dep de Fotografia   → placeholder (equipamentos/referências)
          Dep de Som          → placeholder (equipamentos/boletins)
          Elenco              → Cast.tsx (fichas completas)
          Pós Produção        → placeholder
          ──
          Mapa de Transporte  → página nova
          Administrativo      → página nova (v1 mínima)
          Configurações       → Settings (Conta × Gestão do Projeto × Lixeira)
```
Matriz de edição (F14): Produção edita tudo; Direção edita tudo menos Produção;
Arte edita Arte+Elenco; Foto edita Foto+Pós; Som edita Som+Pós; Roteiro edita Roteiro;
Elenco edita Elenco; Pós edita Pós. Todos visualizam tudo. admin/owner/produção = total.

## 4. FORMULÁRIO OD COMPLETA (extraído dos 3 exemplos)

Seções (todas opcionais, salvas em `dados_json`):
1. **Cabeçalho**: nº da OD (#X de Y) · data (dia da semana auto) · unidade/ciclo · direção · produção
2. **Chamadas**: chamada geral · café (início–fim, local) · roda · almoço (início–fim, local) · corta câmera · fim do dia
3. **Previsão do tempo**: condição · mín/máx · % chuva · nascer/pôr do sol
4. **Avisos do dia**: lista livre
5. **Locações**: locação(ões) do dia + bases (camarim, refeição, logger) — puxa do cadastro
6. **Hora a hora**: linhas {início, fim, atividade} (café/preparação/RODA/almoço/desprodução/deslocamento/livre)
7. **Cenas do dia**: {nº cena, INT/EXT, DIA/NOITE, set/locação, resumo, elenco, págs, figs, prepara/roda} + bloco standby + opção chuva
8. **Elenco**: {personagem, ator, cenas, chega, caracterização, figurino, pronta, prev. saída} — puxa de personagens
9. **Figuração**: {qtd, descrição, cenas, chega, camarim, prontos, saída}
10. **Equipe**: blocos {depto/nomes, chegada}
11. **Análise técnica por cena**: {cena, categoria (arte/figurino/som/foto/direção), itens}
12. **Contatos importantes**: {função, nome, telefone}
13. **Rodapé**: hospital mais próximo · canais de rádio · links úteis · observações gerais · resumo do dia seguinte

PDF: layout 1-2 páginas no estilo do EXEMPLO 1 (grade compacta), via @media print.

## 5. PENDÊNCIAS MANUAIS (Thiago)

1. **Rodar a migração**: abrir https://supabase.com/dashboard/project/dsrulpipsksvtskqwevc/sql → colar `cineflow-mvp/supabase/migrations/0039_sprint4_consolidada.sql` inteira → Run. Erros de "already exists" podem ser ignorados.
2. Testar em produção: criar planejamento, criar OD sem dia vinculado, criar evento na agenda, adicionar pessoa repetida (deve virar "função adicionada" após sessão 4A do Code).
3. `VITE_EDGE_SHARED_SECRET` no `.env` (pendência antiga, e-mail da OD).
4. As logos novas estão em `Pictures/Screenshots/nova leva de observações Glauber/` — a sessão 4A vai copiá-las para `cineflow-mvp/src/assets/`.

## 6. PROMPT PARA INICIAR A SESSÃO 4A NO CLAUDE CODE

```
Leia SPRINT_4_SPEC.md e SPRINT_STATE.md na raiz do projeto (pasta acima de cineflow-mvp).
Execute a FASE 4A da spec: itens B4, B6, B7(front), B8, B9 e L1–L9 do checklist.
A migração 0039 já foi aplicada no Supabase (não criar SQL novo).
Regras: PowerShell sem &&; Radix SelectItem nunca com value=""; arquivos .tsx grandes
editar com cuidado; ao final rodar npx tsc --noEmit e me passar os comandos de
git/vercel --prod. Não avance para a fase 4B sem eu pedir.
```

(Para 4B/4C/4D: mesmo padrão, trocando a fase. Cada sessão termina com commit+deploy.)
