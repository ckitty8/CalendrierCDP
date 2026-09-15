CREATE TABLE public.equipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL UNIQUE,
  couleur text NOT NULL DEFAULT '#2563eb',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.projets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id uuid NOT NULL REFERENCES public.equipes(id) ON DELETE CASCADE,
  nom text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.membres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id uuid NOT NULL REFERENCES public.equipes(id) ON DELETE CASCADE,
  projet_id uuid REFERENCES public.projets(id) ON DELETE SET NULL,
  nom text NOT NULL,
  role text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.jours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membre_id uuid NOT NULL REFERENCES public.membres(id) ON DELETE CASCADE,
  date date NOT NULL,
  valeur numeric(2,1) NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'conge_valide',
  commentaire text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (membre_id, date)
);

CREATE TABLE public.jours_speciaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  libelle text NOT NULL,
  type text NOT NULL DEFAULT 'ferie'
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.membres TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jours TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jours_speciaux TO anon, authenticated;
GRANT ALL ON public.equipes, public.projets, public.membres, public.jours, public.jours_speciaux TO service_role;

ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jours_speciaux ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipes ouvertes" ON public.equipes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "projets ouverts" ON public.projets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "membres ouverts" ON public.membres FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "jours ouverts" ON public.jours FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "jours speciaux ouverts" ON public.jours_speciaux FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.equipes (nom, couleur) VALUES
  ('CDO', '#2563eb'),
  ('VISTA', '#0d9488'),
  ('Talend', '#b45309');

INSERT INTO public.projets (equipe_id, nom)
SELECT id, 'Roadmap CDO' FROM public.equipes WHERE nom = 'CDO'
UNION ALL SELECT id, 'Run / Support' FROM public.equipes WHERE nom = 'CDO'
UNION ALL SELECT id, 'VISTA Core' FROM public.equipes WHERE nom = 'VISTA'
UNION ALL SELECT id, 'Flux Talend' FROM public.equipes WHERE nom = 'Talend';

INSERT INTO public.membres (equipe_id, projet_id, nom, role)
SELECT e.id, p.id, 'BOUJELBEN Nouha', 'Développeuse'
FROM public.equipes e JOIN public.projets p ON p.equipe_id = e.id AND p.nom = 'Roadmap CDO'
WHERE e.nom = 'CDO'
UNION ALL
SELECT e.id, p.id, 'HOUSSOU Lenaic', 'Développeur'
FROM public.equipes e JOIN public.projets p ON p.equipe_id = e.id AND p.nom = 'Roadmap CDO'
WHERE e.nom = 'CDO';

INSERT INTO public.jours_speciaux (date, libelle, type) VALUES
  ('2026-01-01', 'Jour de l''An', 'ferie'),
  ('2026-04-06', 'Lundi de Pâques', 'ferie'),
  ('2026-05-01', 'Fête du Travail', 'ferie'),
  ('2026-05-08', 'Victoire 1945', 'ferie'),
  ('2026-05-14', 'Ascension', 'ferie'),
  ('2026-05-15', 'Fermeture entreprise', 'fermeture'),
  ('2026-05-25', 'Lundi de Pentecôte', 'ferie'),
  ('2026-07-14', 'Fête nationale', 'ferie'),
  ('2026-08-15', 'Assomption', 'ferie'),
  ('2026-11-01', 'Toussaint', 'ferie'),
  ('2026-11-11', 'Armistice', 'ferie'),
  ('2026-12-25', 'Noël', 'ferie');