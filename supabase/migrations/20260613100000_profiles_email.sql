-- Denormalized email column on profiles (kept in sync with auth.users)
ALTER TABLE public.profiles ADD COLUMN email text;

-- Populate email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  return new;
end;
$function$;

-- Keep profiles.email in sync when auth email changes
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (new.email IS DISTINCT FROM old.email)
  EXECUTE FUNCTION public.handle_user_email_update();

-- Backfill existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS DISTINCT FROM u.email;
