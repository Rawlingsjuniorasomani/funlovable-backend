require('dotenv').config();
const pool = require('./pool');

const migrations = `
-- 1. Users table (Base table for all roles)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  phone VARCHAR(20),
  avatar VARCHAR(500),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
  is_approved BOOLEAN DEFAULT false, -- For teachers
  is_onboarded BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name VARCHAR(100) NOT NULL, -- e.g. 'Basic', 'Premium', 'Family'
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL, -- e.g. 30, 365
  description TEXT,
  features JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, -- The payer (Parent)
  plan_id UUID REFERENCES plans(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'GHS',
  status VARCHAR(50) DEFAULT 'pending', -- success, failed, pending
  reference VARCHAR(255) UNIQUE, -- Our reference
  paystack_reference VARCHAR(255), -- Provider reference
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Parents Profile
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_plan_id UUID REFERENCES plans(id),
  subscription_status VARCHAR(50) DEFAULT 'inactive', -- active, inactive, expired
  subscription_start TIMESTAMP,
  subscription_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Children table (Not Users, managed by Parent)
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, -- Link to Parent User
  name VARCHAR(255) NOT NULL,
  age INTEGER,
  grade VARCHAR(50),
  avatar VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Students Profile (Linked to a Child entity and a User account if applicable, 
--     but per spec "Students are created automatically when a parent adds a child".
--     Ideally Student IS a User if they log in. For now, assuming Student logs in via User table, linked to Child)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE, -- The login
  child_id UUID REFERENCES children(id) ON DELETE CASCADE UNIQUE, -- Link to parent's child record
  class_id UUID, -- Optional class assignment
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Teachers Profile
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  bio TEXT,
  qualifications TEXT,
  approved_by UUID REFERENCES users(id), -- Admin who approved
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  price DECIMAL(10,2) DEFAULT 0.00, -- If purchased individually
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Teacher Subjects (Many-to-Many)
CREATE TABLE IF NOT EXISTS teacher_subjects (
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, subject_id)
);

-- 10. Child/Student Subjects (Enrollment)
CREATE TABLE IF NOT EXISTS child_subjects (
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (child_id, subject_id)
);

-- 11. Modules
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  video_url VARCHAR(500),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id), -- Creator
  title VARCHAR(255) NOT NULL,
  instructions TEXT,
  due_date TIMESTAMP,
  max_score INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Student Assignment Submissions
CREATE TABLE IF NOT EXISTS student_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Student User
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  content TEXT,
  file_url VARCHAR(500),
  score INTEGER,
  feedback TEXT,
  status VARCHAR(50) DEFAULT 'submitted', -- submitted, graded, late
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  graded_at TIMESTAMP
);

-- 15. Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  time_limit_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB, -- Array of strings
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0
);

-- 17. Student Quiz Attempts
CREATE TABLE IF NOT EXISTS student_quiz_attempt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER,
  total_questions INTEGER,
  attempt_data JSONB, -- Store answers
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. Live Classes
CREATE TABLE IF NOT EXISTS live_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  schedule_time TIMESTAMP NOT NULL,
  meeting_link VARCHAR(500),
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, active, completed, cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. Rewards (Catalog)
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  points_required INTEGER DEFAULT 100,
  icon VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 20. Student Rewards (Earned)
CREATE TABLE IF NOT EXISTS student_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES rewards(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 21. Messages (Optional, for teacher-student comm)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

-- 22. Pending Registrations (used for payment-based registration flow)
CREATE TABLE IF NOT EXISTS pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  plan_id UUID REFERENCES plans(id),
  amount NUMERIC NOT NULL,
  currency VARCHAR(10) DEFAULT 'GHS',
  status VARCHAR(50) DEFAULT 'pending',
  paystack_access_code VARCHAR(255),
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_reference ON pending_registrations(reference);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email);
`;

async function migrate() {
  try {
    console.log('🔄 Running database migrations...');
    await pool.query(migrations);
    console.log('✅ Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
