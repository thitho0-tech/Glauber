# GUIA DE USO DE IA — Eficiência máxima, mínimo de tokens

> Como usar Claude (Cowork + Claude Code) no Glauber com o melhor custo/benefício.
> Criado em 17/07/2026. Documento vivo — atualizar quando o processo mudar.

---

## 1. PRINCÍPIO GERAL

Token gasto bom é o que produz decisão ou código deployado. Token gasto ruim é releitura de contexto, retrabalho por relato incompleto e edição de arquivo grande na ferramenta errada. O sistema abaixo ataca esses três desperdícios.

## 2. QUAL FERRAMENTA PARA QUAL TAREFA (custo relativo)

| Tarefa | Ferramenta | Custo | Por quê |
|---|---|---|---|
| Triagem de feedback, diagnóstico, spec | Cowork | Baixo | Conversa + leituras pontuais |
| Consulta SQL, inspeção do banco | Cowork (conector Supabase) | Muito baixo | 1 query direta > várias suposições |
| Fix de 1–3 linhas (arquivo <800 linhas) | Cowork (Edit) | Baixo | Sem abrir sessão nova |
| Feature multi-arquivo ou arquivo >800 linhas | **Claude Code** com handoff | Médio | Contexto de código otimizado; Edit do Cowork trunca .tsx grandes |
| Documentos, planilhas, apresentações | Cowork | Baixo-médio | Skills nativas |
| Pesquisa externa (mercado, editais, captação) | Cowork (web search) | Médio | Uma sessão dedicada por tema |

## 3. AS 6 REGRAS DE ECONOMIA

1. **Uma leva, uma sessão.** Agrupar 5–15 itens de feedback numa sessão de triagem única em vez de 1 conversa por bug. A triagem produz: diagnóstico + causas raiz + divisão Cowork/Claude Code + handoff pronto.
2. **Relato completo na primeira mensagem.** O formato tela + função + esperado vs. ocorrido + Console F12 + print economiza 2–4 idas e voltas por item (o maior desperdício histórico do projeto). Template: `TEMPLATE_FEEDBACK_EQUIPES.md`.
3. **Handoff enxuto para Claude Code.** O Cowork prepara um `HANDOFF_*.md` com: arquivos-alvo, mudança exata, critério de aceite, regras críticas aplicáveis. O Claude Code não rediscute — executa. (Fluxo 3 fases já validado: spec no Cowork → setup local → código no Claude Code; 25–60K tokens/leva.)
4. **Memória em vez de re-explicação.** Estado do projeto vive no CLAUDE.md §5 + memória do Cowork. Nunca gastar mensagens recontando o que o agente deve ler sozinho ao retomar.
5. **Ler cirurgicamente.** Pedir análise de trecho/módulo específico, não "olha o app inteiro". A vistoria completa já existe (`VISTORIA_CODIGO_2026-07-17.md`) — referenciá-la em vez de re-auditar.
6. **Não usar IA para o que é mecânico.** Commit, deploy, Ctrl+Shift+R, conferir tela: passo a passo já documentado, executar direto no PowerShell sem abrir conversa.

## 4. FLUXO PADRÃO DA PRÓXIMA LEVA (feedback das 2 equipes)

1. **Você:** consolida os feedbacks no template (1 arquivo por equipe) + prints numerados na pasta de screenshots.
2. **Cowork (sessão 1 — triagem):** leio tudo, classifico (bug/ajuste/feature), identifico causas raiz, defino o que é verde/amarelo/vermelho, divido Cowork × Claude Code, gero handoffs. Você aprova o plano.
3. **Cowork (fixes verdes pequenos):** edito, você roda tsc + commit + `vercel --prod`.
4. **Claude Code (bloco grande):** executa os handoffs.
5. **Cowork (sessão de fechamento):** valido com você, atualizo CLAUDE.md §5 + memória, entrego mensagem de commit e checklist de deploy.

## 5. SINAIS DE DESPERDÍCIO (parar e corrigir)

- Mesma explicação dada duas vezes → devia estar no CLAUDE.md ou na memória.
- Conversa passou de ~10 mensagens num único bug → faltou relato completo; voltar ao template.
- Edit truncou arquivo → ferramenta errada; ir para Claude Code (regra crítica 11).
- Sessão misturando negócio + código + docs → dividir em sessões temáticas.

## 6. SKILL PRÓPRIA (decisão de 17/07)

Vale criar a skill **"glauber-triagem"** DEPOIS que a primeira leva de feedback chegar no formato novo — ela automatizará o passo 2 do fluxo acima (classificação, semáforo, geração de handoff). Criar antes seria chutar o formato. Custo: 1 sessão curta; benefício: recorrente a cada leva.
