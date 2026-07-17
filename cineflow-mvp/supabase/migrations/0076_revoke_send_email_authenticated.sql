-- ============================================================
-- Migration 0076 — Fecha vetor de phishing em _send_email
-- Aplicada em produção via MCP em 17/07/2026 (vistoria §2.2).
--
-- Contexto: _send_email é SECURITY DEFINER e estava executável
-- pelo papel `authenticated` via /rest/v1/rpc/_send_email —
-- qualquer usuário logado podia enviar e-mail arbitrário com o
-- remetente do Glauber.
--
-- Segurança da mudança: os únicos chamadores internos
-- (criar_convite, notificar_participante_evento,
-- request_delete_project) são SECURITY DEFINER owned by postgres
-- e NÃO são afetados (rodam com a permissão do dono).
-- Notificações de OD falam direto com a edge function.
-- Verificado pós-aplicação: has_function_privilege = false para
-- authenticated/anon, true para postgres.
-- ============================================================

revoke execute on function public._send_email(text, text, text)
  from authenticated, anon, public;
