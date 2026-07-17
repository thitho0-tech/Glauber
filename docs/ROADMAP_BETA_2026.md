# ROADMAP GLAUBER — Do protótipo testado ao beta vendável

> Criado em 17/07/2026. SUPERSEDE os roadmaps V2/V3 (arquivados em `_arquivo/`).
> Documento vivo: revisar ao fim de cada fase. Datas são estimativas condicionadas aos feedbacks e ao caixa.

---

## ONDE ESTAMOS

Protótipo completo (38 telas, 75 migrations, RBAC, contratos, decupagem IA, OD, financeiro) em produção real com 2 equipes testando. Vistoria de 17/07: sistema saudável, riscos pontuais mapeados. Falta: fechar pendências, absorver feedback e construir a camada comercial.

## FASE 0 — HIGIENE PRÉ-LEVA (agora → chegada dos feedbacks, ~1 semana)

Objetivo: casa arrumada e riscos zerados ANTES de mexer no app.

1. ✅ Reorganização da pasta + novo CLAUDE.md + vistoria (17/07).
2. Decisões da vistoria (Thiago): social login (ligar OAuth ou desligar flag), ok para revoke de `_send_email`.
3. **Verificar backups/PITR no Supabase** (Dashboard → Database → Backups) e anotar política no CLAUDE.md. Pré-requisito absoluto da Fase 1.
4. Ligar proteção de senha vazada no Auth (1 clique, zero risco).
5. Commit da reorganização + docs novos.
6. Equipes seguem usando o app **sem nenhuma alteração**.

## FASE 1 — LEVA BETA (feedbacks em mãos → ~3-4 semanas)

Objetivo: app beta funcional, estável e completo na medida do financeiramente possível.

1. Triagem única dos feedbacks das 2 equipes (fluxo do `GUIA_USO_IA.md` §4) → backlog priorizado por: bloqueia equipe > atrapalha > cosmético; bugs antes de features.
2. Fixes verdes (front) em ondas curtas de deploy; amarelos (migrations aditivas) agrupados e fora de dias de set.
3. Pendências herdadas que entram nesta leva: Leva 2 itens 4, 5, 7; código morto (`Contract.tsx`); hardening barato (search_path em lote, `orgs insert`, bucket `mensagens-audio`).
4. Itens vermelhos (policy `agenda_participantes`, ajustes de RLS) → **janela combinada** com as equipes, com backup verificado.
5. Criar skill "glauber-triagem" a partir do formato real dos feedbacks.
6. Critério de saída: 2 equipes rodando 2 semanas sem bug bloqueante.

## FASE 2 — CAMADA COMERCIAL (paralelo à Fase 1 no que não depende de código, ~4-6 semanas)

Objetivo: poder VENDER, não só usar.

1. **CNPJ** (pré-requisito de tudo: cobrança, editais, investimento — já mapeado na pesquisa de captação).
2. **Termos de Uso + Política de Privacidade formal + adequação LGPD** (a página /privacidade existe; falta o par jurídico completo e consentimento no signup).
3. **Cobrança:** gateway (avaliar Stripe/Pagar.me/Asaas), planos FREE/R$149/R$499/R$699 (confirmar preços), tela de assinatura, controle de limites por plano.
4. **Onboarding self-service:** hoje o fluxo pressupõe acompanhamento; para vender, um produtor precisa entrar sozinho e criar o primeiro projeto sem ajuda.
5. **Observabilidade:** Sentry (erros front) + analytics de produto (ex.: PostHog) — sem isso, escala de clientes = suporte cego.
6. **Rebrand técnico** na janela do gateway: rename `cineflow-mvp` → `glauber-mvp`, package.json, `cineflow_recovery`; header `x-cineflow-secret` só se a janela permitir redeploy coordenado.

## FASE 3 — PRIMEIRAS VENDAS (após Fases 1+2, ~2 meses)

1. Converter as 2 equipes de teste em clientes fundadores (desconto vitalício / plano founder).
2. Estratégia validada boca a boca + "cavalo de troia" (modelo CAC/LTV já feito: LTV/CAC ~9,8:1).
3. Pipeline: produtoras do circuito Funcultura/SIC PE; meta inicial ~10 contas pagantes (~R$3k MRR, número que valida o modelo do orçamento pré-anjo).
4. Material de vendas a partir dos artefatos Porto Digital + depoimentos das equipes de teste.
5. Com CNPJ + cliente pagante → destravar critérios Anjos do Brasil (mentoria primeiro, per pesquisa 15/07) e Pré-Aceleração Porto Digital.

## FASE 4 — PÓS-VENDA / ESCALA (horizonte 2026 H2 → 2027)

1. Lote de performance do banco (FKs, policies, índices — advisors mapeados na vistoria).
2. Features estruturais adiadas: fusão C4 completa da Agenda, aprovação de OD pelo diretor, Mural personalizável (backlog de 16/06).
3. Mobile: avaliar PWA instalável antes de app nativo.
4. Multi-edital (além de Funcultura/SIC) como diferencial de expansão nacional.
5. Captação formal conforme mapeamento (equity crowdfunding, Centelha PE próximo ciclo).

## RISCOS PERMANENTES

| Risco | Mitigação |
|---|---|
| Alteração quebrar produção em uso | Semáforo do CLAUDE.md §2; backup verificado antes de amarelo/vermelho |
| Caixa limitar a leva beta | Priorização bloqueia>atrapalha>cosmético; features novas só se couberem |
| Dependência de 1 fundador | Documentação viva (CLAUDE.md/docs) + memória do agente = continuidade |
| Vender sem base jurídica | Fase 2 itens 1-2 antes de qualquer cobrança |
