const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('./pool');

async function addAttendanceTable() {
    const client = await pool.connect();
    try {
        console.log('🔄 Creating attendance table...');

        await client.query('BEGIN');

        
        await client.query(`
            CREATE TABLE IF NOT EXISTS attendance (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                status VARCHAR(20) CHECK (status IN ('present', 'absent', 'late', 'excused')) NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, subject_id, date)
            );
        `);

        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
            CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
            CREATE INDEX IF NOT EXISTS idx_attendance_subject ON attendance(subject_id);
            CREATE INDEX IF NOT EXISTS idx_attendance_teacher ON attendance(teacher_id);
        `);

        await client.query('COMMIT');
        console.log('✅ Attendance table created successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating attendance table:', error);
        throw error;
    } finally {
        client.release();
        process.exit();
    }
}

addAttendanceTable();
