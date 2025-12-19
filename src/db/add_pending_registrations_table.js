const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const pool = require('./pool');

const runMigration = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pending_registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reference VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        plan_id UUID REFERENCES plans(id),
        amount NUMERIC NOT NULL,
        currency VARCHAR(10) DEFAULT 'GHS',
        status VARCHAR(50) DEFAULT 'pending',
        paystack_access_code VARCHAR(255),
        payload JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_pending_registrations_reference ON pending_registrations(reference);
      CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email);
    `);

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
