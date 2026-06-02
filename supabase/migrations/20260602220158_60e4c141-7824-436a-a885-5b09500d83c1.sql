
CREATE TABLE public.authorized_participants (
  msisdn TEXT PRIMARY KEY,
  nom_pdv TEXT NOT NULL,
  wilaya TEXT NOT NULL,
  region TEXT NOT NULL,
  distributeur_actuel TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.authorized_participants TO service_role;
ALTER TABLE public.authorized_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.responses (
  msisdn TEXT PRIMARY KEY REFERENCES public.authorized_participants(msisdn) ON DELETE CASCADE,
  choix_1 TEXT NOT NULL,
  choix_2 TEXT NOT NULL,
  choix_3 TEXT NOT NULL,
  choix_4 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_choices CHECK (
    choix_1 <> choix_2 AND choix_1 <> choix_3 AND choix_1 <> choix_4
    AND choix_2 <> choix_3 AND choix_2 <> choix_4
    AND choix_3 <> choix_4
  )
);

GRANT ALL ON public.responses TO service_role;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_authorized_wilaya ON public.authorized_participants(wilaya);
CREATE INDEX idx_authorized_region ON public.authorized_participants(region);
CREATE INDEX idx_authorized_distributeur ON public.authorized_participants(distributeur_actuel);
