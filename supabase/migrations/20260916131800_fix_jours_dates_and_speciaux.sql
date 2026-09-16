-- Corrige les dates des jours de congés (décalage de 2 colonnes dans l'extraction
-- précédente du fichier Excel : le mapping colonne -> date utilisait la mauvaise
-- ligne de référence) et remplace les jours spéciaux de démo par les vrais jours
-- fériés/fermeture du fichier Excel (ex. le pont du 2 janvier 2026, manquant).
DELETE FROM public.jours;
DELETE FROM public.jours_speciaux;

INSERT INTO public.jours (membre_id, date, valeur, type)
SELECT m.id, '2026-01-12'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-02-06'::date, 0.5, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-02-09'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-02-10'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-03-02'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-03-03'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-06-03'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-06-25'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-12-24'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-04-15'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-18'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-19'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-20'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-21'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-22'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-26'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-27'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-28'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-05-29'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-06-01'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-06-02'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-06-03'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-07-24'::date, 0.5, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-02-23'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-02-24'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-02-25'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-02-26'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-02-27'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-04-27'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-04-28'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-04-29'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-04-30'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-05-04'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-05-05'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-05-06'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-05-07'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-02-27'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-03-02'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-03-03'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-03-04'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-03-05'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-03-06'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-20'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-21'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-22'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-23'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-24'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-27'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-28'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-29'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-04-30'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-05-22'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-05-29'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne';

INSERT INTO public.jours_speciaux (date, libelle, type) VALUES
('2026-01-01', 'Jour de l''An', 'ferie'),
('2026-01-02', 'Pont du 1er janvier', 'ferie'),
('2026-04-05', 'Pâques', 'ferie'),
('2026-04-06', 'Lundi de Pâques', 'ferie'),
('2026-05-01', 'Fête du Travail', 'ferie'),
('2026-05-08', 'Victoire 1945', 'ferie'),
('2026-05-14', 'Ascension', 'ferie'),
('2026-05-15', 'Pont de l''Ascension', 'ferie'),
('2026-05-24', 'Pentecôte', 'ferie'),
('2026-05-25', 'Lundi de Pentecôte', 'ferie'),
('2026-07-13', 'Pont du 14 juillet', 'ferie'),
('2026-07-14', 'Fête nationale', 'ferie'),
('2026-08-15', 'Assomption', 'ferie'),
('2026-11-01', 'Toussaint', 'ferie'),
('2026-11-11', 'Armistice', 'ferie'),
('2026-12-25', 'Noël', 'ferie'),
('2026-08-10', 'Fermeture entreprise', 'fermeture'),
('2026-08-11', 'Fermeture entreprise', 'fermeture'),
('2026-08-12', 'Fermeture entreprise', 'fermeture'),
('2026-08-13', 'Fermeture entreprise', 'fermeture'),
('2026-08-14', 'Fermeture entreprise', 'fermeture');
