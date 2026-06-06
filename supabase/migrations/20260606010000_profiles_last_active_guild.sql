-- Add last_active_guild_id to profiles referencing guilds(id)
alter table public.profiles
add column last_active_guild_id uuid references public.guilds(id) on delete set null;
