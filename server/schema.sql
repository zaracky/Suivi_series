-- Schéma de la base de données : suivi de séries

CREATE TABLE IF NOT EXISTS series (
  id SERIAL PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  poster_path TEXT,
  status TEXT,               -- ex: "Returning Series", "Ended", "Canceled" (renvoyé par TMDB)
  added_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS episodes (
  id SERIAL PRIMARY KEY,
  series_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  name TEXT,
  air_date DATE,              -- NULL si pas encore annoncée
  watched BOOLEAN NOT NULL DEFAULT false,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,  -- pour éviter les doublons de notif "24h avant"
  UNIQUE (series_id, season_number, episode_number)
);

CREATE INDEX IF NOT EXISTS idx_episodes_series ON episodes(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_air_date ON episodes(air_date);
