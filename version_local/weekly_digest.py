"""
Regarde, pour chaque série suivie, les épisodes qui sortent la semaine suivante
(du lundi au dimanche qui suit le jour d'exécution), et envoie un résumé groupé sur Discord.
Se lance manuellement : python3 weekly_digest.py
"""
import json
import os
from datetime import date, timedelta

from env_loader import load_env
from tmdb import get_series_details, get_season_episodes
from discord import send_discord_message

SERIES_PATH = os.path.join(os.path.dirname(__file__), "series.json")

JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
        "août", "septembre", "octobre", "novembre", "décembre"]


def next_monday(from_date):
    """Lundi qui suit strictement la date donnée (si on est déjà lundi, saute à la semaine suivante)."""
    days_ahead = (7 - from_date.weekday()) % 7  # weekday(): lundi=0 ... dimanche=6
    if days_ahead == 0:
        days_ahead = 7
    return from_date + timedelta(days=days_ahead)


def format_long(d):
    return f"{d.day} {MOIS[d.month - 1]}"


def build_weekly_digest():
    with open(SERIES_PATH, "r", encoding="utf-8") as f:
        series_list = json.load(f)

    range_start = next_monday(date.today())
    range_end = range_start + timedelta(days=6)

    episodes_by_date = {}  # { date_iso: [ {series_name, season_number, episode_number}, ... ] }

    for s in series_list:
        tmdb_id = s.get("tmdb_id")
        if not tmdb_id:
            continue

        details = get_series_details(tmdb_id)
        if not details["ok"] or not details["seasons"]:
            continue

        # Hypothèse simplificatrice : on ne regarde que la saison la plus récente,
        # ce qui couvre l'immense majorité des cas pour une série en cours de diffusion.
        last_season = details["seasons"][-1]
        episodes = get_season_episodes(tmdb_id, last_season["season_number"])

        for ep in episodes:
            air_date = ep.get("air_date")
            if not air_date:
                continue
            ep_date = date.fromisoformat(air_date)
            if range_start <= ep_date <= range_end:
                episodes_by_date.setdefault(air_date, []).append({
                    "series_name": s["nom"],
                    "season_number": ep["season_number"],
                    "episode_number": ep["episode_number"],
                })

    header = f"📅 **Planning du {format_long(range_start)} au {format_long(range_end)}**"

    sorted_dates = sorted(episodes_by_date.keys())
    if not sorted_dates:
        return f"{header}\nRien de prévu cette semaine."

    blocks = [header]
    for date_iso in sorted_dates:
        d = date.fromisoformat(date_iso)
        jour_label = JOURS[d.weekday()].capitalize()
        blocks.append(f"\n**{jour_label} {format_long(d)}**")
        for ep in episodes_by_date[date_iso]:
            code = f"S{ep['season_number']:02d}E{ep['episode_number']:02d}"
            blocks.append(f"• {ep['series_name']} — {code}")

    return "\n".join(blocks)


def main():
    load_env()
    message = build_weekly_digest()
    print("--- Message qui va être envoyé ---")
    print(message)
    print("-----------------------------------")
    success = send_discord_message(message)
    if success:
        print("Message envoyé sur Discord.")
    else:
        print("⚠️  L'envoi a échoué — voir l'erreur ci-dessus.")


if __name__ == "__main__":
    main()
