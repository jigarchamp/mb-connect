-- Temporarily grant admin role for testing
UPDATE public.profiles
SET role = 'admin'
WHERE id = '9dcf4dc1-5ec3-41a1-bd3a-d226c9f9c2e5';
