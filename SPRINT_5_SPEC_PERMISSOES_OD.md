# SPRINT 5 — Permissões (Composite) + Aprovação de OD + Mural

**Origem:** decisões consolidadas com Thiago em 16/06/2026 (Cowork).
**Fontes da verdade:** este spec + `Cópia de Glauber_Matriz_Permissoes_Atualizado.xlsx` (matriz Função × Funcionalidade) + `Glauber_Permissoes_Composite_Proposta.docx`.
**Ordem obrigatória (não inverter):** Bloco A (segurança/RLS) → Bloco B (matriz como fonte) → Bloco C (features: C1 aprovação OD, C2 editar OD publicada, C3 Mural/Próximos eventos, C4 fusão Agenda). Se o tempo apertar, A é o inegociável para a entrega; C4 é o primeiro candidato a adiar. C3 e C4 compartilham a lógica de visibilidade — fazer juntos.

---

## MODELO DE PERMISSÕES (referência para todos os blocos)

Resolver **composite, deny-by-default**, precedência de cima para baixo:

1. **DENY** exceção individual → nega sempre.
2. **ALLOW** exceção individual → permite (salvo DENY).
3. **ALLOW** por **FUNÇÃO** (camada base, vinda da matriz) **OU** por **PAPEL RBAC** (exceção do owner) → permite.
4. Padrão = **negado**.

Conceitos:
- **OWNER** = autoridade sobre o projeto-objeto (excluir projeto, editar dados do projeto, gerir equipe, definir papéis RBAC, ver/restaurar lixeira, configurar regra de email da OD). **Permanente e indelegável** (derivado de `projetos.criado_por`, nunca da coluna editável). Nunca aparece como opção atribuível.
- **FUNÇÃO** (matriz Função × Funcionalidade) = camada base que define as funcionalidades de cada membro. É o default ao adicionar alguém à equipe.
- **PAPEL RBAC** (owner-editável em Configurações) = **somente exceção**: eleva ou restringe um membro em relação ao default da sua função. **A coluna "PAPEL RBAC" da matriz é ignorada** (era sugestão antiga).
- **Isolamento total por projeto**: nenhuma permissão/dado atravessa projetos, mesmo do mesmo usuário.

---

## BLOCO A — Segurança / RLS (CRÍTICO, fazer primeiro)

**Problema:** as policies de escrita (insert/update/delete) hoje só checam `org_id in (user_orgs())` / `projeto_id in (select id from projetos)`. Não há checagem de função nem de papel. As funções `papel_no_projeto`/`tem_perm_projeto` existem (migração 0016) mas **nunca são usadas em policy**. Resultado: qualquer membro da org escreve em qualquer projeto/seção via API. O gating do front é cosmético.

**A1 — Tabelas de permissão (migração SQL):**
- `perm_recursos(codigo, modulo, acao, descricao)` — catálogo (ver lista em Bloco B).
- `perm_funcao_grants(funcao_av_id, codigo_recurso, acao, conceder bool)` — camada base (seed da matriz).
- `perm_overrides(projeto_pessoa_id, codigo_recurso, acao, efeito text check (efeito in ('ALLOW','DENY')))` — exceções. A elevação por **papel RBAC** pode ser materializada aqui ou resolvida na função `pode()` a partir de `projeto_pessoas.papel_projeto`.

**A2 — Função única de decisão:**
```
public.pode(p_projeto uuid, p_recurso text, p_acao text) returns boolean
  language sql security definer set search_path = public, pg_temp
```
Implementa o resolver acima. Owner (criado_por = auth.uid()) → true para recursos de escopo-projeto. Caso contrário: DENY override → false; ALLOW override → true; senão (grant da função do membro no projeto OU grant do papel RBAC) → true; senão false.

**A3 — Reescrever as policies de escrita** de TODAS as tabelas de dados de projeto para chamar `public.pode(projeto_id, '<recurso>', '<acao>')` em vez de só checar org/projeto. Manter SELECT conforme isolamento por projeto (já feito em 0039/0044). Atenção à recursão de RLS → tudo via função security definer (lição das migrações 0042).

**A4 — Front:** criar hook único `usePermissions(projetoId)` que expõe `can(recurso, acao)` lendo um RPC sobre `pode()`. Reescrever `useProjectRole`/`useProjectDeptAccess` como adapters finos sobre ele (sem big-bang) e migrar tela a tela.

**A5 — Travar OWNER:** em `Settings.tsx`, a linha do próprio owner não pode ter papel editável (hoje o dropdown some só a opção "owner", mas o owner ainda consegue rebaixar a si mesmo na própria linha). Owner é derivado de `criado_por` em todo lugar.

---

## BLOCO B — Matriz como fonte (seed da camada de função)

**Tradução dos valores da matriz** (legenda do arquivo): para cada célula Função × Funcionalidade:
- `S` (acesso total) → grant das ações da funcionalidade (ver + criar/editar conforme o caso).
- `P` (parcial / só leitura) → `ver = S`, `editar/criar = N`. (45 células, todas em "Vincular cenas ao Stripboard".)
- `N` → sem grant.

**Os 8 itens que estavam "?" NÃO entram pela função** — são regras fixas:
1. **Criar projeto** = qualquer pessoa (capacidade global; quem cria vira owner). Não gated por função.
2. **Editar dados do projeto** = owner (exceção via RBAC).
3. **Ver itens excluídos (lixeira)** = owner (exceção via RBAC).
4. **Restaurar item da lixeira** = owner (exceção via RBAC).
5. **Ver configurações da organização / Editar config** = config da organização/projeto só owner; **perfil pessoal/conta = todo usuário edita o próprio**.
6. **Validações automáticas do edital (SIC)** = processo automático ao lançar despesa (ninguém executa). Permissão real = **ver** o resultado, igual a quem vê/edita o Financeiro.
7. **Receber email ao publicar OD** = **regra fixa configurada pelo owner** (não é preferência por pessoa).

**Catálogo de recursos/ações** (alinhar nomes com a matriz na importação): command_center(ver), projeto(ver/editar/excluir; criar=global), cronograma(ver/editar), od(ver/editar/**aprovar**/publicar), roteiro(ver/editar/upload/stripboard), equipe(ver/editar/remover), elenco(ver/editar), locacoes(ver/editar/excluir/aprovar), figurino_arte(ver/editar/aprovar), financeiro(ver/criar/editar/aprovar) + rubricas(ver/editar) + prestacao(ver), fornecedores(ver/editar), contratos(ver/editar), agenda(ver/editar), comunicacao(ver/enviar), transporte(ver/editar), configuracoes(ver/editar — escopo conforme item 5), lixeira(ver/restaurar — owner).

---

## BLOCO C — Features novas (entram nesta leva, por cima de A e B)

### C1 — Aprovação da OD antes de publicar (gate da Direção)
- **Hoje:** a OD fica visível assim que lançada → risco de informação truncada.
- **Novo fluxo (estado da OD):** `rascunho` → `aguardando_aprovacao` → `aprovada` → `publicada`. Só publica (e dispara `notificar-od`) após aprovação.
- **Nova ação de permissão `od.aprovar`** = funções **Diretor(a)**, **Diretor(a) de Produção**, **Produtor(a) Executivo(a)** (seed na matriz, S para essas; N nas demais; owner sempre).
- **Banco:** em `ordens_do_dia` adicionar `status`, `aprovada_por`, `aprovada_em`. Quem cria/edita a OD (`od.editar`) envia para aprovação; quem tem `od.aprovar` aprova; publicação condicionada a `aprovada`.

### C2 — Editar OD publicada + selo "ORDEM DO DIA ATUALIZADA"
- Permitir editar OD já publicada (quem tem `od.editar`).
- Ao salvar uma OD publicada: incrementar `versao`, marcar atualização e **re-notificar** a equipe (email/in-app via `notificar-od`).
- Na chamada/visualização e no link público: exibir destaque **"ORDEM DO DIA ATUALIZADA"** quando `versao > 1` / houver atualização após publicação.

### C3 — Personalização do Mural (escopo definido)
- **Só muda o painel "Próximos eventos".** O chat (3 abas Geral/Departamento/Privado) permanece exatamente como está.
- **Regra do "Próximos eventos":** cada usuário vê apenas eventos que (a) lhe dizem respeito **individualmente** (é participante/escalado) **OU** (b) são do **seu departamento** **OU** (c) são **alertas de OD publicada**. O resto não aparece para ele.
- **Departamento do usuário:** derivado da função principal no projeto (`projeto_pessoa_funcoes` → `funcoes_av.departamento`, mesma fonte de `useProjectFunction`).
- **Implementação (front, sem migração nova):** filtrar a query de `agenda_eventos`/`agenda_participantes` por: participante = pessoa atual `OR` `departamento` do evento = depto do usuário `OR` `tipo` = alerta de OD publicada. Owner/produção continuam vendo tudo (mesma checagem de super-usuário do resolver). Validar se `agenda_eventos` tem coluna de `departamento`; se não houver, adicionar (migração pequena) ou inferir o depto a partir do vínculo do evento.
- Mantém o protocolo de Tabs do Radix (`data-[state=inactive]:hidden`) — não regredir o layout do chat já corrigido.
- **Lógica de visibilidade compartilhada com C4** (Agenda) — implementar uma vez (helper único) e reusar nos dois.

### C4 — Fusão Agenda + Planejamento num módulo único de calendário (item mais pesado; candidato a escorregar pós-20/06 se faltar tempo)

**Situação atual:** `Agenda.tsx` tem 2 sub-tabs sobre 2 tabelas — "Agenda" (`agenda_eventos`: reunião/ensaio/visita) e "Planejamento" (`dias_filmagem`: fases pre_producao / dia_filmagem("Filmagem") / pos_producao, já com toggle dia/semana/mes).

**Restrição de arquitetura (não violar):** `dias_filmagem` é espinha dorsal de OD (`ordens_do_dia.dia_id`), escalas, check_ins e stripboard (`roteiro_cenas.dia_id`). **Não eliminar nem trocar a tabela.** A fusão é de UI/UX; "Dia de Gravação" continua gravando em `dias_filmagem`.

**C4.1 — Calendário único:** remover os 2 sub-tabs; uma só visão de calendário convencional com toggle **Dia / Semana / Mês** (reaproveitar o estado `periodo` já existente), sobrepondo as duas fontes (`dias_filmagem` + `agenda_eventos`) no mesmo grid.

**C4.2 — Classificação "Período de Produção"** (grava em `dias_filmagem`), 4 valores:
- `pre_producao` → "Pré-produção"
- `producao` → "Produção" (NOVO valor)
- `dia_gravacao` → "Dia de Gravação" (renomeia o atual `dia_filmagem`/"Filmagem"; migração de rótulo+valor, mantendo `id`/`dia_id` intactos — atualizar default `(d.tipo ?? 'dia_filmagem')` e seeds)
- `pos_producao` → "Pós-produção"
Eventos pontuais (reunião, ensaio, visita de locação) seguem em `agenda_eventos`.

**C4.3 — Formulário único:** unificar os dois forms num só. Primeiro campo = categoria: "Período de Produção" (4 fases → `dias_filmagem`) ou "Evento" (→ `agenda_eventos`). Campos comuns (título, data/intervalo, responsáveis/participantes, observações) aparecem uma única vez; mostrar/ocultar os específicos conforme a categoria. **Remover campos repetidos/redundantes** entre os dois forms antigos.

**C4.4 — Visibilidade (regra confirmada):** TODO o "Período de Produção" (as 4 fases, incluindo Dia de Gravação) é **visível para todos**. Apenas os **eventos pontuais** seguem o filtro personalizado do C3 (participante individual OU departamento do usuário OU alerta de OD). Owner/produção veem tudo. Usar o mesmo helper de visibilidade do C3.

**C4.5 — Permissões:** inserir/editar conforme o resolver composite (ex.: `agenda.editar`); visualizar detalhes conforme visibilidade acima. Quem não tem edição vê em modo leitura.

**C4.6 — Pontas soltas a verificar:** `Schedule.tsx` (página antiga, ainda importada no `App.tsx`) e `PlanejamentoDetalhe.tsx` (`/cronograma/:diaId`) — decidir se a rota de detalhe do dia continua ou é absorvida pelo calendário. Conferir se `agenda_eventos` tem coluna `departamento` (necessária ao filtro do C3/C4; senão, migração pequena).

**Sequência:** executar após A e B; fazer **junto com C3** (visibilidade compartilhada). É o bloco mais pesado — se o cronograma de 20/06 apertar, este é o primeiro a adiar sem prejuízo da segurança.

---

## Ajustes pós-validação de tela (16/06) — front, antes do cutover
Telas que ainda não usavam can() e liberavam edição indevida — migrar para usePermissions:
- Locations → can('locacoes','editar'); Fornecedores → can('fornecedores','editar') (não tinha gating);
  Contract → can('contratos','editar') (não tinha gating); Roteiro → can('roteiro','editar') +
  HABILITAR edição na aba Decupagem sob can('roteiro','editar') (ver = can('decupagem','ver')).
- Team → adicionar/editar = can('equipe','editar'), remover = can('equipe','remover'); e NUNCA
  permitir remover a linha do CRIADOR (via project_owner_email).
- DB: trigger `protege_owner_pp` (aplicado 16/06) impede remover/soft-deletar o criador em projeto_pessoas.

## Regras de protocolo (manter)
- PowerShell sem `&&`; nunca `<SelectItem value="">`; `npx tsc --noEmit` antes de todo deploy; arquivos truncados → `git show HEAD:caminho > arquivo`; SQL sempre colado no SQL Editor do Supabase (nunca `supabase db push`); RLS sem policies que se auto-referenciam (usar security definer); `vercel --prod` ao final.
- Owner derivado de `criado_por` (migração 0016) — não regredir.
