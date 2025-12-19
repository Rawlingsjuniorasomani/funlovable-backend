const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const shouldUseSSL =
  process.env.PGSSLMODE === 'require' ||
  (process.env.NODE_ENV === 'production' &&
    typeof connectionString === 'string' &&
    !/localhost|127\.0\.0\.1/i.test(connectionString));

const pool = new Pool({
  connectionString,
  ...(shouldUseSSL ? { ssl: { rejectUnauthorized: false } } : {})
});

let hasLoggedConnection = false;
pool.on('connect', () => {
  if (hasLoggedConnection) return;
  hasLoggedConnection = true;
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
