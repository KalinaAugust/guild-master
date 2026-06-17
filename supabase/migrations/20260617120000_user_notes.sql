-- Private user profile notes: notes about users visible only to the author.
create table if not exists public.user_notes (
  user_id uuid not null constraint user_notes_user_id_fkey references public.profiles (id) on delete cascade,
  target_user_id uuid not null constraint user_notes_target_user_id_fkey references public.profiles (id) on delete cascade,
  note text not null check (char_length(trim(note)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, target_user_id)
);

create index if not exists user_notes_user_id_idx on public.user_notes (user_id);

alter table public.user_notes enable row level security;

-- All operations (select, insert, update, delete) are allowed only for the author (user_id = auth.uid())
create policy "user_notes_select" on public.user_notes
  for select using (user_id = auth.uid());

create policy "user_notes_insert" on public.user_notes
  for insert with check (user_id = auth.uid());

create policy "user_notes_update" on public.user_notes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "user_notes_delete" on public.user_notes
  for delete using (user_id = auth.uid());
