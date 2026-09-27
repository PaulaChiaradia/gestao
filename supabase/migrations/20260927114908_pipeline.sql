-- Etapa 1b: pipeline de palestras, treinamentos e consultorias

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null default 'palestra' check (kind in ('palestra', 'treinamento', 'consultoria', 'mentoria', 'outro')),
  stage text not null default 'novo' check (stage in ('novo', 'qualificado', 'proposta', 'fechado', 'perdido')),
  contact_id uuid references public.contacts (id) on delete set null,
  contact_name text,
  contact_phone text,
  contact_email text,
  company text,
  city text,
  state char(2),
  event_date date,
  audience int,                      -- número de participantes
  format text check (format in ('presencial', 'online', 'hibrido')),
  value numeric(12, 2),
  source text,                       -- whatsapp, instagram, email, indicacao, site, robo
  notes text,
  lost_reason text,
  owner_id uuid references auth.users (id) default auth.uid(),
  stage_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index opportunities_stage_idx on public.opportunities (stage, updated_at desc);

alter table public.opportunities enable row level security;

create policy "Relacionamento vê oportunidades" on public.opportunities
  for select to authenticated
  using (public.has_role(array['admin', 'gestor', 'atendimento']::public.app_role[]));

create policy "Relacionamento cria oportunidades" on public.opportunities
  for insert to authenticated
  with check (public.has_role(array['admin', 'gestor', 'atendimento']::public.app_role[]));

create policy "Relacionamento edita oportunidades" on public.opportunities
  for update to authenticated
  using (public.has_role(array['admin', 'gestor', 'atendimento']::public.app_role[]))
  with check (public.has_role(array['admin', 'gestor', 'atendimento']::public.app_role[]));

create policy "Admin e gestor excluem oportunidades" on public.opportunities
  for delete to authenticated
  using (public.has_role(array['admin', 'gestor']::public.app_role[]));

create or replace function public.opportunities_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.stage is distinct from old.stage then
    new.stage_changed_at = now();
  end if;
  return new;
end;
$$;

create trigger opportunities_touch before update on public.opportunities
  for each row execute function public.opportunities_touch();
