-- Excluir uma tarefa apaga os anexos em cascata; nesse caso não há histórico a registrar
-- (antes, o registro "removeu anexo" apontava para a tarefa já excluída e bloqueava a exclusão)
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
  if exists (select 1 from public.tasks where id = old.task_id) then
    insert into public.task_activity (task_id, actor_id, action, from_value) values (old.task_id, auth.uid(), 'removeu anexo', old.name);
  end if;
  return old;
end;
$$;
