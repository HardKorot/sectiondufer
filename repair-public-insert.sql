-- IWA - REPARATION DEPOT PUBLIC
-- Exécute ce script dans Supabase > SQL Editor.

alter table public.plaintes enable row level security;

-- On retire uniquement les policies d'insertion susceptibles d'entrer en conflit.
drop policy if exists "autoriser insertion publique" on public.plaintes;
drop policy if exists "public_insert_plainte" on public.plaintes;

-- Autorise les visiteurs non connectés à déposer une plainte.
create policy "public_insert_plainte"
on public.plaintes
for insert
to anon
with check (true);

-- Autorise aussi un utilisateur connecté à déposer une plainte.
create policy "authenticated_insert_plainte"
on public.plaintes
for insert
to authenticated
with check (true);

-- IMPORTANT :
-- On ne crée AUCUNE policy SELECT publique.
-- Les visiteurs peuvent envoyer mais pas consulter les plaintes.
