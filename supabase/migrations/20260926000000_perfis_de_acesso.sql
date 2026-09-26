-- Etapa 0: perfis de acesso
create type public.app_role as enum ('admin', 'gestor', 'marketing', 'atendimento', 'visualizador');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  role public.app_role not null default 'visualizador',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Papel do usuário logado (security definer evita recursão nas policies)
create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.has_role(roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_role() = any(roles), false)
$$;

create policy "Usuário lê o próprio perfil"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Admin e gestor leem todos os perfis"
  on public.profiles for select to authenticated
  using (public.has_role(array['admin', 'gestor']::public.app_role[]));

create policy "Admin altera perfis"
  on public.profiles for update to authenticated
  using (public.has_role(array['admin']::public.app_role[]))
  with check (public.has_role(array['admin']::public.app_role[]));

-- Cria o perfil automaticamente quando um usuário é cadastrado/convidado
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
