-- Add public_id to guilds and events tables to allow short shareable URLs
alter table public.guilds add column public_id text unique default generate_public_id();
alter table public.events add column public_id text unique default generate_public_id();

-- Backfill public_id for existing records
update public.guilds set public_id = generate_public_id() where public_id is null;
update public.events set public_id = generate_public_id() where public_id is null;

-- Make columns not null
alter table public.guilds alter column public_id set not null;
alter table public.events alter column public_id set not null;
