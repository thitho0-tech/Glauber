# STATUS SPRINT 4 — 11/06/2026

**Deadline:** entrega às equipes de teste em **20/06/2026** (9 dias de folga).
**Produção:** glauber.app.br · **Migrations:** 0001→**0043** todas aplicadas.
**Decisão estratégica do dia:** código estrutural CONGELADO — agora é estabilizar (4E), depois 1 sessão única de polimento de layout.

---

## ONDE ESTAMOS

As 4 fases estruturais do Sprint 4 estão codadas, commitadas e em produção. Entramos
na fase 4E (caça-bugs/experimentação) antecipadamente — e ela já está rendendo:
4 bugs encontrados e corrigidos hoje só nos smoke tests.

## ✅ CONCLUÍDO

| Fase | Entrega | Status |
|---|---|---|
| 0039 | Migração consolidada: 5 bugs de banco + isolamento de projetos + fundações (transporte, fichas, chat, bucket) | ✅ aplicada |
| 4A | Bugs B1–B10 + renomeações L1–L9 (Página Inicial, Mural, logo, lixeira, campos removidos, depto→função) | ✅ em produção |
| 4B | Sidebar definitiva (planilha), Mural (agenda+chat 3 abas), Agenda unificada, RBAC por departamento, hub Produção | ✅ em produção |
| 4C | OD completa (13 seções/6 abas), PDF da OD, PDF da decupagem, abas Roteiro/Decupagem, decupagem→Elenco | ✅ em produção |
| 4D | Mapa de Transporte + PDF, fichas de Elenco, aprovações Arte/Figurino, campos de Locações, docs de Equipe, DM no chat | ✅ em produção |
| Hotfixes | token_publico (lista ODs), 0040 seed canais, 0041 unique personagens, 0042 recursão RLS canais | ✅ |

## 🔧 CORRIGIDO HOJE (aguardando commit + deploy)

| Bug | Causa | Fix |
|---|---|---|
| Equipe aparece vazia / pessoa some | lista pedia coluna inexistente `pessoas.user_id` (400 silencioso) | Team.tsx corrigido ✅ |
| Pessoa não salva (alguns departamentos) | check constraint antigo rejeita fotografia/pos_producao/etc. | migração 0043 ✅ aplicada |
| DM: "Seu perfil não foi encontrado" | filtro de email sem `!inner` no PostgREST nunca encontrava | ProjectDashboard.tsx corrigido ✅ |
| 6 arquivos da 4D truncados no disco | falha de sincronização pós-sessão (2ª ocorrência) | restaurados do commit ✅ |

## ⏳ O QUE FALTA (em ordem)

1. ~~**AGORA**~~ ✅ FEITO (11/06): migração 0043 aplicada + hotfixes commitados e deployados. Re-teste rápido: equipe lista e salva em qualquer departamento; DM "Nova conversa" funciona.
2. **4E — experimentação máxima (11–13/06):** fluxo completo como equipe real
   (projeto novo → equipe → roteiro → decupagem → OD → publicar → financeiro →
   transporte → fichas). Anotar TODOS os tropeços numa lista única (tela + ação +
   erro do Console F12). Trazer em lote para triagem.
3. **Sessão de polimento de layout (1 sessão Code, ~14–15/06):** juntar TODAS as
   questões visuais numa lista só (prints com anotações, como você já faz) e
   resolver de uma vez. Não misturar com bugs funcionais.
4. **Preparação da entrega (16–18/06):**
   - Testar convite por email ponta-a-ponta (limite 3/h no plano free do Supabase —
     considerar criar logins de teste manualmente para as equipes).
   - `VITE_EDGE_SHARED_SECRET` no .env (pendência antiga — email ao publicar OD).
   - Teste com 2º usuário sem papel de produção (validar RBAC e isolamento na prática).
   - Mini-guia de 1 página para as equipes de teste (o que testar, onde reportar).
5. **Folga/buffer (19/06)** → **Entrega 20/06**.

## O QUE PRECISAMOS PARA TERMINAR

- **De você:** rodar 0043 + deploy de hoje; depois bateria de experimentos (item 2) e a lista única de ajustes de layout (item 3); decidir como as equipes entram (convite por email × logins criados manualmente).
- **De código:** apenas o que sair da 4E + polimento — nenhuma feature nova até a entrega.
- **Adiados conscientes (pós-teste):** IA de rotas no transporte, parser de orçamento, recibos, menções no chat, vídeo na pós, matriz fina por função, boletins de som/foto, aba Administrativo completa.

## REGRAS QUE SALVARAM O DIA (manter no protocolo)

1. `npx tsc --noEmit` no PowerShell ANTES de todo deploy (pega arquivo truncado).
2. Se houver erro de JSX sem explicação: `git show HEAD:caminho > arquivo` restaura.
3. Coluna que não existe em query do PostgREST = tela "vazia" sem erro visível
   (já pegou: `token`, `user_id`). Na dúvida, F12 → aba Network → resposta 400.
4. Policies que se referenciam mutuamente = recursão de RLS → usar função security definer.

---

## 🚀 COMANDO PARA INICIAR A PRÓXIMA TASK (depois dos testes)

Abrir nova task no Claude Cowork (projeto Cineflow/Glauber) e colar:

```
Leia, nesta ordem, na pasta Glauber: SPRINT_STATE.md, STATUS_SPRINT4_11-06.md e
SPRINT_4_SPEC.md. Contexto: Sprint 4 (fases 4A–4D) concluída e em produção
(glauber.app.br), migrations 0001–0043 aplicadas, código estrutural congelado.
Estamos na fase 4E — caça-bugs antes da entrega às equipes em 20/06.

Abaixo, minha lista de tropeços dos testes (para cada um: tela, o que fiz vs.
o que esperava, e o vermelho do Console F12 quando houver) e, em separado,
a lista de ajustes de layout:

[BUGS]
1. ...

[LAYOUT]
1. ...

Faça a triagem em: (a) fix cirúrgico direto no Cowork, (b) sessão única no
Claude Code (gerar o prompt pronto), (c) precisa de migração SQL (gerar o
arquivo para eu colar no SQL Editor), (d) adiar para pós-entrega. Execute os
fixes (a), gere os artefatos de (b) e (c), e atualize SPRINT_STATE.md e o
STATUS ao final. Regras do protocolo: PowerShell sem &&; nunca SelectItem com
value=""; tsc antes de deploy; arquivos truncados → restaurar com
git show HEAD:caminho > arquivo.
```
