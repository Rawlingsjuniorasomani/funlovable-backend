const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('./pool');

async function fixRuntimeSchema() {
  const client = await pool.connect();
  try {
    console.log('🔧 Applying runtime schema fixes...');
    await client.query('BEGIN');

    
    await client.query(`
      ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    
    await client.query(`
      ALTER TABLE quizzes
      ADD COLUMN IF NOT EXISTS subject_id UUID;
    `);

    
    await client.query(`
      UPDATE quizzes q
      SET subject_id = m.subject_id
      FROM modules m
      WHERE q.subject_id IS NULL
        AND q.module_id = m.id;
    `);

    
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'subjects'
        ) THEN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'quizzes_subject_id_fkey'
          ) THEN
            ALTER TABLE quizzes
            ADD CONSTRAINT quizzes_subject_id_fkey
            FOREIGN KEY (subject_id) REFERENCES subjects(id)
            ON DELETE SET NULL;
          END IF;
        END IF;
      END$$;
    `);

    
    await client.query(`
      ALTER TABLE quizzes
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    
    
    await client.query(`
      ALTER TABLE quiz_questions
      ADD COLUMN IF NOT EXISTS question_text TEXT;
    `);

    
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'quiz_questions'
            AND column_name = 'question'
        ) THEN
          UPDATE quiz_questions
          SET question_text = COALESCE(question_text, question)
          WHERE question_text IS NULL;
        END IF;
      END$$;
    `);

    await client.query('COMMIT');
    console.log('✅ Runtime schema fixes applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to apply runtime schema fixes:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    
    process.exit();
  }
}

fixRuntimeSchema();
