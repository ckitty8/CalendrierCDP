-- Remplace les données de démonstration par les vraies données de l'équipe CDO (Calendrier_2026.xlsx)
DELETE FROM public.jours;
DELETE FROM public.membres;
DELETE FROM public.projets;
DELETE FROM public.equipes;

INSERT INTO public.equipes (nom, couleur) VALUES ('CDO', '#2563eb');

INSERT INTO public.membres (equipe_id, nom)
SELECT id, 'LABBE Christelle' FROM public.equipes WHERE nom='CDO'
UNION ALL
SELECT id, 'BOUJELBEN Nouha' FROM public.equipes WHERE nom='CDO'
UNION ALL
SELECT id, 'HOUSSOU Lenaic' FROM public.equipes WHERE nom='CDO'
UNION ALL
SELECT id, 'CASELLI Anne' FROM public.equipes WHERE nom='CDO'
UNION ALL
SELECT id, 'KERARMA Cerine' FROM public.equipes WHERE nom='CDO';

INSERT INTO public.jours (membre_id, date, valeur, type)
SELECT m.id, '2026-01-10'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-02-04'::date, 0.5, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-02-07'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-02-08'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-02-28'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-03-01'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-06-01'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-06-23'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-12-22'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-04-13'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-16'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-17'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-18'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-19'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-20'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-24'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-25'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-26'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-27'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-30'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-31'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-06-01'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-07-22'::date, 0.5, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-02-21'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-02-22'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-02-23'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-02-24'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-02-25'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-04-25'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-04-26'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-04-27'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-04-28'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-05-02'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-05-03'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-05-04'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-05-05'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-02-25'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-02-28'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-03-01'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-03-02'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-03-03'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-03-04'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-18'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-19'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-20'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-21'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-22'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-25'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-26'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-27'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-28'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-05-20'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-05-27'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne';