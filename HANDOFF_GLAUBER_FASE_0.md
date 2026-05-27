# HANDOFF — Glauber Fase 0 (em progresso)

**Cole isto no início da próxima conversa pra retomar exatamente daqui.**

---

## Contexto em 1 parágrafo

Projeto **Glauber** (era Cineflow, renomeado por contratempo legal em 26/05/2026). MVP virou protótipo. Deadline: usar em produção real em ~40 dias (~05/07/2026). Plano de ação completo em 6 fases está em `PLANO_40_DIAS_GLAUBER.md`. Estamos no meio da **Fase 0 (rebranding)** — quase tudo feito, falta o deploy final.

---

## Já feito (não refazer)

- Vercel: projeto renomeado para `glauber-mvp`
- Vercel: domínio `glauber.app.br` (apex Production) + `www.glauber.app.br` (redirect 307 → apex)
- Vercel: env var `VITE_APP_NAME=Glauber` (todos ambientes)
- Registro.br: zona DNS modo avançado com `A @ → 216.198.79.1` + `CNAME www → 502aab0af8b57f07.vercel-dns-017.com.`
- DNS propagado, SSL emitido, `https://glauber.app.br` no ar (mas mostrando código antigo Cineflow)
- Supabase: organização renomeada de "CIneflow" para "Glauber"
- Supabase: 5 templates de email atualizados em pt-BR (Confirm sign up, Invite user, Magic link or OTP, Change email address, Reset password)
- Brief Fase 0 + guia de tarefas manuais salvos em `BRIEF_FASE_0_REBRANDING.md` e `GUIA_FASE_0_TAREFAS_MANUAIS.md`

---

## Falta fazer (em ordem)

1. **Supabase → Authentication → Sign In / Providers → Email → Sender Name** trocar para "Glauber" (1 min)
2. **No terminal local**, conferir estado do código:
   ```bash
   git status
   git branch --show-current
   git log --oneline -5
   ls -1 public/ | head -20
   ```
3. **Se houver alterações de rebrand não commitadas**, commit + push da branch `rebrand-glauber`
4. **Rodar localmente** `npm run dev` e tirar **5 prints**: login, dashboard, projeto, finanças, OD
5. **Abrir PR** `rebrand-glauber` → `main` no GitHub, revisar Vercel preview, **merge**
6. **Deploy de produção** automático após merge (ou força com `vercel --prod`)
7. **Confirmar** `https://glauber.app.br` em navegador anônimo — deve mostrar "Glauber" em vez de "CINEFLOW"

---

## Pendência conhecida (não bloqueia Fase 0, mas vale pro piloto real)

- **SMTP customizado** — Supabase usa SMTP built-in com rate limit (~3 emails/h). Pra convidar 30+ pessoas no piloto, vai precisar configurar **Resend** ou **SendGrid** em **Authentication → Emails → SMTP Settings**. Não é bloqueante pra Fase 0, mas crítico antes do onboarding da equipe real.

---

## Próximas fases (não começar antes da Fase 0 fechar)

1. **Fase 1** — Auditoria + Quick wins P0 (3-4 dias)
2. **Fase 2** — Command Center realtime ⭐ (7-10 dias) — está especificada em `BRIEF_SPRINT1A.md`
3. **Fase 3** — Fundação Fiscal mínima (7-10 dias)
4. **Fase 4** — Costura Roteiro ↔ Cronograma ↔ OD (5-7 dias)
5. **Fase 5** — Conversa Criativa (4-6 dias)
6. **Fase 6** — Hardening + onboarding (3-4 dias)

Detalhes completos em `PLANO_40_DIAS_GLAUBER.md`.

---

## Memória persistente relevante

- `project_glauber_rebranding.md` — decisão do rename + deadline 40 dias
- `project_glauber_three_phase_workflow.md` — workflow Cowork → Local → Claude Code
- `project_cineflow_roadmap_v3.md` — roadmap base
- `feedback_cineflow_deploy.md` — sempre lembrar `vercel --prod` ao final
- `project_cineflow_edital_sic_recife_2024.md` — regras do edital
- `project_cineflow_organograma_av.md` — organograma AV (RBAC)

---

## Como retomar na próxima conversa

Cole exatamente isto:

> Voltei. Quero finalizar a Fase 0 do Glauber. Leia HANDOFF_GLAUBER_FASE_0.md e PLANO_40_DIAS_GLAUBER.md, valide o estado atual do projeto e me oriente do passo 1 da lista "Falta fazer". Pode usar Claude in Chrome se precisar navegar Vercel/Supabase.

Ou simplesmente: *"Continuar Fase 0 do Glauber a partir do Sender Name do Supabase."*
