-- Reprise complète des congés depuis le fichier Excel source.
--
-- Deux problèmes cumulés faussaient les données jusqu'ici :
-- 1) L'extraction précédente ne détectait que les couleurs RVB explicites
--    et manquait les cellules colorées via une couleur de thème (vert,
--    accent6 du classeur) — notamment la quasi-totalité du mois d'août
--    et l'ensemble des congés de KERARMA Cerine.
-- 2) CASELLI Anne et KERARMA Cerine avaient disparu de la table membres
--    (probablement supprimées par erreur), ce qui empêchait toute
--    ré-association de leurs congés tant qu'elles n'existaient pas.
--
-- Cette migration recrée ces deux personnes si besoin et recharge
-- l'intégralité des 117 lignes de congés (5 personnes, janvier à
-- novembre 2026) telles que trouvées dans le fichier Excel.

INSERT INTO public.membres (equipe_id, nom)
SELECT id, 'CASELLI Anne' FROM public.equipes WHERE nom = 'CDO'
AND NOT EXISTS (SELECT 1 FROM public.membres WHERE nom = 'CASELLI Anne')
UNION ALL
SELECT id, 'KERARMA Cerine' FROM public.equipes WHERE nom = 'CDO'
AND NOT EXISTS (SELECT 1 FROM public.membres WHERE nom = 'KERARMA Cerine');

DELETE FROM public.jours;

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
SELECT m.id, '2026-07-27'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-07-28'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-07-29'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-07-30'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-07-31'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-08-03'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-08-04'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-08-05'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-08-06'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-08-07'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-08-27'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-09-28'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-09-29'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-09-30'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-10-01'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-10-02'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-11-09'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
UNION ALL
SELECT m.id, '2026-11-10'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'LABBE Christelle'
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
SELECT m.id, '2026-07-27'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-07-28'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-07-29'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-07-30'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-07-31'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-08-03'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-08-04'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-08-05'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-08-06'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
UNION ALL
SELECT m.id, '2026-08-07'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'BOUJELBEN Nouha'
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
SELECT m.id, '2026-08-17'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-08-18'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-08-19'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-08-20'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-08-21'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-08-24'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-08-25'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-08-26'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-08-27'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
UNION ALL
SELECT m.id, '2026-08-28'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'HOUSSOU Lenaic'
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
SELECT m.id, '2026-05-29'::date, 0.0, 'conge_previsionnel' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-07-31'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-08-03'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-08-04'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-08-05'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-08-06'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-08-07'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-08-17'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-08-18'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-08-19'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-08-20'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-08-21'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-08-24'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-08-25'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-08-26'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-08-27'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-08-28'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'CASELLI Anne'
UNION ALL
SELECT m.id, '2026-08-03'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'KERARMA Cerine'
UNION ALL
SELECT m.id, '2026-08-04'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'KERARMA Cerine'
UNION ALL
SELECT m.id, '2026-08-05'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'KERARMA Cerine'
UNION ALL
SELECT m.id, '2026-08-06'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'KERARMA Cerine'
UNION ALL
SELECT m.id, '2026-08-07'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'KERARMA Cerine'
UNION ALL
SELECT m.id, '2026-08-17'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'KERARMA Cerine'
UNION ALL
SELECT m.id, '2026-08-18'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'KERARMA Cerine'
UNION ALL
SELECT m.id, '2026-08-19'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'KERARMA Cerine'
UNION ALL
SELECT m.id, '2026-08-20'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'KERARMA Cerine'
UNION ALL
SELECT m.id, '2026-08-21'::date, 0.0, 'conge_valide' FROM public.membres m WHERE m.nom = 'KERARMA Cerine';
