-- Les sprints deviennent des entités gérables (ajout/suppression, dates de
-- début/fin modifiables), et la capacité par sprint n'est plus une valeur
-- figée importée de l'Excel : elle est recalculée à la volée côté client à
-- partir du planning (jours ouvrés de la période moins congés validés).
-- La table capacite_sprint (valeurs statiques) n'a donc plus lieu d'être.
DROP TABLE IF EXISTS public.capacite_sprint;

CREATE TABLE public.sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sprints_all" ON public.sprints
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Reprise des 12 sprints d'origine du fichier Excel, alignés sur les mois
-- (l'Excel ne donnait pas de dates précises par sprint) — à ajuster ensuite
-- via l'interface si besoin.
INSERT INTO public.sprints (nom, date_debut, date_fin, ordre) VALUES
  ('Sprint 1', '2026-01-01', '2026-01-31', 1),
  ('Sprint 2', '2026-02-01', '2026-02-28', 2),
  ('Sprint 3', '2026-03-01', '2026-03-31', 3),
  ('Sprint 4', '2026-04-01', '2026-04-30', 4),
  ('Sprint 5', '2026-05-01', '2026-05-31', 5),
  ('Sprint 6', '2026-06-01', '2026-06-30', 6),
  ('Sprint 7', '2026-07-01', '2026-07-31', 7),
  ('Sprint 8', '2026-08-01', '2026-08-31', 8),
  ('Sprint 9', '2026-09-01', '2026-09-30', 9),
  ('Sprint 10', '2026-10-01', '2026-10-31', 10),
  ('Sprint 11', '2026-11-01', '2026-11-30', 11),
  ('Sprint 12', '2026-12-01', '2026-12-31', 12);

-- Répartition des tâches (% par type) : reprise de la ligne "% de
-- répartition des tâches" du fichier Excel. Sert à ventiler la capacité
-- totale de l'équipe par sprint entre types de tâches (US, Incident, ...).
-- Le pourcentage est modifiable via l'interface ; le chiffrage par sprint
-- (table ci-dessous, calculé côté client) = pourcentage × capacité totale
-- de l'équipe sur le sprint.
CREATE TABLE public.repartition_taches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  pourcentage numeric(5,2) NOT NULL CHECK (pourcentage >= 0 AND pourcentage <= 100),
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repartition_taches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repartition_taches_all" ON public.repartition_taches
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

INSERT INTO public.repartition_taches (nom, pourcentage, ordre) VALUES
  ('US', 36, 1),
  ('Incident', 20, 2),
  ('Bug', 6, 3),
  ('doc', 5, 4),
  ('Test / Aller retour', 9, 5),
  ('Technique', 4, 6),
  ('Autres sujets', 20, 7);
