-- Nombre de jours total travaillé client par personne, saisi manuellement
-- dans l'onglet "Jours de congés" ; sert à calculer les jours de congés
-- restant à prendre (jours travaillé client - jours réellement travaillés).
ALTER TABLE public.membres ADD COLUMN IF NOT EXISTS jours_travailles_client numeric(6,1);
