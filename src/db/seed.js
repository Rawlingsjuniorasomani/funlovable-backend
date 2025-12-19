const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('./pool');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminEmail = 'admin@edulearn.com';

    const adminResult = await pool.query(`
      INSERT INTO users (id, name, email, password_hash, role, is_approved, is_onboarded)
      VALUES ($1, $2, $3, $4, $5, true, true)
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING id
    `, [uuidv4(), 'Admin User', adminEmail, adminPassword, 'admin']);

    const adminId = adminResult.rows[0].id;

    // Add admin role
    await pool.query(`
      INSERT INTO user_roles (user_id, role)
      VALUES ($1, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING
    `, [adminId]);

    // Create sample teacher
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    const teacherEmail = 'teacher@edulearn.com';

    const teacherResult = await pool.query(`
      INSERT INTO users (id, name, email, password_hash, role, is_approved, is_onboarded)
      VALUES ($1, $2, $3, $4, $5, true, true)
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING id
    `, [uuidv4(), 'John Teacher', teacherEmail, teacherPassword, 'teacher']);

    const teacherId = teacherResult.rows[0].id;

    // Create sample subjects
    const subjects = [
      { name: 'Mathematics', description: 'Learn algebra, geometry, and more', icon: 'Calculator', color: 'blue', grade: 'JHS 1' },
      { name: 'English Language', description: 'Master grammar and composition', icon: 'BookOpen', color: 'green', grade: 'JHS 1' },
      { name: 'Science', description: 'Explore physics, chemistry, and biology', icon: 'Beaker', color: 'purple', grade: 'JHS 1' },
      { name: 'Social Studies', description: 'Learn about history and geography', icon: 'Globe', color: 'orange', grade: 'JHS 1' }
    ];

    for (const subject of subjects) {
      const existingSubject = await pool.query(
        'SELECT id FROM subjects WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [subject.name]
      );

      // If the subject already exists, do not create another copy or reseed its content.
      if (existingSubject.rows.length > 0) {
        continue;
      }

      const subjectId = uuidv4();
      await pool.query(
        `INSERT INTO subjects (id, name, description, icon, color, grade_level, teacher_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [subjectId, subject.name, subject.description, subject.icon, subject.color, subject.grade, teacherId]
      );

      // Create sample module for each subject
      const moduleId = uuidv4();
      await pool.query(`
        INSERT INTO modules (id, subject_id, title, description, order_index)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [moduleId, subjectId, `Introduction to ${subject.name}`, `Start your ${subject.name} journey`, 1]);

      // Create sample lesson
      const lessonId = uuidv4();
      await pool.query(`
        INSERT INTO lessons (id, module_id, title, content, duration_minutes, xp_reward)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [lessonId, moduleId, `Welcome to ${subject.name}`, `This is your first lesson in ${subject.name}. Let's get started!`, 15, 20]);

      // Create sample quiz
      const quizId = uuidv4();
      await pool.query(`
        INSERT INTO quizzes (id, lesson_id, module_id, title, description, time_limit_minutes, passing_score, xp_reward)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
      `, [quizId, lessonId, moduleId, `${subject.name} Quiz 1`, 'Test your knowledge', 15, 70, 50]);

      // Add sample question
      await pool.query(`
        INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [quizId, `What is ${subject.name} about?`, 'multiple_choice',
        JSON.stringify(['Learning new things', 'Playing games', 'Watching TV', 'Sleeping']),
        'Learning new things', 10]);
    }

    // Create sample achievements
    const achievements = [
      { name: 'First Steps', description: 'Complete your first lesson', icon: '🎯', xp: 50 },
      { name: 'Quiz Master', description: 'Score 100% on any quiz', icon: '🏆', xp: 100 },
      { name: 'Dedicated Learner', description: 'Complete 10 lessons', icon: '📚', xp: 200 },
      { name: 'Perfect Week', description: 'Study every day for a week', icon: '⭐', xp: 300 }
    ];

    for (const achievement of achievements) {
      await pool.query(`
        INSERT INTO achievements (name, description, icon, xp_reward)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [achievement.name, achievement.description, achievement.icon, achievement.xp]);
    }

    console.log('✅ Database seeded successfully!');
    console.log('📧 Admin login: admin@edulearn.com / admin123');
    console.log('📧 Teacher login: teacher@edulearn.com / teacher123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
