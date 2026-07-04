# Guide — suivi de séries perso

Dashboard perso pour suivre ses séries (progression épisode par épisode) et
recevoir une notification Discord la veille de la sortie d'un nouvel épisode.

## Fonctionnalités

- Recherche et ajout de séries via TMDB
- Vue "À suivre" : chaque série affiche le prochain épisode non vu
- Détail d'une série : cocher les épisodes vus, saison par saison
- Vue "Calendrier" : toutes les prochaines dates de sortie connues
- Rafraîchissement automatique des dates (lundi + jeudi à 6h)
- Rappel Discord automatique 24h avant la sortie d'un épisode (chaque jour à 9h)

## Variables d'environnement nécessaires

Voir `.env.example`. Trois valeurs à fournir :
- `DATABASE_URL` — fournie automatiquement par Railway
- `TMDB_API_KEY` — ta clé API TMDB
- `DISCORD_WEBHOOK_URL` — l'URL du webhook du salon Discord dédié

## Déploiement sur Railway

1. Pousse ce projet sur un repository GitHub (voir plus bas si tu ne l'as pas encore fait).
2. Dans ton projet Railway (celui où tu as déjà créé la base PostgreSQL) :
   clique sur **"New" → "GitHub Repo"** et sélectionne ce repository.
3. Railway détecte automatiquement qu'il s'agit d'un projet Node.js et lance `npm install` puis `npm start`.
4. Va dans l'onglet **Variables** du nouveau service (pas celui de la base) et ajoute :
   - `TMDB_API_KEY`
   - `DISCORD_WEBHOOK_URL`
   - `DATABASE_URL` : si Railway ne la relie pas automatiquement, tu peux la copier depuis l'onglet "Variables" du service PostgreSQL, ou utiliser une référence `${{Postgres.DATABASE_URL}}` proposée par Railway.
5. Railway redéploie automatiquement après l'ajout des variables. Le schéma de base de données se crée tout seul au démarrage.
6. Une fois déployé, Railway te donne une URL publique (`xxx.up.railway.app`) — c'est ton dashboard.

## Pousser le projet sur GitHub (si pas encore fait)

Depuis le dossier du projet :
```
git add .
git commit -m "Premier commit"
git branch -M main
git remote add origin https://github.com/TON-COMPTE/series-tracker.git
git push -u origin main
```
(Remplace l'URL par celle de ton repository, créé au préalable sur github.com.)

## Tester manuellement les tâches automatiques

Une fois déployé, tu peux déclencher les tâches sans attendre le cron :
- `POST /api/admin/refresh-dates` — rafraîchit les dates depuis TMDB
- `POST /api/admin/send-reminders` — envoie les rappels Discord du jour
