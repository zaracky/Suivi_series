"""
Petit client TMDB utilisant uniquement urllib (bibliothèque standard Python),
donc aucune installation ("pip install requests" etc.) n'est nécessaire.
"""
import json
import os
import urllib.request
import urllib.error

BASE_URL = "https://api.themoviedb.org/3"


def _api_key():
    key = os.environ.get("TMDB_API_KEY")
    if not key:
        raise RuntimeError("TMDB_API_KEY manquante : vérifie ton fichier .env")
    return key


def _tmdb_fetch(pathname):
    separator = "&" if "?" in pathname else "?"
    url = f"{BASE_URL}{pathname}{separator}api_key={_api_key()}&language=fr-FR"
    try:
        with urllib.request.urlopen(url, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))
            return True, response.status, data
    except urllib.error.HTTPError as e:
        return False, e.code, None
    except urllib.error.URLError as e:
        return False, None, str(e.reason)


def get_series_details(tmdb_id):
    """Détails d'une série : nom réel, statut, liste des saisons."""
    ok, status, data = _tmdb_fetch(f"/tv/{tmdb_id}")
    if not ok:
        return {"ok": False, "status": status}
    seasons = [s for s in data.get("seasons", []) if s.get("season_number", 0) > 0]
    return {
        "ok": True,
        "tmdb_id": data.get("id"),
        "name": data.get("name"),
        "status": data.get("status"),
        "seasons": seasons,
    }


def get_season_episodes(tmdb_id, season_number):
    """Liste des épisodes d'une saison précise, avec leurs dates de sortie."""
    ok, status, data = _tmdb_fetch(f"/tv/{tmdb_id}/season/{season_number}")
    if not ok:
        return []
    episodes = []
    for ep in data.get("episodes", []):
        episodes.append({
            "season_number": ep.get("season_number"),
            "episode_number": ep.get("episode_number"),
            "name": ep.get("name"),
            "air_date": ep.get("air_date"),
        })
    return episodes
