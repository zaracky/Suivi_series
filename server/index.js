require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const { pool } = require('./db');
const seriesRouter = require('./routes/series');
const calendarRouter = require('./routes/calendar');
const { startCronJobs, refreshUpcomingDates, sendTomorrowReminders } = require('./cron');

const app = express();
app.use(express.json());

app.use('/api/series', seriesRouter);
app.use('/api/calendar', calendarRouter);

// Endpoints manuels pour tester/déclencher les tâches sans attendre le cron
app.post('/api/admin/refresh-dates', async (req, res) => {
  await refreshUpcomingDates();
  res.json({ ok: true });
});
app.post('/api/admin/send-reminders', async (req, res) => {
  await sendTomorrowReminders();
  res.json({ ok: true });
});

// Sert le dashboard statique
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;

async function start() {
  // Applique le schéma automatiquement au démarrage (idempotent : ne casse rien si déjà en place)
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Base de données prête.');

  startCronJobs();

  app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Erreur au démarrage :', err);
  process.exit(1);
});
