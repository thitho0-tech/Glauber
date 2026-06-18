-- ============================================================
-- Migration 0056 — Aprovação de OD (C1) + Aprovação em Arte (Figurinos/Objetos)
-- - Colunas de aprovação nas 3 tabelas (espelha scouting de locações 0047).
-- - Grant figurino_arte/aprovar p/ os 4 aprovadores de Arte.
-- - Ajusta policies de escrita (cutover) p/ permitir quem tem 'aprovar'
--   (a aprovação é um UPDATE; senão o RLS bloquearia o aprovador sem 'editar').
-- Colar no SQL Editor. Idempotente. Em transação.
-- ============================================================
begin;

-- ── C1: aprovação da OD ──────────────────────────────────────
-- Fluxo: OD nasce 'pendente' → aprovador (Direção) aprova/rejeita →
-- publicar só é permitido quando 'aprovada'. (od/aprovar já está na matriz:
-- Diretor, Diretor de Produção, Produtor Executivo.)
alter table public.ordens_do_dia add column if not exists aprovacao_status text not null default 'pendente'
  check (aprovacao_status in ('pendente','aprovada','rejeitada'));
alter table public.ordens_do_dia add column if not exists aprovado_por uuid;
alter table public.ordens_do_dia add column if not exists aprovado_em timestamptz;
alter table public.ordens_do_dia add column if not exists aprovacao_comentarios text;

-- ── Arte: aprovação de Figurinos e Objetos de Arte ───────────
-- Todo item nasce 'pendente' → aprovador dá 'aprovado' ou 'nao_aprovado'.
alter table public.figurinos add column if not exists aprovacao_status text not null default 'pendente'
  check (aprovacao_status in ('pendente','aprovado','nao_aprovado'));
alter table public.figurinos add column if not exists aprovado_por uuid;
alter table public.figurinos add column if not exists aprovado_em timestamptz;
alter table public.figurinos add column if not exists aprovacao_comentarios text;

alter table public.arte_objetos add column if not exists aprovacao_status text not null default 'pendente'
  check (aprovacao_status in ('pendente','aprovado','nao_aprovado'));
alter table public.arte_objetos add column if not exists aprovado_por uuid;
alter table public.arte_objetos add column if not exists aprovado_em timestamptz;
alter table public.arte_objetos add column if not exists aprovacao_comentarios text;

-- ── Grant figurino_arte/aprovar p/ aprovadores de Arte ───────
-- Diretor(a), Produtor(a) Geral, Assistente de Direção, Produtor(a) Executivo(a)
insert into public.perm_funcao_grants(funcao_av_id,codigo_recurso,acao,conceder)
select f.id, 'figurino_arte', 'aprovar', true from public.funcoes_av f
where f.id in ('e468ca7a-4cea-4445-836d-0835cdc6d97a','27cd4ffe-dbd3-4957-91a8-75f18fe523ab',
 '6d08218a-b2e1-4a59-9909-8f65ca4f4ada','954b7f4d-35bf-4dce-bd01-3e687dc86440')
on conflict (funcao_av_id, codigo_recurso, acao) do nothing;

-- garante o recurso no catálogo (idempotente)
update public.perm_recursos set acao = 'aprovar, editar, ver' where codigo='figurino_arte';

-- ── Ajuste das policies de escrita (editar OR aprovar) ───────
drop policy if exists "od write pode" on public.ordens_do_dia;
create policy "od write pode" on public.ordens_do_dia for all to authenticated
  using      (public.pode(projeto_id,'od','editar') or public.pode(projeto_id,'od','aprovar'))
  with check (public.pode(projeto_id,'od','editar') or public.pode(projeto_id,'od','aprovar'));

drop policy if exists "figurinos write pode" on public.figurinos;
create policy "figurinos write pode" on public.figurinos for all to authenticated
  using      (public.pode(projeto_id,'figurino_arte','editar') or public.pode(projeto_id,'figurino_arte','aprovar'))
  with check (public.pode(projeto_id,'figurino_arte','editar') or public.pode(projeto_id,'figurino_arte','aprovar'));

drop policy if exists "arte_obj write pode" on public.arte_objetos;
create policy "arte_obj write pode" on public.arte_objetos for all to authenticated
  using      (public.pode(projeto_id,'figurino_arte','editar') or public.pode(projeto_id,'figurino_arte','aprovar'))
  with check (public.pode(projeto_id,'figurino_arte','editar') or public.pode(projeto_id,'figurino_arte','aprovar'));

-- ── Alerta automático: OD pendente notifica os aprovadores ───
-- Ao criar a OD (pendente), avisa no sino quem tem od/aprovar (Direção).
create or replace function public.trg_notificar_od_pendente() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if NEW.aprovacao_status = 'pendente' then
    insert into public.notificacoes_inapp (user_id, tipo, titulo, mensagem, link)
    select distinct au.id, 'od_aprovacao',
           'OD aguardando aprovação',
           coalesce(NEW.titulo,'Ordem do Dia'),
           '/projetos/'||NEW.projeto_id||'/ordens-do-dia/od/'||NEW.id
    from public.projeto_pessoas pp
    join public.pessoas pe on pe.id = pp.pessoa_id
    join auth.users au on lower(au.email) = lower(pe.email)
    join public.projeto_pessoa_funcoes ppf on ppf.projeto_pessoa_id = pp.id
    join public.perm_funcao_grants g on g.funcao_av_id = ppf.funcao_av_id
    where pp.projeto_id = NEW.projeto_id
      and pp.deleted_at is null
      and g.codigo_recurso = 'od' and g.acao = 'aprovar' and g.conceder = true;
  end if;
  return NEW;
end$$;
revoke execute on function public.trg_notificar_od_pendente() from public, anon, authenticated;

drop trigger if exists od_pendente_notifica on public.ordens_do_dia;
create trigger od_pendente_notifica after insert on public.ordens_do_dia
  for each row execute function public.trg_notificar_od_pendente();

notify pgrst,'reload schema';
commit;
