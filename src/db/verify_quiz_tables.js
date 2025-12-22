const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('./pool');

async function verifyQuizTables() {
    const client = await pool.connect();
    try {
        console.log('🔍 Verifying quiz tables...\n');

        
        const quizzesColumns = await client.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'quizzes'
            ORDER BY ordinal_position;
        `);
        console.log('📋 QUIZZES TABLE COLUMNS:');
        quizzesColumns.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

        
        const questionsColumns = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'quiz_questions'
            ORDER BY ordinal_position;
        `);
        console.log('\n📋 QUIZ_QUESTIONS TABLE COLUMNS:');
        questionsColumns.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

        
        const attemptsColumns = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'quiz_attempts'
            ORDER BY ordinal_position;
        `);
        console.log('\n📋 QUIZ_ATTEMPTS TABLE COLUMNS:');
        attemptsColumns.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

        
        const answersTable = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'quiz_answers'
            ORDER BY ordinal_position;
        `);
        console.log('\n📋 QUIZ_ANSWERS TABLE COLUMNS:');
        if (answersTable.rows.length > 0) {
            answersTable.rows.forEach(col => {
                console.log(`  - ${col.column_name} (${col.data_type})`);
            });
        } else {
            console.log('  ❌ Table not found');
        }

        
        const indexes = await client.query(`
            SELECT indexname, tablename
            FROM pg_indexes
            WHERE tablename IN ('quizzes', 'quiz_questions', 'quiz_attempts', 'quiz_answers')
            ORDER BY tablename, indexname;
        `);
        console.log('\n📊 INDEXES:');
        indexes.rows.forEach(idx => {
            console.log(`  - ${idx.tablename}.${idx.indexname}`);
        });

        console.log('\n✅ Verification complete!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        process.exit();
    }
}

verifyQuizTables();
