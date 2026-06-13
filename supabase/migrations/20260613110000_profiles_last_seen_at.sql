-- Presence tracking: when the user was last seen online.
-- Updated by a throttled heartbeat in src/proxy.ts (at most once per 5 min).
ALTER TABLE public.profiles ADD COLUMN last_seen_at timestamptz;
