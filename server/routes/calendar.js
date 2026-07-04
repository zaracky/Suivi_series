const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// GET /api/calendar -> prochaines dates de sortie connues, triées chronologiquement
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.id, e.season_number, e.episode_number, e.name AS episode_name,
              e.air_date, s.id AS series_id, s.name AS series_name, s.poster_path
       FROM episodes e
       JOIN series s ON s.id = e.series_id
       WHERE e.air_date IS NOT NULL AND e.air_date >= CURRENT_DATE
       ORDER BY e.air_date ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération du calendrier' });
  }
});

module.exports = router;
