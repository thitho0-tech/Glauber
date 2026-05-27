-- ============================================================
-- CINEFLOW - Migration 0017 (D6): Documentos da pessoa (onboarding)
-- ============================================================
-- Tabela para upload de documentos (RG, CPF, comprovante endereco,
-- contrato assinado, foto, etc). OCR fica para fase 2 - aqui so
-- guardamos referencia ao arquivo + status.
-- Acesso: org-wide (qualquer membro da org da pessoa via projeto_pessoas).
-- ============================================================

create table if not exists public.documentos_pessoa (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  tipo text not null,                                -- rg, cpf, comp_endereco, contrato, foto, outro
  arquivo_url text,
  dados_ocr jsonb,                                   -- placeholder para extração futura
  status text not null check (status in ('pendente','recebido','validado','rejeitado')) default 'pendente',
  observacoes text,
  enviado_por uuid references auth.users(id),
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);
create index if not exists docs_pessoa_idx on public.documentos_pessoa(pessoa_id);
create index if not exists docs_org_idx on public.documentos_pessoa(org_id);

alter table public.documentos_pessoa enable row level security;

drop policy if exists "docs select org" on public.documentos_pessoa;
create policy "docs select org" on public.documentos_pessoa for select using (
  org_id in (select public.user_orgs())
);
drop policy if exists "docs write org" on public.documentos_pessoa;
create policy "docs write org" on public.documentos_pessoa for all using (
  org_id in (select public.user_orgs())
) with check (
  org_id in (select public.user_orgs())
);

-- Trigger touch
create or replace function public.trg_docs_touch()
returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end; $$;

drop trigger if exists docs_touch on public.documentos_pessoa;
create trigger docs_touch before update on public.documentos_pessoa
  for each row execute procedure public.trg_docs_touch();

-- Verificacao:
--   select count(*) from information_schema.tables where table_name='documentos_pessoa';
