const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('./pool');

async function addBehaviourAndProgressTables() {
    const client = await pool.connect();
    try {
        console.log('🔄 Creating behaviour_records, lesson_views, and learning_analytics tables...');

        await client.query('BEGIN');

        
        await client.query(`
            CREATE TABLE IF NOT EXISTS behaviour_records (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(20) CHECK (type IN ('positive', 'negative', 'neutral')) NOT NULL,
                category VARCHAR(50) NOT NULL,
                description TEXT NOT NULL,
                severity VARCHAR(20) CHECK (severity IN ('minor', 'moderate', 'serious')),
                action_taken TEXT,
                date DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        
        await client.query(`
            CREATE TABLE IF NOT EXISTS lesson_views (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                duration_seconds INT DEFAULT 0,
                completed BOOLEAN DEFAULT false
            );
        `);

        
        await client.query(`
            CREATE TABLE IF NOT EXISTS learning_analytics (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
                week_start DATE NOT NULL,
                lessons_viewed INT DEFAULT 0,
                assignments_submitted INT DEFAULT 0,
                quizzes_taken INT DEFAULT 0,
                avg_quiz_score DECIMAL(5,2),
                total_time_minutes INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, subject_id, week_start)
            );
        `);

        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_behaviour_student ON behaviour_records(student_id);
            CREATE INDEX IF NOT EXISTS idx_behaviour_date ON behaviour_records(date);
            CREATE INDEX IF NOT EXISTS idx_lesson_views_lesson ON lesson_views(lesson_id);
            CREATE INDEX IF NOT EXISTS idx_lesson_views_student ON lesson_views(student_id);
            CREATE INDEX IF NOT EXISTS idx_analytics_student ON learning_analytics(student_id);
            CREATE INDEX IF NOT EXISTS idx_analytics_week ON learning_analytics(week_start);
        `);

        await client.query('COMMIT');
        console.log('✅ Behaviour and progress tracking tables created successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating behaviour/progress tables:', error);
        throw error;
    } finally {
        client.release();
        process.exit();
    }
}

addBehaviourAndProgressTables();
