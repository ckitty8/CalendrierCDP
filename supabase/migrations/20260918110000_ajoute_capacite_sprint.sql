-- Capacité/vélocité d'équipe par sprint (jours-homme), reprise des feuilles
-- Excel "Capa_Sprint_Réel" et "Capa_Sprint_prévisionnel" du fichier source.
-- Affichée dans un onglet optionnel du planning (checkbox pour l'afficher).
CREATE TABLE public.capacite_sprint (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membre_id uuid NOT NULL REFERENCES public.membres(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('reel', 'previsionnel')),
  sprint smallint NOT NULL CHECK (sprint BETWEEN 1 AND 12),
  jours numeric(5,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (membre_id, type, sprint)
);

ALTER TABLE public.capacite_sprint ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capacite_sprint_all" ON public.capacite_sprint
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

INSERT INTO public.capacite_sprint (membre_id, type, sprint, jours)
SELECT m.id, 'reel', s.sprint, s.jours
FROM public.membres m
CROSS JOIN LATERAL (VALUES
  (1,20),(2,20),(3,22),(4,20),(5,7),(6,19),(7,15.5),(8,11),(9,22),(10,22),(11,20),(12,22)
) AS s(sprint, jours)
WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, 'reel', s.sprint, s.jours
FROM public.membres m
CROSS JOIN LATERAL (VALUES
  (1,20),(2,15),(3,22),(4,17),(5,12),(6,22),(7,21),(8,6),(9,22),(10,0),(11,0),(12,0)
) AS s(sprint, jours)
WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, 'previsionnel', s.sprint, s.jours
FROM public.membres m
CROSS JOIN LATERAL (VALUES
  (1,18.5),(2,18.5),(3,18.5),(4,18.5),(5,18),(6,18),(7,18),(8,18),(9,18),(10,18),(11,18),(12,18)
) AS s(sprint, jours)
WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, 'previsionnel', s.sprint, s.jours
FROM public.membres m
CROSS JOIN LATERAL (VALUES
  (1,18.5),(2,18.5),(3,18.5),(4,18.5),(5,18),(6,18),(7,18),(8,18),(9,18),(10,18),(11,18),(12,18)
) AS s(sprint, jours)
WHERE m.nom = 'HOUSSOU Lenaic';
