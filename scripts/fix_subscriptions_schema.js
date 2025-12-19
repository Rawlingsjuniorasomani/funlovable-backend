require('dotenv').config();
const pool = require('../src/db/pool');

async function fixSubscriptionsSchema() {
    try {
        console.log('Fixing subscriptions table schema...');

        // Drop and recreate with correct types
        await pool.query('DROP TABLE IF EXISTS subscriptions CASCADE');

        await pool.query(`
      CREATE TABLE subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan UUID NOT NULL REFERENCES plans(id),
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        starts_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE,
        payment_reference VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

        console.log('✅ Subscriptions table fixed successfully');
    } catch (err) {
        console.error('Error fixing subscriptions table:', err);
    } finally {
        pool.end();
    }
}

fixSubscriptionsSchema();
