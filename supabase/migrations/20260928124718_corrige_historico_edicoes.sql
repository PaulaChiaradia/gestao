-- Corrige o registro de edições: "text[] || 'texto'" era interpretado como junção de arrays
create or replace function public.tasks_track_edits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed text[] := '{}';
begin
  if new.title is distinct from old.title then changed := array_append(changed, 'nome'); end if;
  if new.description is distinct from old.description then changed := array_append(changed, 'descrição'); end if;
  if new.priority is distinct from old.priority then changed := array_append(changed, 'prioridade'); end if;
  if new.category is distinct from old.category then changed := array_append(changed, 'categoria'); end if;
  if jsonb_array_length(new.checklist) is distinct from jsonb_array_length(old.checklist) then
    changed := array_append(changed, 'subtarefas');
  end if;
  if cardinality(changed) > 0 then
    insert into public.task_activity (task_id, actor_id, action, to_value)
    values (new.id, auth.uid(), 'editou', array_to_string(changed, ', '));
  end if;
  return null;
end;
$$;
