-- Add recurring events fields to events table
ALTER TABLE public.events
ADD COLUMN week_days integer[] DEFAULT '{}'::integer[],
ADD COLUMN exceptions date[] DEFAULT '{}'::date[];
