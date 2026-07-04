const express = require('express');
const { pool } = require('../db');
const tmdb = require('../tmdb');

const router = express.Router();

// GET /api/search?q=severance  -> recherche TMDB pour l'ajout d'une série
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  try {
    const results = await tmdb.searchSeries(q);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la recherche TMDB' });
  }
});

// GET /api/series -> liste des séries suivies + prochain épisode à voir
router.get('/', async (req, res) => {
  try {
    const { rows: seriesList } = await pool.query(
      'SELECT id, tmdb_id, name, poster_path, status FROM series ORDER BY added_at DESC'
    );

    const result = [];
    for (const s of seriesList) {
      const { rows: nextEp } = await pool.query(
        `SELECT id, season_number, episode_number, name, air_date
         FROM episodes
         WHERE series_id = $1 AND watched = false
         ORDER BY season_number ASC, episode_number ASC
         LIMIT 1`,
        [s.id]
      );
      const { rows: counts } = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE watched = true) AS watched_count,
           COUNT(*) AS total_count
         FROM episodes WHERE series_id = $1`,
        [s.id]
      );
      result.push({
        ...s,
        next_episode: nextEp[0] || null,
        watched_count: Number(counts[0].watched_count),
        total_count: Number(counts[0].total_count),
      });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des séries' });
  }
});

// POST /api/series  { tmdb_id }  -> ajoute une série suivie + importe tous ses épisodes
router.post('/', async (req, res) => {
  const { tmdb_id } = req.body;
  if (!tmdb_id) return res.status(400).json({ error: 'tmdb_id requis' });

  try {
    const existing = await pool.query('SELECT id FROM series WHERE tmdb_id = $1', [tmdb_id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Cette série est déjà suivie' });
    }

    const details = await tmdb.getSeriesDetails(tmdb_id);
    const { rows } = await pool.query(
      `INSERT INTO series (tmdb_id, name, poster_path, status) VALUES ($1, $2, $3, $4) RETURNING id`,
      [details.tmdb_id, details.name, details.poster_path, details.status]
    );
    const seriesId = rows[0].id;

    const episodes = await tmdb.getAllEpisodes(tmdb_id, details.seasons);
    for (const ep of episodes) {
      await pool.query(
        `INSERT INTO episodes (series_id, season_number, episode_number, name, air_date)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (series_id, season_number, episode_number) DO NOTHING`,
        [seriesId, ep.season_number, ep.episode_number, ep.name, ep.air_date]
      );
    }

    res.status(201).json({ id: seriesId, ...details });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'ajout de la série" });
  }
});

// GET /api/series/:id -> détail complet (saisons + épisodes + statut vu/pas vu)
router.get('/:id', async (req, res) => {
  try {
    const { rows: seriesRows } = await pool.query('SELECT * FROM series WHERE id = $1', [req.params.id]);
    if (seriesRows.length === 0) return res.status(404).json({ error: 'Série introuvable' });

    const { rows: episodes } = await pool.query(
      `SELECT id, season_number, episode_number, name, air_date, watched
       FROM episodes WHERE series_id = $1
       ORDER BY season_number ASC, episode_number ASC`,
      [req.params.id]
    );

    const seasonsMap = {};
    for (const ep of episodes) {
      if (!seasonsMap[ep.season_number]) seasonsMap[ep.season_number] = [];
      seasonsMap[ep.season_number].push(ep);
    }
    const seasons = Object.keys(seasonsMap)
      .sort((a, b) => Number(a) - Number(b))
      .map((num) => ({ season_number: Number(num), episodes: seasonsMap[num] }));

    res.json({ ...seriesRows[0], seasons });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération de la série' });
  }
});

// DELETE /api/series/:id -> retire une série suivie
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM series WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// POST /api/series/:id/episodes/:episodeId/toggle -> coche/décoche un épisode vu
router.post('/:id/episodes/:episodeId/toggle', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE episodes SET watched = NOT watched
       WHERE id = $1 AND series_id = $2
       RETURNING id, watched`,
      [req.params.episodeId, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Épisode introuvable' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

module.exports = router;
