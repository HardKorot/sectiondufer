IWA JUSTICE CLEAN V3

NOUVEAUTÉS
- Bouton Afficher / Masquer le mot de passe sur la connexion.
- Boutons Afficher / Masquer lors de la création d'un compte.
- Gestion complète des utilisateurs.
- Cette gestion est visible et autorisée UNIQUEMENT pour :
  sachotromain@gmail.com
- Liste des comptes.
- Création d'un compte.
- Changement du mot de passe d'un utilisateur.
- Suppression d'un utilisateur.
- Protection contre la suppression/modification du super administrateur.

IMPORTANT
Les mots de passe existants NE PEUVENT PAS être affichés.
Supabase stocke les mots de passe de manière sécurisée, pas en clair.
Le super administrateur peut uniquement les RÉINITIALISER.

INSTALLATION
1. Remplace les fichiers du site sur GitHub avec ceux du ZIP.
2. Dans Supabase > Edge Functions, crée ou remplace une fonction nommée :
   manage-iwa-users
3. Colle dedans tout le contenu de :
   EDGE-FUNCTION-manage-iwa-users.ts
4. Déploie la fonction.
5. Recharge GitHub Pages avec Ctrl + F5.

Tu gardes ta BDD actuelle.
Tu n'as pas besoin de recréer les tables.
