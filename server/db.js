const { Pool } = require('pg');

// Railway fournit automatiquement DATABASE_URL quand le service et la base
// sont dans le même projet.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

module.exports = { pool };
