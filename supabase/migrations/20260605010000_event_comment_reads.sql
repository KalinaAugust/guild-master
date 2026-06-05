-- Per-user read marker for an event's comment thread (drives the unread badge).
create table if not exists public.event_comment_reads (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_comment_reads enable row level security;

-- A user manages only their own read marker.
create policy "event_comment_reads_select" on public.event_comment_reads
  for select using (user_id = auth.uid());

create policy "event_comment_reads_insert" on public.event_comment_reads
  for insert with check (user_id = auth.uid());

create policy "event_comment_reads_update" on public.event_comment_reads
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
