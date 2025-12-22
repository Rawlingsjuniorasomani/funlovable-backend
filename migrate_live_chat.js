require('dotenv').config();
const pool = require('./src/db/pool');

async function migrate() {
    try {
        console.log('🚀 Starting Live Chat Migration...');

        // 1. Create live_class_messages table
        console.log('Creating live_class_messages table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS live_class_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        live_class_id UUID NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sender_name VARCHAR(255) NOT NULL,
        sender_role VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'chat', -- 'chat', 'question', 'announcement'
        is_pinned BOOLEAN DEFAULT FALSE,
        is_hidden BOOLEAN DEFAULT FALSE, -- for soft delete
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // 2. Add columns to live_classes
        console.log('Updating live_classes table...');

        // Check if columns exist first to avoid errors
        const checkCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'live_classes' 
      AND column_name IN ('chat_enabled', 'questions_only_mode');
    `);

        const existingCols = checkCols.rows.map(r => r.column_name);

        if (!existingCols.includes('chat_enabled')) {
            await pool.query(`ALTER TABLE live_classes ADD COLUMN chat_enabled BOOLEAN DEFAULT TRUE;`);
            console.log('Added chat_enabled column.');
        }

        if (!existingCols.includes('questions_only_mode')) {
            await pool.query(`ALTER TABLE live_classes ADD COLUMN questions_only_mode BOOLEAN DEFAULT FALSE;`);
            console.log('Added questions_only_mode column.');
        }

        console.log('✅ Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        pool.end();
    }
}

migrate();
