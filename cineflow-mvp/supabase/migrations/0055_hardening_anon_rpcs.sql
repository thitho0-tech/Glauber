-- ============================================================
-- Migration 0055 — Hardening: fechar funções SECURITY DEFINER ao anon
-- Revoga execução por anon/public de RPCs e triggers; mantém authenticated
-- onde o app/RLS precisa. PRESERVA anon em aceitar_convite/validar_convite
-- (fluxo de convite roda antes do login).
-- Colar no SQL Editor. Idempotente. Em transação.
-- ============================================================
begin;

-- ── Funções de TRIGGER (ninguém chama via API) → revogar de todos ──
revoke execute on function public.fn_atualizar_prazos_criticos()            from public, anon, authenticated;
revoke execute on function public.fn_audit_despesas()                       from public, anon, authenticated;
revoke execute on function public.fn_recalcular_orcamento_comprometido_pct() from public, anon, authenticated;
revoke execute on function public.fn_recalcular_roteiro_filmado_pct()       from public, anon, authenticated;
revoke execute on function public.fn_trg_dia_filmagem_kpi()                 from public, anon, authenticated;
revoke execute on function public.fn_trg_projeto_edital_changed()           from public, anon, authenticated;
revoke execute on function public.handle_new_user()                         from public, anon, authenticated;
revoke execute on function public.sync_funcao_principal()                   from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()                         from public, anon, authenticated;
revoke execute on function public.trg_kpis_skip_orfaos()                    from public, anon, authenticated;
revoke execute on function public.trg_od_publicada_agenda()                 from public, anon, authenticated;
revoke execute on function public.trg_projeto_criador_membro()              from public, anon, authenticated;
revoke execute on function public.trg_projeto_seed_canais()                 from public, anon, authenticated;
revoke execute on function public.trg_refresh_proximos_eventos()            from public, anon, authenticated;
revoke execute on function public.trg_set_criado_por_projeto()              from public, anon, authenticated;
revoke execute on function public.trg_set_mensagem_autor()                  from public, anon, authenticated;
revoke execute on function public.trg_set_registrado_por()                  from public, anon, authenticated;

-- ── RPCs do app + helpers de RLS → revogar anon/public, manter authenticated ──
revoke execute on function public.canal_projeto(uuid)                       from public, anon; grant execute on function public.canal_projeto(uuid)                       to authenticated;
revoke execute on function public.confirm_delete_project(uuid, text)        from public, anon; grant execute on function public.confirm_delete_project(uuid, text)        to authenticated;
revoke execute on function public.criar_convite(uuid)                       from public, anon; grant execute on function public.criar_convite(uuid)                       to authenticated;
revoke execute on function public.criar_projeto_com_equipe(jsonb)           from public, anon; grant execute on function public.criar_projeto_com_equipe(jsonb)           to authenticated;
revoke execute on function public.empty_trash(uuid)                         from public, anon; grant execute on function public.empty_trash(uuid)                         to authenticated;
revoke execute on function public.extrair_ocr_documento(uuid)               from public, anon; grant execute on function public.extrair_ocr_documento(uuid)               to authenticated;
revoke execute on function public.fn_recalcular_proximos_eventos(uuid)      from public, anon; grant execute on function public.fn_recalcular_proximos_eventos(uuid)      to authenticated;
revoke execute on function public.is_membro_canal(uuid)                     from public, anon; grant execute on function public.is_membro_canal(uuid)                     to authenticated;
revoke execute on function public.is_membro_projeto(uuid)                   from public, anon; grant execute on function public.is_membro_projeto(uuid)                   to authenticated;
revoke execute on function public.my_org_id()                              from public, anon; grant execute on function public.my_org_id()                              to authenticated;
revoke execute on function public.notificar_od_publicada(uuid, uuid, text)  from public, anon; grant execute on function public.notificar_od_publicada(uuid, uuid, text)  to authenticated;
revoke execute on function public.papel_no_projeto(uuid)                    from public, anon; grant execute on function public.papel_no_projeto(uuid)                    to authenticated;
revoke execute on function public.populate_proximos_eventos(uuid)           from public, anon; grant execute on function public.populate_proximos_eventos(uuid)           to authenticated;
revoke execute on function public.purge_item(text, uuid)                    from public, anon; grant execute on function public.purge_item(text, uuid)                    to authenticated;
revoke execute on function public.regerar_convite(uuid)                     from public, anon; grant execute on function public.regerar_convite(uuid)                     to authenticated;
revoke execute on function public.request_delete_project(uuid)              from public, anon; grant execute on function public.request_delete_project(uuid)              to authenticated;
revoke execute on function public.restore_item(text, uuid)                  from public, anon; grant execute on function public.restore_item(text, uuid)                  to authenticated;
revoke execute on function public.soft_delete_item(text, uuid)              from public, anon; grant execute on function public.soft_delete_item(text, uuid)              to authenticated;
revoke execute on function public.tem_perm_projeto(uuid, text)              from public, anon; grant execute on function public.tem_perm_projeto(uuid, text)              to authenticated;
revoke execute on function public.user_email()                             from public, anon; grant execute on function public.user_email()                             to authenticated;
revoke execute on function public.user_org_papel(uuid)                      from public, anon; grant execute on function public.user_org_papel(uuid)                      to authenticated;
revoke execute on function public.user_orgs()                              from public, anon; grant execute on function public.user_orgs()                              to authenticated;
revoke execute on function public.validar_despesa(uuid)                     from public, anon; grant execute on function public.validar_despesa(uuid)                     to authenticated;

-- aceitar_convite(text) e validar_convite(text): MANTIDOS p/ anon (convite pré-login).

commit;

-- Verificação (deve listar só aceitar_convite e validar_convite):
-- select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--  where n.nspname='public' and p.prosecdef
--    and has_function_privilege('anon', p.oid, 'EXECUTE') order by 1;
