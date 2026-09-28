-- Gerenciador de tarefas (kanban da equipe)

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text,
  status text not null default 'planejamento'
    check (status in ('planejamento', 'andamento', 'concluido', 'cancelado')),
  priority text not null default 'media' check (priority in ('baixa', 'media', 'alta', 'urgente')),
  category text,
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  checklist jsonb not null default '[]'::jsonb,   -- [{ "text": "...", "done": false }]
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  status_changed_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_status_idx on public.tasks (status, due_date);
create index tasks_assignee_idx on public.tasks (assignee_id);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index task_comments_task_idx on public.task_comments (task_id, created_at);

-- Histórico automático: criação, mudança de coluna, responsável e prazo
create table public.task_activity (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,       -- criou, moveu, atribuiu, prazo
  from_value text,
  to_value text,
  created_at timestamptz not null default now()
);
create index task_activity_task_idx on public.task_activity (task_id, created_at);

create or replace function public.tasks_track()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity (task_id, actor_id, action, to_value) values (new.id, auth.uid(), 'criou', new.status);
    return new;
  end if;

  new.updated_at = now();
  if new.status is distinct from old.status then
    new.status_changed_at = now();
    new.completed_at = case when new.status = 'concluido' then now() else null end;
    insert into public.task_activity (task_id, actor_id, action, from_value, to_value)
    values (new.id, auth.uid(), 'moveu', old.status, new.status);
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    insert into public.task_activity (task_id, actor_id, action, from_value, to_value)
    values (new.id, auth.uid(), 'atribuiu', old.assignee_id::text, new.assignee_id::text);
  end if;
  if new.due_date is distinct from old.due_date then
    insert into public.task_activity (task_id, actor_id, action, from_value, to_value)
    values (new.id, auth.uid(), 'prazo', old.due_date::text, new.due_date::text);
  end if;
  return new;
end;
$$;

create trigger tasks_track_insert after insert on public.tasks
  for each row execute function public.tasks_track();
create trigger tasks_track_update before update on public.tasks
  for each row execute function public.tasks_track();

-- Acesso: toda a equipe ativa vê e trabalha nas tarefas; excluir só quem criou, admin ou gestor
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_activity enable row level security;

create policy "Equipe vê tarefas" on public.tasks
  for select to authenticated using (public.current_app_role() is not null);
create policy "Equipe cria tarefas" on public.tasks
  for insert to authenticated with check (public.current_app_role() is not null);
create policy "Equipe atualiza tarefas" on public.tasks
  for update to authenticated
  using (public.current_app_role() is not null) with check (public.current_app_role() is not null);
create policy "Criador, admin e gestor excluem tarefas" on public.tasks
  for delete to authenticated
  using (created_by = (select auth.uid()) or public.has_role(array['admin', 'gestor']::public.app_role[]));

create policy "Equipe vê comentários" on public.task_comments
  for select to authenticated using (public.current_app_role() is not null);
create policy "Equipe comenta" on public.task_comments
  for insert to authenticated
  with check (public.current_app_role() is not null and author_id = (select auth.uid()));
create policy "Autor apaga o próprio comentário" on public.task_comments
  for delete to authenticated using (author_id = (select auth.uid()));

create policy "Equipe vê histórico" on public.task_activity
  for select to authenticated using (public.current_app_role() is not null);

-- A equipe precisa ver nome e foto uns dos outros (responsáveis, autores)
create policy "Equipe vê perfis da equipe" on public.profiles
  for select to authenticated using (public.current_app_role() is not null);

-- Atualização em tempo real do quadro para todos
alter publication supabase_realtime add table public.tasks, public.task_comments;
