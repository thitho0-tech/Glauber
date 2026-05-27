-- ============================================================
-- CINEFLOW — Migration 0008 (D4): Check-in manual
-- ============================================================
-- Tabela check_ins: registra hora de entrada e saída de cada pessoa
-- num planejamento. Cada pessoa só pode ter 1 check-in aberto (sem saída)
-- por planejamento. Várias entradas/saídas no mesmo dia são permitidas
-- (ex: pessoa saiu pro almoço, voltou — vira 2 registros).
-- ============================================================

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  projeto_pessoa_id uuid not null references public.projeto_pessoas(id) on delete cascade,
  dia_id uuid not null references public.dias_filmagem(id) on delete cascade,
  entrada timestamptz not null default now(),
  saida timestamptz,
  observacao text,
  registrado_por uuid references auth.users(id),
  criado_em timestamptz default now(),
  check (saida is null or saida >= entrada)
);

create index if not exists check_ins_dia_idx on public.check_ins(dia_id);
create index if not exists check_ins_projeto_pessoa_idx on public.check_ins(projeto_pessoa_id);

-- Unique parcial: só pode haver 1 check-in aberto (saida null) por pessoa+dia
create unique index if not exists check_ins_aberto_unico
  on public.check_ins(projeto_pessoa_id, dia_id)
  where saida is null;

alter table public.check_ins enable row level security;

drop policy if exists "check_ins select" on public.check_ins;
create policy "check_ins select" on public.check_ins for select using (
  dia_id in (
    select d.id from public.dias_filmagem d
    where d.projeto_id in (
      select p.id from public.projetos p
      where p.org_id in (select public.user_orgs())
    )
  )
);

drop policy if exists "check_ins insert" on public.check_ins;
create policy "check_ins insert" on public.check_ins for insert with check (
  dia_id in (
    select d.id from public.dias_filmagem d
    where d.projeto_id in (
      select p.id from public.projetos p
      where p.org_id in (select public.user_orgs())
    )
  )
);

drop policy if exists "check_ins update" on public.check_ins;
create policy "check_ins update" on public.check_ins for update using (
  dia_id in (
    select d.id from public.dias_filmagem d
    where d.projeto_id in (
      select p.id from public.projetos p
      where p.org_id in (select public.user_orgs())
    )
  )
);

drop policy if exists "check_ins delete" on public.check_ins;
create policy "check_ins delete" on public.check_ins for delete using (
  dia_id in (
    select d.id from public.dias_filmagem d
    where d.projeto_id in (
      select p.id from public.projetos p
      where p.org_id in (select public.user_orgs())
    )
  )
);

-- Trigger: ao inserir/atualizar, set registrado_por = auth.uid()
create or replace function public.trg_set_registrado_por()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.registrado_por is null then
    new.registrado_por := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists set_registrado_por on public.check_ins;
create trigger set_registrado_por
  before insert on public.check_ins
  for each row execute procedure public.trg_set_registrado_por();

-- ============================================================
-- Verificação:
--   select count(*) from information_schema.tables where table_name='check_ins';
--   select count(*) from information_schema.columns where table_name='check_ins';
-- ============================================================
