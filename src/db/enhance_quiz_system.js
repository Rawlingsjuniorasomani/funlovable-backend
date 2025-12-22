const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('./pool');

async function enhanceQuizTables() {
    const client = await pool.connect();
    try {
        console.log('🔄 Enhancing quiz tables...');

        await client.query('BEGIN');

        
        await client.query(`
            ALTER TABLE quizzes
            ADD COLUMN IF NOT EXISTS quiz_type VARCHAR(20) DEFAULT 'practice',
            ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 30,
            ADD COLUMN IF NOT EXISTS total_marks INT DEFAULT 100,
            ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS end_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS instructions TEXT,
            ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS allow_review BOOLEAN DEFAULT true,
            ADD COLUMN IF NOT EXISTS randomize_questions BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS max_attempts INT DEFAULT 1,
            ADD COLUMN IF NOT EXISTS class_name VARCHAR(100);
        `);

        
        await client.query(`
            ALTER TABLE quiz_questions
            ADD COLUMN IF NOT EXISTS question_type VARCHAR(20) DEFAULT 'mcq',
            ADD COLUMN IF NOT EXISTS marks INT DEFAULT 1,
            ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;
        `);

        
        await client.query(`
            ALTER TABLE quiz_attempts
            ADD COLUMN IF NOT EXISTS start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS end_time TIMESTAMP,
            ADD COLUMN IF NOT EXISTS time_taken_seconds INT,
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'in_progress',
            ADD COLUMN IF NOT EXISTS auto_graded_score INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS manual_graded_score INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS teacher_feedback TEXT,
            ADD COLUMN IF NOT EXISTS is_released BOOLEAN DEFAULT false;
        `);

        
        await client.query(`
            CREATE TABLE IF NOT EXISTS quiz_answers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE,
                question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
                answer TEXT NOT NULL,
                is_correct BOOLEAN DEFAULT false,
                marks_awarded INT DEFAULT 0,
                teacher_feedback TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt ON quiz_answers(attempt_id);
            CREATE INDEX IF NOT EXISTS idx_quiz_answers_question ON quiz_answers(question_id);
            CREATE INDEX IF NOT EXISTS idx_quizzes_published ON quizzes(published);
            CREATE INDEX IF NOT EXISTS idx_quizzes_dates ON quizzes(start_date, end_date);
            CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON quiz_attempts(status);
        `);

        await client.query('COMMIT');
        console.log('✅ Quiz tables enhanced successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error enhancing quiz tables:', error);
        throw error;
    } finally {
        client.release();
        process.exit();
    }
}

enhanceQuizTables();
