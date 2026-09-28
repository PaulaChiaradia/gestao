-- Anexos das tarefas (qualquer tipo de arquivo) e histórico mais completo

-- Pasta privada: acesso só pela equipe logada, com links temporários; até 25 MB por arquivo
insert into storage.buckets (id, name, public, file_size_limit)
values ('task-files', 'task-files', false, 26214400)
on conflict (id) do nothing;

create policy "Equipe lê anexos de tarefas" on storage.objects
  for select to authenticated
  using (bucket_id = 'task-files' and public.current_app_role() is not null);

create policy "Equipe envia anexos de tarefas" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'task-files' and public.current_app_role() is not null);

create policy "Quem enviou, admin ou gestor apagam anexos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'task-files'
    and (owner = (select auth.uid()) or public.has_role(array['admin', 'gestor']::public.app_role[]))
  );

create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  comment_id uuid references public.task_comments (id) on delete set null,
  uploader_id uuid references public.profiles (id) on delete set null default auth.uid(),
  name text not null,
  path text not null unique,       -- <task_id>/<uuid>-<nome>
  size bigint not null default 0,
  mime text,
  created_at timestamptz not null default now()
);
create index task_attachments_task_idx on public.task_attachments (task_id, created_at desc);

alter table public.task_attachments enable row level security;

create policy "Equipe vê anexos" on public.task_attachments
  for select to authenticated using (public.current_app_role() is not null);
create policy "Equipe registra anexos" on public.task_attachments
  for insert to authenticated
  with check (public.current_app_role() is not null and uploader_id = (select auth.uid()));
create policy "Quem enviou, admin ou gestor removem anexos" on public.task_attachments
  for delete to authenticated
  using (uploader_id = (select auth.uid()) or public.has_role(array['admin', 'gestor']::public.app_role[]));

-- Histórico: anexos enviados/removidos
create or replace function public.task_attachments_track()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity (task_id, actor_id, action, to_value) values (new.task_id, auth.uid(), 'anexou', new.name);
    return new;
  end if;
  insert into public.task_activity (task_id, actor_id, action, from_value) values (old.task_id, auth.uid(), 'removeu anexo', old.name);
  return old;
end;
$$;

create trigger task_attachments_track after insert or delete on public.task_attachments
  for each row execute function public.task_attachments_track();

-- Histórico: edições de nome, descrição, prioridade, categoria e subtarefas
create or replace function public.tasks_track_edits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed text[] := '{}';
begin
  if new.title is distinct from old.title then changed := changed || 'nome'; end if;
  if new.description is distinct from old.description then changed := changed || 'descrição'; end if;
  if new.priority is distinct from old.priority then changed := changed || 'prioridade'; end if;
  if new.category is distinct from old.category then changed := changed || 'categoria'; end if;
  if jsonb_array_length(new.checklist) is distinct from jsonb_array_length(old.checklist) then changed := changed || 'subtarefas'; end if;
  if array_length(changed, 1) > 0 then
    insert into public.task_activity (task_id, actor_id, action, to_value)
    values (new.id, auth.uid(), 'editou', array_to_string(changed, ', '));
  end if;
  return null;
end;
$$;

create trigger tasks_track_edits after update on public.tasks
  for each row execute function public.tasks_track_edits();

alter publication supabase_realtime add table public.task_attachments;
