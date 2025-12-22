const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('./pool');

async function addMessagingTables() {
    const client = await pool.connect();
    try {
        console.log('🔄 Creating messages and announcements tables...');

        await client.query('BEGIN');

        
        await client.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
                recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT false,
                parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        
        await client.query(`
            CREATE TABLE IF NOT EXISTS class_announcements (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
                subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
                class_name VARCHAR(100),
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                priority VARCHAR(20) CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
            CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);
            CREATE INDEX IF NOT EXISTS idx_announcements_teacher ON class_announcements(teacher_id);
            CREATE INDEX IF NOT EXISTS idx_announcements_subject ON class_announcements(subject_id);
        `);

        await client.query('COMMIT');
        console.log('✅ Messaging tables created successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating messaging tables:', error);
        throw error;
    } finally {
        client.release();
        process.exit();
    }
}

addMessagingTables();
