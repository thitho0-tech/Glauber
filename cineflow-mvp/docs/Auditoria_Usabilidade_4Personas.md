# Auditoria de Usabilidade — CINEFLOW MVP

> **Documento de referência para a próxima fase do produto.**
> Consolida quatro testes de usabilidade simulados a partir das personas
> centrais do mercado audiovisual brasileiro: **Produtor**, **1º Assistente
> de Direção**, **Diretor de Produção** e **Diretor**.
>
> **Data:** 26 de maio de 2026
> **Versão CINEFLOW auditada:** pós-deploy da migration 0023 (Roteiro + Decupagem IA via Mistral large)
> **Base de referência:** O Assistente de Direção Cinematográfica (Pierre Malfille, Embrafilme 1979), Organograma de Produção AV Brasileira, Manual de Prestação de Contas Funcultura 2024, comparativos com Movie Magic Budgeting/Scheduling, StudioBinder, Yamdu, Croogloo, Wrapbook, SetKeeper, Frame.io, Milanote, ShotDeck.

---

## Índice

1. [Resumo executivo](#1-resumo-executivo)
2. [Lacunas transversais (atingem 2+ personas)](#2-lacunas-transversais-atingem-2-personas)
3. [Persona A — Produtor (Chico)](#3-persona-a--produtor-chico)
4. [Persona B — 1º Assistente de Direção (Mariana)](#4-persona-b--1-assistente-de-direção-mariana)
5. [Persona C — Diretor de Produção (Tereza)](#5-persona-c--diretor-de-produção-tereza)
6. [Persona D — Diretor (Caio)](#6-persona-d--diretor-caio)
7. [Comparativo com concorrentes](#7-comparativo-com-concorrentes)
8. [Lista mestra unificada (priorizada)](#8-lista-mestra-unificada-priorizada)
9. [Fundações que destravam múltiplas personas](#9-fundações-que-destravam-múltiplas-personas)
10. [Plano de sprints sugerido](#10-plano-de-sprints-sugerido)
11. [Veredito de cada persona](#11-veredito-de-cada-persona)

---

## 1. Resumo executivo

O CINEFLOW MVP é hoje uma **boa central de gestão e comunicação** para projetos audiovisuais pequenos a médios, com **dois diferenciais reais de mercado brasileiro**:

1. **Compreensão de edital nacional** (rubricas Funcultura/SIC, teto, validações).
2. **Decupagem de roteiro por IA** (Mistral large em JSON mode) — feature inédita no mercado nacional.

Em compensação, ele **não substitui ainda nenhum dos quatro papéis principais** de uma produção. Cada persona testada continua dependente de ferramentas externas:

| Persona | O que continua usando fora do CINEFLOW |
|---|---|
| Produtor | Drive (anexos), planilha (NF), WhatsApp |
| 1º AD | Movie Magic Scheduling, StudioBinder, caderno de continuidade |
| Diretor de Produção | Movie Magic Budgeting, Conta Simples, Excel para folha |
| Diretor | Milanote (lookbook), Frame.io (rushes/cortes), Final Draft, WhatsApp |

**A oportunidade estratégica** é fechar a costura entre roteiro → cronograma → OD → execução → prestação de contas em uma só ferramenta, em português, adequada à legislação brasileira (RPA, INSS, ISS, Funcultura, SIC). Nenhum concorrente internacional faz isso. Os concorrentes brasileiros existentes são planilhas customizadas.

### Severidade total identificada

| Gravidade | Quantidade |
|---|---|
| 🟥 Bloqueante (impede uso real em produção média) | **34 itens** |
| 🟧 Grave (atrito sério, força workarounds externos) | **41 itens** |
| 🟨 Atrito (custa tempo, mas não bloqueia) | **24 itens** |
| 🟦 Cosmético | **8 itens** |

---

## 2. Lacunas transversais (atingem 2+ personas)

Estas são as **maiores oportunidades de impacto**: uma única implementação destrava várias personas de uma vez.

| # | Lacuna | Personas afetadas | Gravidade | Esforço |
|---|---|---|---|---|
| T1 | **Storage privado para anexos** (NF, RG, planta de locação, comprovante, referência visual, foto/áudio em mensagem) com signed URL | Produtor, AD, DP, Diretor | 🟥 | M |
| T2 | **Decupagem IA cria registros** em personagens / arte / figurino / locação (com dedupe e dry-run) | Produtor, AD, DP, Diretor | 🟥 | M |
| T3 | **Tabela `dia_cenas`** (cenas de cada dia de filmagem) ligando roteiro → cronograma → OD | AD, DP, Diretor | 🟥 | M |
| T4 | **Locações por projeto** (não por org) + ficha completa (planta, fotos, autorização PDF, energia, hospital, ruídos) | Produtor, AD, DP | 🟥 | M |
| T5 | **Multi-produtora** real (substituir `orgs?.[0]?.org.id` por seletor de produtora ativa) | Produtor, DP | 🟧 | M |
| T6 | **Trilha de auditoria** (`audit_log`: quem fez o quê, quando) | Produtor, DP | 🟥 | S |
| T7 | **Anexo de imagem + @menção no chat** + vincular mensagem a cena/plano/personagem | Produtor, AD, Diretor | 🟥 | S |
| T8 | **Status visível do convite** na lista de Equipe (pendente / aceito / recusado) | Produtor, DP | 🟨 | XS |
| T9 | **Tarefas / compromissos** com responsável + prazo + status, polimórficas (vinculadas a cena, dept, fornecedor, despesa) | AD, DP, Diretor | 🟥 | M |
| T10 | **Senha mínima padronizada em 8 chars** (signup × convite) | Produtor, DP, AD, Diretor | 🟥 | XS |
| T11 | **Upload de NF/RPA/comprovante** com parsing XML NFe + foto cupom + OCR | Produtor, DP | 🟥 | M |
| T12 | **Versionamento** (roteiro, orçamento, corte, OD) com histórico e diff | DP, Diretor | 🟧 | M |
| T13 | **Validade de prestação + dashboard de prazos críticos** no topo do projeto | Produtor, DP | 🟧 | S |

> **Observação:** os 13 itens transversais sozinhos resolveriam cerca de 40% das fragilidades catalogadas neste documento.

---

## 3. Persona A — Produtor (Chico)

**Quem é:** Produtor de longa pernambucano via SIC/Funcultura, foi o primeiro usuário do MVP, dono do projeto que motivou os testes. Cuida da viabilização, contratos e prestação de contas, mas delega operação para o Diretor de Produção.

**Top 10 fragilidades:**

| # | Tema | Gravidade | Esforço | Por que importa |
|---|---|---|---|---|
| P1 | Upload de NF/recibo + comprovante de pagamento + RPA pra PF | 🟥 | M | Sem isso, Prestação é teatro |
| P2 | Decupagem → criar personagens/arte/figurino/locação automaticamente | 🟥 | M | A IA está jogando 80% do valor fora |
| P3 | Cenas ↔ dias de filmagem ↔ OD (puxar cenas do roteiro pra OD) | 🟥 | M | Quebra a promessa "tudo conectado" |
| P4 | Senha padronizada em 8 chars (signup + convite) | 🟥 | XS | Login do convidado vai falhar silenciosamente |
| P5 | Onboarding renomeado + upload nativo (sem URL pública) | 🟧 | S | Nenhum produtor coloca RG em Drive aberto |
| P6 | Multi-produtora real (`orgs[0]` → seletor) | 🟧 | M | Coproduções são regra, não exceção |
| P7 | Validação de CNPJ + busca por fornecedor + fornecedor único | 🟧 | M | Agregação de despesas por fornecedor fica impossível |
| P8 | Locações por projeto (não por org) + foto/autorização anexada | 🟧 | S | Hoje vira pasta gigante misturada |
| P9 | Editar cena após decupagem + "marcar como verificada" | 🟧 | S | IA erra; sem edição, re-decupar é destrutivo |
| P10 | Status do convite visível na lista de Equipe | 🟨 | XS | Produtor não sabe quem ainda não entrou |

**Quick wins do Produtor (< 1h cada):**
- Padronizar senha mínima em 8 (signup)
- Confirmação no "Re-decupar"
- Coluna "status convite" na tabela Team
- Máscara de CNPJ
- Aviso "PDF até 8MB" no input do roteiro

**Outras fragilidades catalogadas (não-top 10):**
- "Verifique seu e-mail" pode ser mentira (rate limit Supabase free)
- Sem fallback "criar produtora agora" se trigger falhar
- Onboarding com nome enganoso (devia ser "Documentos da equipe")
- Status de documento sem cor/badge visual
- Sem campo Diretor/Produtor Executivo/Responsável no projeto
- Equipe principal não vincula `funcao_av_id`
- Sem editar pessoa do projeto após adicionar
- Re-decupar destrói anotações
- Sem agrupamento de cenas por locação/dia/personagem
- Sem confirmação no Re-decupar
- Sem distinção PF (RPA) vs PJ (NF)
- Sem upload de extrato bancário / OFX
- Sem rateio de despesa (1 NF → N rubricas)
- Sem contas a pagar / fluxo de caixa
- Validações de edital sem trigger visível
- Sem export pra SICONV / Funcultura
- Sem comprovante de pagamento como segundo anexo
- Contrato sem assinatura digital integrada
- RBAC parcialmente aplicado
- Sem trilha de auditoria

---

## 4. Persona B — 1º Assistente de Direção (Mariana)

**Quem é:** 1ª AD com 9 anos de set, formada pela AIC + Movie Magic. Faz cronograma de produção (DOOD/Stripboard), OD, gerencia tempo no set, garante que o roteiro seja filmado no prazo.

**Documentos centrais do AD** (Pierre Malfille, Parte II): detalhamento por cenário, lista de roupas por ator (numerada), carteias (= strips), plano de trabalho (stripboard com cores), plano de rotação de cenários, folha de serviço (= OD em 5 partes), fichas de locação (planta + fotos + autorizações + energia + hospital), fichas de ator (foto rosto/corpo + talentos + agenda), caderno de figuração.

**Top 15 fragilidades:**

| # | Lacuna | Gravidade | Esforço | Impacto |
|---|---|---|---|---|
| A1 | Tabela `dia_cenas` (cenas no dia) + UI de stripboard arrastável | 🟥 | M-L | Destrava tudo — OD, DOOD, páginas/dia |
| A2 | Day-Out-of-Days auto-gerado a partir do schedule (SW/W/H/WF) | 🟥 | M | Sem isso o AD volta pro Movie Magic |
| A3 | Páginas / eighths por cena + alerta de páginas/dia | 🟥 | S | Métrica universal da indústria |
| A4 | Aplicar decupagem da IA → cria personagens/figurinos/arte/locação | 🟥 | M | A IA está jogando 80% do valor fora |
| A5 | Breakdown sheet padrão (categoria colorida, status, dono) | 🟥 | M | Documento central do AD |
| A6 | Convocação escalonada por pessoa na OD (call time individual) | 🟥 | S | Sem isso a OD não tem valor operacional |
| A7 | OD puxa cenas do dia com personagens, páginas, locação | 🟥 | S | Primeira coisa que equipe lê |
| A8 | Personagens estruturados + medidas + restrições + agente | 🟥 | S | Base da ficha de ator |
| A9 | Ficha de locação completa: planta, fotos, autorização PDF, energia, hospital | 🟥 | M | Exigência de seguro + produção real |
| A10 | Re-decupar não-destrutivo (merge inteligente) | 🟥 | S | Mariana ajusta 30+ vezes |
| A11 | Daily Production Report (ata do dia) com takes/horas/desvios | 🟥 | M | Documento exigido pela indústria |
| A12 | Sol nascer/pôr + clima via API + CEP/data | 🟧 | S | Quick win, ganho imediato |
| A13 | Continuidade digital (take notes, raccord) | 🟧 | L | Substituiria caderno da continuísta |
| A14 | Figuração como módulo (cadastro, convocação, recibo) | 🟧 | M | Filme com 20+ figurantes não usa |
| A15 | Envio OD por WhatsApp + confirmação de leitura | 🟧 | M | Canal real do set brasileiro |

**Outras fragilidades catalogadas:**

*Decupagem/breakdown:*
- Sem `eighths` (oitavos de página) por cena
- Sem combo I/E + D/N como filtro de primeira classe
- Sem categoria controlada de elementos (props, wardrobe, vehicles, animals, FX, stunts, makeup, sound, music, security)
- Sem campo dono / responsável por elemento de cena
- Sem status (a providenciar / providenciado / em set)
- Sem custo estimado por elemento
- Sem campo páginas / eighths automático
- Sem status "rodada / omitida / unit B"
- Sem importação FDX com tags do Final Draft (personagens, locações)

*Cronograma/stripboard:*
- Não há stripboard arrastável
- Não há "tudo na locação X agrupado"
- Não há páginas por dia
- Não há one-liner / schedule print (PDF)
- Sem rotação de cenário/estúdio (azul construção, vermelho filmagem, amarelo demolição)
- Sem alerta de conflito (ator escalado em 2 dias, locação 2 projetos)

*Locações:*
- Locação é da org, não do projeto
- Ficha de locação raso (sem planta, fotos múltiplas, autorização, energia, hospital, banheiros, ruídos)

*Elenco/figuração:*
- Vínculo personagem ↔ ator 1:1 forçado (sem dublê, voz over, photo double)
- Sem ficha de ator no padrão (foto rosto + corpo, medidas, restrições, agente)
- Sem cadastro de figuração por categoria

*OD:*
- OD não convoca por horário escalonado
- OD não tem ordem de filmagem dos planos do dia
- OD não tem mapa anexado
- OD não tem nascer/pôr do sol automático
- OD não tem previsão de clima
- Sem ordem de maquiagem
- Sem versionar OD
- OD não vai embora (sem WhatsApp, sem leitura, sem OD por dept)

*Set/jornada:*
- Sem ata do dia / DPR
- Sem continuidade digital
- Sem check-in real no set (migration 0008 existe mas sem botão)
- Sem walkie / broadcast / mensagem fixada
- Áudio sem transcrição
- Sem marcar cena como rodada ao vivo
- Sem foto/anexo na mensagem
- Sem agenda integrada

*Pós/wrap:*
- Sem export DPR / end-of-day
- Sem wrap report
- Sem link de copiões

---

## 5. Persona C — Diretor de Produção (Tereza)

**Quem é:** DP com 15 anos de estrada, longa pernambucano via SIC/Funcultura R$ 1.8M, 35 diárias em 4 cidades, 52 pessoas, ~30 fornecedores. *"Orçamento é promessa; prestação é o que sobrou pra defender."*

**Top 20 fragilidades:**

| # | Tema | Gravidade | Esforço | Por que importa |
|---|---|---|---|---|
| DP1 | Upload de NF/RPA/comprovante + parsing XML NFe | 🟥 | M | Prestação inviável sem isso |
| DP2 | Orçamento 3 níveis (account > line > detail) + unit × qty × rate | 🟥 | M | Padrão da indústria |
| DP3 | Fringes (INSS/FGTS/IR/ISS) por linha | 🟥 | S | Sem isso top sheet não fecha |
| DP4 | Regime de contratação (CLT/MEI/RPA/PJ) + dados bancários + dependentes | 🟥 | M | Base pra folha e RPA |
| DP5 | Folha de pagamento + RPA (cálculo + emissão PDF) | 🟥 | L | Coração do DP brasileiro |
| DP6 | Petty cash / caixa pequeno (adiantamento → prestação com foto cupom + OCR) | 🟥 | M | Diário em set |
| DP7 | Fornecedores: cadastro + cotação (3) + Ordem de Compra | 🟥 | M | Funcultura exige cotação prévia |
| DP8 | Conta bancária do projeto + extrato + conciliação OFX | 🟥 | M | Exigência da Funcultura |
| DP9 | Trilha de auditoria (quem fez o quê) | 🟥 | S | Defesa de impugnação |
| DP10 | Pacote de prestação Funcultura (geração 1-clique com checklist) | 🟥 | M | **Killer feature** dessa fatia |
| DP11 | Versões de orçamento (V1, V2 aprovado, V3 revisto) | 🟧 | S | Histórico de decisão |
| DP12 | Rateio de despesa (1 NF → N rubricas) | 🟧 | S | Realidade comum |
| DP13 | Rooming list (hospedagem) + transporte por dia | 🟧 | M | Logística de longa real |
| DP14 | Catering com restrições alimentares por pessoa | 🟧 | S | Some R$ 80-120k num longa |
| DP15 | Fluxo de aprovação de despesa (solicitar → aprovar → pagar) | 🟧 | M | Governança |
| DP16 | Fluxo de caixa projetado (entrada parcelas vs. saída) | 🟧 | M | DP planeja meses à frente |
| DP17 | Per diem / ajuda de custo | 🟧 | XS | Regra trabalhista |
| DP18 | Contrato a partir de template (equipe e fornecedor) | 🟧 | M | Cada produtora reinventa |
| DP19 | Consulta de regularidade fiscal do fornecedor (Sintegra, CND) | 🟨 | M | Reduz glosa |
| DP20 | Multi-moeda para coprodução internacional | 🟨 | M | Necessário em projetos R$ 1M+ |

**Quick wins do DP (< 1 dia cada):**
- Campo regime de contratação no `projeto_pessoas` (enum)
- Campo conta bancária do projeto no `projetos` (4 campos)
- Campo CNPJ do projeto/produtora
- Campo dependentes IR no `pessoas`
- Tela de "validade de prestação" no topo do projeto
- Per diem como tipo de despesa

**Outras fragilidades catalogadas:**
- Sem conta-corrente exclusiva atrelada ao projeto
- Sem ficha do projeto no padrão edital (nº processo, CNPJ proponente, prazos)
- Sem dashboard de prazos críticos
- Sem coprodutores com %
- Orçamento só 2 níveis (sem detail)
- Sem unit × qty × rate
- Sem fringes
- Sem versões de orçamento
- Sem multi-moeda
- Sem above the line / below the line / pós / contingência
- Sem contingency 10% automática
- Sem export PDF top sheet
- Sem comparar orçado × cotado × realizado
- Sem comparativos com média histórica da produtora
- Sem campo regime de contratação (CLT/MEI/RPA/PJ)
- Sem dados bancários do contratado
- Sem dependentes IR
- Sem contrato gerado a partir de template
- Sem DOOD → cálculo automático de cachê
- Sem onboarding sequencial obrigatório (RG/CPF/banco/contrato/seguro)
- Sem registro de horas extras / noturnas
- Sem categoria sindical
- Sem módulo de fornecedores
- Sem cotação (RFQ)
- Sem Ordem de Compra (PO)
- Sem contrato de fornecimento
- Sem entrega/recebimento
- Sem catálogo de equipamentos
- Sem folha de pagamento
- Sem geração de DARF/GPS/guias
- Sem remessa bancária OFX/CNAB240
- Sem relatório de folha do dia
- Sem histórico de cachê por pessoa entre projetos
- Sem alerta sindical (cachê mínimo SATED-PE)
- Sem módulo de transporte
- Sem hospedagem (rooming list)
- Sem alimentação (catering)
- Sem per diem
- Sem loadlist de equipamento por dia
- Sem petty cash
- Sem upload de cupom fiscal por foto + OCR
- Sem cartão produção (Conta Simples, Caju, Flash)
- Sem importação NFe via XML
- Sem consulta validade fiscal fornecedor
- Sem conciliação bancária
- Sem fluxo de aprovação de despesa
- Sem categoria por tipo (diária/NF/RPA/cupom/boleto/cartão)
- Sem previsto vs. realizado tempo real com alerta
- Sem fluxo de caixa projetado
- Sem export contábil padrão
- Sem geração de pacote de prestação
- Sem checklist Funcultura por despesa
- Sem trilha de auditoria
- Sem geração de relatório de impugnação resposta
- Sem comparativo orçado aprovado vs. realizado
- Sem saldo a devolver à Fundarpe
- Sem export SICONV / Mapa de Pagamentos

---

## 6. Persona D — Diretor (Caio)

**Quem é:** Diretor pernambucano, 14 anos, 2 longas e 4 curtas. *Curador, conselheiro e árbitro final.* Vive entre três cadernos (referências, decupagem, diário de set). Usa Final Draft + Milanote + ShotDeck + Frame.io + WhatsApp.

**Três coisas básicas que o diretor precisa e o CINEFLOW quase não oferece:**
1. **Visualizar entregas** dos departamentos com **comentário no ponto exato** (frame, segundo, linha).
2. **Gerar compromisso** (decisão criativa registrada, ata, aprovação) vinculado a cena/personagem/departamento.
3. **Acompanhar tarefas criativas** que ele mesmo demandou com prazo, responsável e status.

**Top 18 fragilidades:**

| # | Lacuna | Gravidade | Esforço | Por que importa |
|---|---|---|---|---|
| D1 | Player de vídeo com comentário no timecode (testes elenco, rushes, demos, cortes) | 🟥 | L | Coração do Frame.io |
| D2 | Tarefas/compromissos criativos (atribuir, prazo, status) com vínculo a cena/dept/pessoa | 🟥 | M | Pedido explícito |
| D3 | Atas de reunião criativa (decisões + responsáveis + prazos gerados) | 🟥 | S | Memória do projeto |
| D4 | Editar / adicionar / reordenar planos sugeridos + anexar referência visual | 🟥 | M | Decoupage é trabalho cotidiano |
| D5 | Versionamento de roteiro + diff + comentário em linha | 🟥 | M | Roteiro vive em V1-V12 |
| D6 | Lookbook (boards visuais por cena/sequência + paleta + tratamento) | 🟥 | L | Sem isso, diretor não entra na pré |
| D7 | Aprovação criativa formal (aprovar / pedir ajuste / rejeitar) por entrega de dept | 🟥 | M | Linguagem comum DF/Arte/Som/Figurino |
| D8 | Anexo de imagem no chat + @menção + vincular a cena/plano | 🟥 | S | Hoje toda conversa criativa é WhatsApp |
| D9 | Registro de takes por plano (boa/marca/refilmar) + nota | 🟥 | S | Continuidade no set + escolha de corte |
| D10 | Upload e player de rushes/copiões diários com comentário | 🟥 | L | Padrão Frame.io |
| D11 | Storyboard / anexo de sketch / frame por plano | 🟧 | M | Visualização do plano |
| D12 | Comparativo de candidatos de elenco lado a lado | 🟧 | M | Casting moderno |
| D13 | Versionamento de corte + changelog | 🟧 | M | Identidade da pós |
| D14 | Treatment writeup (texto longo de intenção do filme) | 🟧 | S | Documento de captação |
| D15 | Briefing por departamento (intenção diretor → chefe departamento) | 🟧 | S | Linguagem comum em pré |
| D16 | Agenda de prep + reuniões (calendário do diretor por projeto) | 🟧 | M | Diretor vive de reunião |
| D17 | Módulo de festivais / EPK | 🟨 | M | Lançamento |
| D18 | Histórico do projeto (timeline visual da obra) | 🟨 | S | Memória + portfólio |

**Quick wins do Diretor (< 1 dia cada):**
- Coluna "boa / marca / refilmar" no `roteiro_planos_sugeridos`
- Campo `intencao` em `roteiro_cenas`
- Campo `referencia_url` (array) no `roteiro_planos_sugeridos`
- Botão "editar plano" e "+plano" na cena
- Reorder via drag-and-drop nos planos
- Histórico de status do `roteiros`

**Outras fragilidades catalogadas:**
- Sem versionamento de roteiro (UNIQUE projeto_id no `roteiros`)
- Sem diff entre versões
- Sem lookbook
- Sem comentário em cena/linha do roteiro
- Sem treatment writeup
- Sem mood board por cena/sequência
- Sem campo intenção/objetivo da cena
- Sem reading list / bibliografia
- Sem upload de vídeo de teste de elenco
- Sem player com comentário no timecode
- Sem comparativo de candidatos lado a lado
- Sem callback / chamada de retorno
- Sem ficha de audição (range etário, sotaque, talentos)
- Sem nota de leitura de mesa
- Sem agenda de ensaio
- Sem editar plano sugerido pela IA
- Sem adicionar plano novo
- Sem reordenar planos
- Sem anexar referência visual ao plano
- Sem storyboard
- Sem marcar plano obrigatório/desejável/nice-to-have
- Sem comentar plano com DF
- Sem duplicar plano
- Sem tempo estimado por plano
- Sem ata de reunião
- Sem sistema de tarefas/compromissos por dept
- Sem aprovação criativa formal
- Sem agenda integrada
- Sem prep schedule
- Sem notificação push
- Sem dashboard "minhas pendências como diretor"
- Sem registro de takes
- Sem upload de rushes/copiões
- Sem comparativo de takes
- Sem anotação de set
- Sem alteração de decupagem em set
- Sem foto/vídeo de raccord
- Sem player de vídeo com comentário no timecode
- Sem versionamento de corte
- Sem aprovação de demo de trilha/paleta/mixagem
- Sem changelog do corte
- Sem briefing pra montadora/colorista/compositor
- Sem comparativo de versões de corte
- Sem módulo de festivais
- Sem EPK
- Sem agenda de divulgação
- Sem clipping
- Sem @menção no chat
- Sem anexo de imagem no chat
- Sem vinculação de mensagem com cena/plano/personagem
- Sem documento compartilhado co-editado
- Sem histórico cronológico do projeto
- Sem diário do diretor
- Sem export pra portfólio

---

## 7. Comparativo com concorrentes

| Capacidade | CINEFLOW | Movie Magic | StudioBinder | Yamdu | Croogloo | Wrapbook | Frame.io | Milanote |
|---|---|---|---|---|---|---|---|---|
| Orçamento 3 níveis + fringes | ❌ | ✅ | ✅ | ✅ | ➖ | ✅ | ❌ | ❌ |
| Versões de orçamento | ❌ | ✅ | ✅ | ✅ | ➖ | ✅ | ❌ | ❌ |
| Multi-moeda | ❌ | ✅ | ➖ | ✅ | ➖ | ✅ | ❌ | ❌ |
| DOOD / Stripboard | ❌ | ✅ | ✅ | ✅ | ✅ | ➖ | ❌ | ❌ |
| Folha + RPA | ❌ | ➖ | ➖ | ➖ | ➖ | ✅ | ❌ | ❌ |
| Petty cash | ❌ | ➖ | ➖ | ✅ | ✅ | ✅ | ❌ | ❌ |
| PO / cotação | ❌ | ➖ | ➖ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Conciliação OFX | ❌ | ➖ | ➖ | ➖ | ✅ | ✅ | ❌ | ❌ |
| Upload NF/comprovante | ❌ | ➖ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| OCR roteiro + decupagem IA | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ❌ | ❌ |
| Lookbook / moodboard | ❌ | ❌ | ✅ | ➖ | ❌ | ❌ | ➖ | ✅ |
| Player vídeo + comentário timecode | ❌ | ❌ | ➖ | ➖ | ❌ | ❌ | ✅ | ❌ |
| Storyboard | ❌ | ❌ | ✅ | ➖ | ❌ | ❌ | ❌ | ✅ |
| OD/call sheet | ✅ | ➖ | ✅ | ✅ | ✅ | ➖ | ❌ | ❌ |
| Chat de produção | ✅ | ❌ | ➖ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Adequação a edital BR | ✅ (parcial) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Editais BR (SIC, Funcultura, FSA) | ✅ (parcial) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Português + suporte BR | ✅ | ❌ | ❌ | ➖ | ❌ | ❌ | ❌ | ❌ |

### Posicionamento estratégico

**Vantagem competitiva única do CINEFLOW** = é o **único** que entende edital brasileiro e fala português.
**Vantagens secundárias** = decupagem por IA (inédito no segmento) + chat de produção integrado.

**Não tente ganhar do StudioBinder em UI de stripboard ou do Frame.io em player.** Ganhe na promessa **"do roteiro à prestação de contas Funcultura sem sair daqui, em português, com IA"**.

---

## 8. Lista mestra unificada (priorizada)

Combinação dos itens das 4 personas, deduplicada, com persona que mais demanda marcada em **negrito**.

### Bloqueantes (🟥) — 34 itens

| # | Lacuna | Personas | Esforço |
|---|---|---|---|
| M1 | Storage privado + signed URL pra anexos (NF/RG/planta/referência) | **Todas** | M |
| M2 | Senha mínima padronizada 8 chars (signup × convite) | **Todas** | XS |
| M3 | Tabela `dia_cenas` + UI de stripboard arrastável | **AD**, DP, Diretor | L |
| M4 | Day-Out-of-Days (códigos SW/W/H/WF) auto-gerado | **AD**, DP | M |
| M5 | Páginas / eighths por cena + alerta páginas/dia | **AD** | S |
| M6 | Aplicar decupagem da IA → cria personagens/figurinos/arte/locação | **Todas** | M |
| M7 | Editar / adicionar / reordenar planos sugeridos + anexar referência | **Diretor**, AD | M |
| M8 | Re-decupar não-destrutivo (merge inteligente) | **AD**, Diretor | S |
| M9 | Breakdown sheet padrão (categoria colorida + status + dono) | **AD**, DP | M |
| M10 | Convocação escalonada por pessoa na OD (call time individual) | **AD** | S |
| M11 | OD puxa cenas do dia com personagens, páginas, locação | **AD**, DP | S |
| M12 | Personagens estruturados + medidas + restrições + agente | **AD**, Diretor | S |
| M13 | Ficha de locação completa (planta, fotos, autorização, energia, hospital) | **AD**, DP | M |
| M14 | Locações por projeto (não por org) | **Todas** | S |
| M15 | Daily Production Report (ata do dia: takes/horas/desvios) | **AD**, DP | M |
| M16 | Upload de NF/RPA/comprovante + parsing XML NFe + foto cupom + OCR | **DP**, Produtor | M |
| M17 | Orçamento 3 níveis + unit × qty × rate | **DP** | M |
| M18 | Fringes (INSS/FGTS/IR/ISS) por linha | **DP** | S |
| M19 | Regime de contratação (CLT/MEI/RPA/PJ) + dados bancários + dependentes | **DP** | M |
| M20 | Folha de pagamento + RPA (cálculo + emissão PDF) | **DP** | L |
| M21 | Petty cash / caixa pequeno (adiantamento + cupom + OCR) | **DP** | M |
| M22 | Fornecedores: cadastro + cotação 3x + Ordem de Compra | **DP** | M |
| M23 | Conta bancária exclusiva do projeto + extrato + conciliação OFX | **DP**, Produtor | M |
| M24 | Trilha de auditoria (audit_log) | **DP**, Produtor | S |
| M25 | Pacote de prestação Funcultura (geração 1-clique com checklist) | **DP**, Produtor | M |
| M26 | Player de vídeo com comentário no timecode | **Diretor** | L |
| M27 | Tarefas/compromissos polimórficos (cena/dept/pessoa/fornecedor/despesa) | **Diretor**, AD, DP | M |
| M28 | Atas de reunião (decisões + responsáveis + prazos gerados) | **Diretor**, DP | S |
| M29 | Versionamento de roteiro + diff + comentário em linha | **Diretor** | M |
| M30 | Lookbook (boards visuais + paleta + tratamento) | **Diretor** | L |
| M31 | Aprovação criativa formal (aprovar/pedir ajuste/rejeitar) | **Diretor** | M |
| M32 | Anexo de imagem + @menção no chat + vincular a cena/plano | **Diretor**, AD, Produtor | S |
| M33 | Registro de takes por plano (boa/marca/refilmar) + nota | **Diretor**, AD | S |
| M34 | Upload e player de rushes/copiões diários com comentário | **Diretor** | L |

### Graves (🟧) — 41 itens (resumo, lista completa nas seções por persona)

- Multi-produtora real (substituir `orgs[0]`)
- Validação CNPJ + busca fornecedor + dedupe
- Onboarding nativo (sem URL pública) + renomear pra "Documentos"
- Versões de orçamento (V1/V2/V3)
- Rateio de despesa (1 NF → N rubricas)
- Rooming list + transporte por dia
- Catering com restrições alimentares
- Fluxo de aprovação de despesa
- Fluxo de caixa projetado
- Storyboard / anexo de sketch por plano
- Comparativo candidatos de elenco
- Versionamento de corte + changelog
- Treatment writeup
- Briefing por departamento
- Agenda de prep + reuniões
- Per diem como tipo de despesa
- Contrato a partir de template
- Sol nascer/pôr + clima via API
- Continuidade digital (raccord)
- Figuração como módulo
- Envio OD por WhatsApp + confirmação leitura
- Rotação de cenário (construção/filmagem/demolição)
- Alerta de conflito (ator/locação overbooked)
- Categoria controlada de elementos de cena (props/wardrobe/etc.)
- Status de elemento (providenciar/providenciado/em set)
- I/E + D/N como filtro de primeira classe
- OD versionada
- OD reduzida por departamento
- DOOD → cálculo automático de cachê
- Onboarding sequencial obrigatório (RG/CPF/banco/contrato/seguro)
- Categoria sindical (SATED-PE/STIC/DRT)
- Contrato de fornecimento (template)
- Entrega/recebimento de equipamento
- Relatório de folha do dia
- Histórico de cachê por pessoa entre projetos
- Importação NFe via XML
- Consulta validade fiscal fornecedor (Sintegra/CND)
- Comparativo orçado aprovado vs realizado
- Saldo a devolver à Fundarpe
- Resposta a impugnação (template + anexos)
- Dashboard de prazos críticos no topo do projeto

### Atritos (🟨) — 24 itens (resumo)

- Status convite visível na lista Team
- Confirmação no "Re-decupar"
- Máscara CNPJ
- Aviso "PDF até 8MB" no input
- Coluna takes na decupagem
- Indicador "não lido" entre canais
- Áudio com transcrição (Whisper)
- Categoria de despesa por tipo (NF/RPA/cupom/boleto/cartão)
- Status visual do documento (cor/badge)
- Multi-moeda
- Cartão produção (Conta Simples/Caju/Flash)
- Reading list / bibliografia do projeto
- Mood board por cena
- Histórico cronológico do projeto (timeline)
- Diário do diretor
- Export pra portfólio
- Foto/vídeo de raccord
- Tempo estimado por plano
- Marcar plano obrigatório/nice-to-have
- Duplicar plano
- Comparativo orçado × cotado × realizado
- Comparativos com média histórica da produtora
- Notificação push
- Dashboard "minhas pendências"

### Cosméticos (🟦) — 8 itens

- Placeholders explicativos (select edital vazio, etc.)
- Empty state de "Onboarding"
- Status com badge colorido
- Loading states uniformes
- Toast com ações ("desfazer")
- Breadcrumbs em páginas profundas
- Acessibilidade (aria-labels, navegação por teclado)
- Modo escuro consistente

---

## 9. Fundações que destravam múltiplas personas

Estas migrations + libs, se construídas com cuidado, **destravam metade da lista mestra**.

### F1 — Storage privado + helper de mídia
**Destrava:** M1, M16, M21, M30, M32, M34
- Bucket privado `documentos_fiscais`, `referencias_visuais`, `rushes`, `audiencias`, `cortes`
- Lib `useAnexo(entidade, id)` que gerencia upload + signed URL + thumbnail
- Edge function `parsear-xml-nfe`
- Player React com comentário no timecode (item separado, mas habilitado por isso)

### F2 — Schema central de produção
**Destrava:** M3, M4, M5, M7, M8, M9, M11, M14, M15, M16
- `dia_cenas (dia_id, cena_id, ordem, status)`
- `roteiro_cenas.eighths int`
- `roteiro_cenas.intext text` (INT/EXT)
- `roteiro_cenas.diaornoite text`
- `roteiro_cenas.status text` (planejada/rodada/omitida)
- `roteiro_cenas.intencao text` (campo do diretor)
- `roteiro_planos_sugeridos.referencias jsonb` (URLs de imagens)
- `roteiro_planos_sugeridos.take_boa text` (qual take foi aprovado)
- `elementos_cena (id, cena_id, categoria, descricao, status, responsavel, custo)`
- `dpr_dia (id, dia_id, takes_total, takes_boas, horas_extras, observacoes)`

### F3 — Esfera fiscal/contratual
**Destrava:** M16, M17, M18, M19, M20, M21, M22, M23, M24, M25
- `fornecedores`, `cotacoes`, `ordens_compra`
- `contas_bancarias_projeto`, `extratos_bancarios`, `pagamentos`
- `rpa_emitidos`
- `aprovacoes_despesa`
- `versoes_orcamento`, `linhas_orcamento` em 3 níveis (account/line/detail)
- `fringes_padrao` (tabela de alíquotas) e `linha_orcamento.fringes jsonb`
- `audit_log` (polimórfico)
- `projeto_pessoas.regime` (CLT/MEI/RPA/PJ), `.dados_bancarios jsonb`, `.dependentes int`
- Edge function `gerar-pacote-prestacao(projeto_id)` → ZIP

### F4 — Conversa criativa
**Destrava:** M27, M28, M31, M32, parcialmente M7
- `tarefas (id, titulo, descricao, responsavel_id, prazo, status, entidade_alvo, entidade_id)`
- `atas (id, projeto_id, data, participantes jsonb, agenda, decisoes jsonb)` + `ata_tarefas` (FKs pra tarefas)
- `aprovacoes (id, entidade, entidade_id, status, comentario, aprovador_id)`
- `comentarios (id, entidade, entidade_id, autor_id, texto, timecode_seg, anexos jsonb)`
- `mensagens.anexos jsonb`, `.mencoes jsonb`, `.entidade_referencia jsonb`

### F5 — Lookbook + referências visuais
**Destrava:** M30, parcialmente M7, M14, M32
- `lookbook (id, projeto_id, titulo, descricao, tipo)` (geral, por cena, por personagem, por sequência)
- `lookbook_itens (id, lookbook_id, tipo, url, descricao, posicao)`
- `roteiros_versoes` (snapshot + commit message + autor + timestamp)

---

## 10. Plano de sprints sugerido

Cada sprint pensado pra **destravar uma persona por vez**, mas com fundações reaproveitáveis.

### Sprint 1 — Fundação Fiscal (DP + Produtor) — 3-4 semanas
Foco: M1, M2, M14, M16, M19, M22, M23, M24
- Storage privado (F1 mínimo: upload NF + RPA)
- Senha 8 chars
- Locações por projeto
- Upload NF + RPA + comprovante (sem XML ainda — só PDF)
- Regime de contratação + dados bancários
- Fornecedores + cotação simples (sem PO formal ainda)
- Conta bancária do projeto
- Audit_log
- **Entrega:** prestação de contas Funcultura defensável em telas (sem o pacote 1-clique ainda)

### Sprint 2 — Conversa Criativa (Diretor + AD) — 3 semanas
Foco: M27, M28, M31, M32 (todo F4)
- Tarefas/compromissos polimórficos
- Atas de reunião com decisões → tarefas
- Aprovação criativa formal
- @menção + anexo de imagem no chat + vínculo a cena/plano
- **Entrega:** diretor opera pré-produção sem WhatsApp

### Sprint 3 — Decupagem Viva (Diretor + AD) — 4 semanas
Foco: M6, M7, M8, M12, M29, M30 (todo F5)
- Aplicar decupagem da IA → cria registros (dedupe + dry-run)
- Editar / adicionar / reordenar planos + referências visuais
- Re-decupar não-destrutivo (merge)
- Personagens estruturados (medidas, restrições, agente)
- Versionamento de roteiro + diff
- Lookbook (boards visuais + paleta + tratamento)
- **Entrega:** roteiro vive com versionamento e a decupagem da IA não morre numa ilha

### Sprint 4 — Stripboard + DOOD + OD costurada (AD + DP) — 4 semanas
Foco: M3, M4, M5, M9, M10, M11, M13, M15
- Tabela `dia_cenas` + UI stripboard arrastável
- DOOD auto-gerado
- Páginas/eighths por cena + alerta por dia
- Breakdown sheet padrão
- OD puxa cenas do dia + call time por pessoa
- Ficha de locação completa
- Daily Production Report
- **Entrega:** AD opera completo no CINEFLOW — não precisa do Movie Magic

### Sprint 5 — Frame.io brasileiro (Diretor) — 6 semanas
Foco: M26, M33, M34
- Player vídeo + comentário no timecode
- Registro de takes
- Upload rushes/copiões diários
- (Storyboard, comparativo de takes, versionamento de corte como sub-itens)
- **Entrega:** pós-produção rola dentro do CINEFLOW

### Sprint 6 — Folha + Pacote de Prestação (DP) — 5 semanas
Foco: M17, M18, M20, M21, M25 (resto de F3)
- Orçamento 3 níveis + unit × qty × rate
- Fringes por linha
- Folha de pagamento + RPA (cálculo + PDF)
- Petty cash com OCR de cupom
- Pacote de prestação Funcultura 1-clique
- **Entrega:** killer feature do produto — fechar prestação inteira sem sair

### Sprint 7 — Refinamentos + lançamento (todos) — 3 semanas
Foco: 🟧 e 🟨 escolhidos a dedo + módulo de festivais
- Quick wins acumulados
- Multi-produtora real
- WhatsApp + nascer/pôr do sol + clima na OD
- Versões de orçamento + de corte
- Módulo de festivais / EPK
- **Entrega:** v1.0 estável e diferenciada

**Total estimado:** ~28 semanas de trabalho focado (~7 meses).
**Marcos públicos sugeridos:**
- Pós-Sprint 1: alpha fechado com produtoras parceiras (foco em prestação)
- Pós-Sprint 3: beta convidado (diretor + AD)
- Pós-Sprint 5: beta aberto
- Pós-Sprint 7: lançamento público

---

## 11. Veredito de cada persona

### Produtor (Chico)
> *"Para um longa via Funcultura de R$ 1.8M, hoje eu preciso de Movie Magic Budgeting para orçar, Conta Simples para gerir caixa, Wrapbook (ou Excel) para folha, Drive para anexos, e o CINEFLOW só serviria pra equipe e comunicação. Resolva o upload de NF e a costura do roteiro com a OD e vocês têm meu sim."*

### 1º AD (Mariana)
> *"O CINEFLOW é uma boa central de gestão, mas hoje não substitui meu Movie Magic + StudioBinder + caderno de continuidade. Falta o que define o trabalho do AD: stripboard, DOOD e a costura entre roteiro → cronograma → OD. A decupagem por IA é o diferencial mais excitante que vi num produto brasileiro nessa categoria — mas precisa fechar o ciclo até a OD."*

### Diretor de Produção (Tereza)
> *"O CINEFLOW é uma boa caderneta para projetos pequenos — abaixo de R$ 300k, 1-2 dias, equipe de 10. Para um longa via Funcultura de R$ 1.8M, hoje eu preciso de Movie Magic + Conta Simples + Wrapbook + Drive, e o CINEFLOW serviria só pra equipe e comunicação. **Se fecharem os 10 primeiros pontos**, eu não preciso de mais nada além do CINEFLOW — e essa é uma proposta única no mercado brasileiro. A defesa do produto não está em copiar StudioBinder, está em ser o único produto que **fecha a prestação Funcultura sem sair de uma tela**. Foquem aí."*

### Diretor (Caio)
> *"O CINEFLOW hoje sabe operar — não sabe conversar comigo. Eu sou aprovador, comentador, curador. Preciso colar imagem, comentar no segundo da audição, escrever 'gostei' do desenho da arte, marcar reunião com DF, voltar pra V3 do roteiro pra ver de onde veio essa fala. Sem isso, o produto serve à minha produção mas não à minha **criação** — eu continuo no Milanote + Frame.io + WhatsApp. O ganho seria gigantesco se eu pudesse fechar a aprovação criativa no mesmo lugar onde a produção já vive. A decupagem por IA é uma porta entrar — agora abram a sala da pré-produção criativa do outro lado dela."*

---

## Apêndice — Referências consultadas

### Livros / manuais
- **O Assistente de Direção Cinematográfica** — Pierre Malfille (Editora Artenova / Embrafilme, 4ª ed., 1979)
- **Organograma da Produção Audiovisual Brasileira** — material do projeto
- **Manual de Prestação de Contas Funcultura 2024** — Secretaria de Cultura de Pernambuco

### Concorrentes auditados
- **Movie Magic Scheduling & Budgeting** (Entertainment Partners) — padrão indústria
- **StudioBinder** — all-in-one cloud, EUA
- **Yamdu** — gestão de produção, ARRI
- **Croogloo** — coordenação de produção
- **Wrapbook** — folha/payroll especializada AV
- **SetKeeper** — gestão de produção, agora dentro da Revolution
- **Frame.io** — review de vídeo (Adobe)
- **Milanote** — moodboards / lookbook
- **ShotDeck** — referências visuais
- **Boords** — storyboard

### Buscas online realizadas (resumo)
- DOOD / Day Out of Days workflow
- Production management software comparison
- Film budgeting software (Movie Magic / Showbiz / Hot Budget)
- Yamdu vs SetKeeper vs Croogloo
- Prestação contas Funcultura PE
- Diretor cinema brasileiro fluxo
- Pre-production tools Frame.io Milanote ShotDeck

---

*Documento mantido como referência viva. Atualizar conforme features forem implementadas — marcando ✅ na lista mestra.*
