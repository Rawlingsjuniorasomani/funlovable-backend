const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('./pool');

async function addGradesTables() {
    const client = await pool.connect();
    try {
        console.log('🔄 Creating grades and report_cards tables...');

        await client.query('BEGIN');

        
        await client.query(`
            CREATE TABLE IF NOT EXISTS grades (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
                teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
                term VARCHAR(20) NOT NULL,
                assessment_type VARCHAR(50) NOT NULL,
                assessment_id UUID,
                score DECIMAL(5,2) NOT NULL,
                max_score DECIMAL(5,2) NOT NULL,
                grade VARCHAR(5),
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        
        await client.query(`
            CREATE TABLE IF NOT EXISTS report_cards (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                term VARCHAR(20) NOT NULL,
                academic_year VARCHAR(20) NOT NULL,
                overall_grade VARCHAR(5),
                overall_percentage DECIMAL(5,2),
                teacher_remarks TEXT,
                published BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, term, academic_year)
            );
        `);

        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
            CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(subject_id);
            CREATE INDEX IF NOT EXISTS idx_grades_term ON grades(term);
            CREATE INDEX IF NOT EXISTS idx_report_cards_student ON report_cards(student_id);
            CREATE INDEX IF NOT EXISTS idx_report_cards_term ON report_cards(term);
        `);

        await client.query('COMMIT');
        console.log('✅ Grades and report_cards tables created successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating grades tables:', error);
        throw error;
    } finally {
        client.release();
        process.exit();
    }
}

addGradesTables();
