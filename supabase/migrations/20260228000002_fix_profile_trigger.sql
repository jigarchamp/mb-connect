-- The handle_new_user trigger fails because the RLS INSERT policy on profiles
-- blocks the insert even from a security definer function in some Supabase configs.
-- Fix: drop the INSERT policy (trigger is the only way profiles are created),
-- recreate the function with explicit schema + search_path, and transfer ownership
-- to postgres (superuser) so it definitively bypasses RLS.

DROP POLICY IF EXISTS "System can insert profiles" ON profiles;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'scout')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
