ALTER TABLE public.authorized_participants DROP COLUMN IF EXISTS password;
ALTER TABLE public.authorized_participants RENAME COLUMN nom_pdv TO nom_cod;