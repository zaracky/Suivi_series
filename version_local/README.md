# Alerte hebdomadaire de séries (Python, sans installation)

Deux scripts Python qui n'utilisent que la bibliothèque standard — aucun
`pip install` n'est nécessaire.

## Mise en place (une seule fois)

1. Renomme `.env.example` en `.env` (fichier caché sur Mac : `Cmd+Maj+.` dans
   le Finder pour le voir, ou édite-le directement en ligne de commande — voir plus bas).
2. Ouvre `.env` et complète les deux lignes avec ta clé TMDB et ton URL de webhook Discord :
   ```
   TMDB_API_KEY=ta_clé_ici
   DISCORD_WEBHOOK_URL=ton_url_ici
   ```
3. Édite `series.json` pour ajouter/retirer des séries (nom + tmdb_id, voir le fichier fourni en exemple).

## Commandes de test

Ouvre un Terminal, place-toi dans le dossier décompressé (remplace le chemin
par le tien, généralement dans ton dossier Téléchargements) :
```bash
cd ~/Downloads/series-weekly-alert-python
```

Si le fichier `.env` n'existe pas encore (juste `.env.example`), renomme-le en ligne de commande :
```bash
mv .env.example .env
```
Puis édite-le directement depuis le terminal :
```bash
nano .env
```
(Colle tes valeurs après les `=`, puis `Ctrl+O` pour enregistrer, `Entrée` pour confirmer, `Ctrl+X` pour quitter.)

**1. Vérifier que les IDs de `series.json` sont corrects :**
```bash
python3 check_ids.py
```
Regarde le résultat affiché, et/ou ouvre le fichier `check-ids.log` généré à côté.

**2. Générer et envoyer le digest de la semaine sur Discord :**
```bash
python3 weekly_digest.py
```
Le message qui va être envoyé s'affiche d'abord dans le terminal, puis est
envoyé sur Discord juste après.

## Ajouter une série plus tard

1. Va sur https://www.themoviedb.org, cherche la série.
2. Dans l'URL de sa fiche (ex: `themoviedb.org/tv/108978-reacher`), récupère le
   nombre après `/tv/` — ici `108978`.
3. Ajoute une entrée dans `series.json` :
   ```json
   { "nom": "Nom de la série", "tmdb_id": 123456 }
   ```
4. Relance `python3 check_ids.py` pour confirmer que tout est correct.
