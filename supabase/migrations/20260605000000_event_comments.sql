-- Event comments: participation-gated discussion thread per event.
create table if not exists public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_comments_event_id_created_at_idx
  on public.event_comments (event_id, created_at);

alter table public.event_comments enable row level security;

-- READ: event creator OR a participant with status pending/confirmed.
create policy "event_comments_select" on public.event_comments
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_comments.event_id and e.created_by = auth.uid()
    )
    or exists (
      select 1 from public.event_participants p
      where p.event_id = event_comments.event_id
        and p.user_id = auth.uid()
        and p.status in ('pending', 'confirmed')
    )
  );

-- CREATE: own row, and (creator OR confirmed participant).
create policy "event_comments_insert" on public.event_comments
  for insert with check (
    user_id = auth.uid()
    and (
      exists (
        select 1 from public.events e
        where e.id = event_comments.event_id and e.created_by = auth.uid()
      )
      or exists (
        select 1 from public.event_participants p
        where p.event_id = event_comments.event_id
          and p.user_id = auth.uid()
          and p.status = 'confirmed'
      )
    )
  );

-- UPDATE / DELETE: author only.
create policy "event_comments_update" on public.event_comments
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "event_comments_delete" on public.event_comments
  for delete using (user_id = auth.uid());
