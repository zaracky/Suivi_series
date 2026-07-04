// Applique le schéma SQL à la base de données.
// Se lance une fois manuellement (npm run migrate), ou automatiquement au démarrage du serveur.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Migration terminée : tables prêtes.');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erreur pendant la migration :', err);
    process.exit(1);
  });
