CREATE TABLE public.supervisors (
  username text PRIMARY KEY,
  password text NOT NULL,
  full_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.supervisors TO service_role;
ALTER TABLE public.supervisors ENABLE ROW LEVEL SECURITY;
-- No public policies: only service_role (server) accesses this table.

ALTER TABLE public.authorized_participants
  ADD COLUMN IF NOT EXISTS supervisor_username text REFERENCES public.supervisors(username) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_authorized_participants_supervisor
  ON public.authorized_participants(supervisor_username);