const cron = require('node-cron');
const { pool } = require('./db');
const tmdb = require('./tmdb');
const { sendDiscordMessage } = require('./discord');

// --- Tâche 1 : rafraîchir les dates de sortie depuis TMDB ---
// Se déclenche le lundi et le jeudi à 6h du matin (heure du serveur).
// Ne rafraîchit que les séries encore en cours ("Returning Series"), pour ne pas
// spammer l'API pour des séries terminées.
async function refreshUpcomingDates() {
  console.log('[cron] Rafraîchissement des dates de sortie...');
  try {
    const { rows: seriesList } = await pool.query(
      `SELECT id, tmdb_id FROM series WHERE status IS NULL OR status = 'Returning Series'`
    );

    for (const s of seriesList) {
      try {
        const details = await tmdb.getSeriesDetails(s.tmdb_id);
        await pool.query('UPDATE series SET status = $1 WHERE id = $2', [details.status, s.id]);

        const episodes = await tmdb.getAllEpisodes(s.tmdb_id, details.seasons);
        for (const ep of episodes) {
          await pool.query(
            `INSERT INTO episodes (series_id, season_number, episode_number, name, air_date)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (series_id, season_number, episode_number)
             DO UPDATE SET air_date = EXCLUDED.air_date, name = EXCLUDED.name`,
            [s.id, ep.season_number, ep.episode_number, ep.name, ep.air_date]
          );
        }
      } catch (err) {
        console.error(`[cron] Erreur rafraîchissement série ${s.tmdb_id} :`, err.message);
      }
    }
    console.log('[cron] Rafraîchissement terminé.');
  } catch (err) {
    console.error('[cron] Erreur générale rafraîchissement :', err);
  }
}

// --- Tâche 2 : rappel 24h avant une sortie ---
// Se déclenche chaque jour à 9h. Regarde les épisodes dont la date de sortie
// est demain, et pour lesquels le rappel n'a pas déjà été envoyé.
async function sendTomorrowReminders() {
  console.log('[cron] Vérification des sorties de demain...');
  try {
    const { rows } = await pool.query(
      `SELECT e.id, e.season_number, e.episode_number, e.name AS episode_name, s.name AS series_name
       FROM episodes e
       JOIN series s ON s.id = e.series_id
       WHERE e.air_date = (CURRENT_DATE + INTERVAL '1 day')
         AND e.reminder_sent = false`
    );

    for (const ep of rows) {
      const message = `📺 **Demain** : *${ep.series_name}* — S${String(ep.season_number).padStart(2, '0')}E${String(ep.episode_number).padStart(2, '0')}${ep.episode_name ? ` — ${ep.episode_name}` : ''}`;
      await sendDiscordMessage(message);
      await pool.query('UPDATE episodes SET reminder_sent = true WHERE id = $1', [ep.id]);
    }
    console.log(`[cron] ${rows.length} rappel(s) envoyé(s).`);
  } catch (err) {
    console.error('[cron] Erreur envoi rappels :', err);
  }
}

function startCronJobs() {
  // Lundi et jeudi à 6h
  cron.schedule('0 6 * * 1,4', refreshUpcomingDates);
  // Chaque jour à 9h
  cron.schedule('0 9 * * *', sendTomorrowReminders);
  console.log('[cron] Tâches planifiées démarrées.');
}

module.exports = { startCronJobs, refreshUpcomingDates, sendTomorrowReminders };
