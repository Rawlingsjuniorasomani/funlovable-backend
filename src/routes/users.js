const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { authMiddleware, requireRole, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();





router.get('/', authMiddleware, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { role, status } = req.query;

    let query = `
      SELECT u.id, u.name, u.email, u.role, u.phone, u.avatar, u.is_approved, u.is_onboarded, u.created_at,
             u.student_class, u.school, u.age,
             MAX(t.bio) as teacher_bio,
             MAX(t.qualifications) as teacher_qualifications,
             MAX(t.years_of_experience) as teacher_years_of_experience,
             MAX(t.address) as teacher_address,
             MAX(COALESCE(ux.total_xp, 0)) as total_xp, MAX(COALESCE(ux.level, 1)) as level,
             (SELECT COUNT(*) FROM parent_children pc WHERE pc.parent_id = u.id)::int as children_count,
             COALESCE(
               JSONB_AGG(
                 DISTINCT JSONB_BUILD_OBJECT(
                   'id', cu.id,
                   'name', cu.name,
                   'email', cu.email,
                   'avatar', cu.avatar,
                   'student_class', cu.student_class,
                   'school', cu.school,
                   'age', cu.age
                 )
               ) FILTER (WHERE cu.id IS NOT NULL),
               '[]'::jsonb
             ) as children,
             (
               SELECT s.status
               FROM subscriptions s 
               WHERE s.user_id = u.id
               ORDER BY s.created_at DESC 
               LIMIT 1
             ) as subscription_status,
             (
               SELECT s.expires_at
               FROM subscriptions s 
               WHERE s.user_id = u.id
               ORDER BY s.created_at DESC 
               LIMIT 1
             ) as subscription_end_date,
             (
               SELECT s.plan
               FROM subscriptions s 
               WHERE s.user_id = u.id
               ORDER BY s.created_at DESC 
               LIMIT 1
             ) as plan_name,
             (
               SELECT p.plan_name
               FROM subscriptions s
               JOIN plans p ON p.id::text = s.plan::text
               WHERE s.user_id = u.id
               ORDER BY s.created_at DESC
               LIMIT 1
             ) as plan_display_name,
             (
               SELECT u2.name 
               FROM parent_children pc2 
               JOIN users u2 ON pc2.parent_id = u2.id 
               WHERE pc2.child_id = u.id
               LIMIT 1
             ) as parent_name,
             (
               SELECT STRING_AGG(DISTINCT s3.name, ', ')
               FROM teacher_subjects ts3
               JOIN subjects s3 ON ts3.subject_id = s3.id
               WHERE ts3.teacher_id = u.id
             ) as subjects_list,
             (
               SELECT STRING_AGG(DISTINCT s4.name, ', ')
               FROM student_subjects ss4
               JOIN subjects s4 ON ss4.subject_id = s4.id
               WHERE ss4.student_id = u.id
             ) as enrolled_subjects_list
      FROM users u
      LEFT JOIN teachers t ON t.user_id = u.id
      LEFT JOIN parent_children pcj ON pcj.parent_id = u.id
      LEFT JOIN users cu ON cu.id = pcj.child_id
      LEFT JOIN user_xp ux ON u.id = ux.user_id
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      params.push(role);
      query += ` AND u.role = $${params.length}`;
    }

    if (status === 'pending') {
      query += ' AND u.is_approved = false';
    } else if (status === 'approved') {
      query += ' AND u.is_approved = true';
    }

    query += ' GROUP BY u.id ORDER BY u.created_at DESC';

    const result = await pool.query(query, params);


    const users = result.rows.map(user => ({
      ...user,
      children: Array.isArray(user.children) ? user.children : Array(user.children_count).fill({}),
      subscription: {
        status: user.subscription_status || 'inactive',
        plan: user.plan_display_name || user.plan_name || 'None',
        endDate: user.subscription_end_date
      },
      createdAt: user.created_at,
    }));

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users', details: error.message });
  }
});


router.post('/generate-otp', authMiddleware, async (req, res) => {
  try {
    const OtpService = require('../services/OtpService');
    const { type = 'sensitive_action' } = req.body;


    const code = await OtpService.generateOTP(req.user.id, type);




    res.json({ message: 'OTP generated. Check your email (or server console in dev).' });
  } catch (error) {
    console.error('Generate OTP error:', error);
    res.status(500).json({ error: 'Failed to generate OTP' });
  }
});


router.get('/:id', authMiddleware, async (req, res) => {
  try {

    if (String(req.user.id) !== String(req.params.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(`
      SELECT id, name, email, role, phone, avatar, is_approved, is_onboarded, created_at
      FROM users WHERE id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});


router.put('/:id', authMiddleware, async (req, res) => {
  try {


    if (String(req.user.id) !== String(req.params.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { name, phone, avatar, email, student_class, grade, school, age, bio, department, subjects_taught, employee_id } = req.body;

    // If email is changing, check uniqueness
    if (email) {
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.params.id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already currently in use by another user' });
      }
    }

    const finalClass = student_class || grade;

    const result = await pool.query(`
      UPDATE users 
      SET name = COALESCE($1, name), 
          phone = COALESCE($2, phone), 
          avatar = COALESCE($3, avatar),
          email = COALESCE($4, email),
          student_class = COALESCE($5, student_class),
          school = COALESCE($6, school),
          age = COALESCE($7, age),
          bio = COALESCE($8, bio),
          department = COALESCE($9, department),
          subjects_taught = COALESCE($10, subjects_taught),
          employee_id = COALESCE($11, employee_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING id, name, email, role, phone, avatar, is_approved, is_onboarded, student_class, school, age, bio, department, subjects_taught, employee_id
    `, [name, phone, avatar, email, finalClass, school, age, bio, department, subjects_taught, employee_id, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});


router.put('/:id/subscription', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { plan, status, expiresAt } = req.body;
    const userId = req.params.id;


    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }



    const subCheck = await pool.query('SELECT id FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]);

    let result;
    if (subCheck.rows.length > 0) {

      const subId = subCheck.rows[0].id;
      result = await pool.query(`
         UPDATE subscriptions 
         SET plan = COALESCE($1, plan),
             status = COALESCE($2, status),
             expires_at = COALESCE($3, expires_at),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *
       `, [plan, status, expiresAt, subId]);
    } else {


      const amount = plan === 'family' ? 1300 : 300;
      result = await pool.query(`
         INSERT INTO subscriptions (user_id, plan, status, expires_at, amount, starts_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING *
       `, [userId, plan, status, expiresAt, amount]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});


router.post('/:id/approve', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE users SET is_approved = true WHERE id = $1
      RETURNING id, name, email, role, is_approved
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }


    await pool.query(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES ($1, 'Account Approved', 'Your account has been approved. Welcome to EduLearn!', 'success')
    `, [req.params.id]);

    res.json({ message: 'User approved', user: result.rows[0] });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});


router.post('/:id/reject', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE users SET is_approved = false WHERE id = $1
      RETURNING id, name, email, role
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User rejected', user: result.rows[0] });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ error: 'Failed to reject user' });
  }
});


router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.params.id;


    await client.query('UPDATE subjects SET teacher_id = NULL WHERE teacher_id = $1', [userId]);


    await client.query('DELETE FROM teacher_subjects WHERE teacher_id = $1', [userId]);


    await client.query('DELETE FROM assignments WHERE teacher_id = $1', [userId]);


    await client.query('DELETE FROM live_classes WHERE teacher_id = $1', [userId]);


    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  } finally {
    client.release();
  }
});


router.post('/:id/children', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'parent' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only parents can add children' });
    }


    if (req.user.role === 'parent' && String(req.user.id) !== String(req.params.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { name, grade, school, age, studentClass, phone } = req.body;



    const subResult = await pool.query(`
      SELECT plan FROM subscriptions 
      WHERE user_id = $1 AND (status = 'active' OR status = 'trial') 
      ORDER BY created_at DESC LIMIT 1
    `, [req.user.id]);


    const plan = subResult.rows[0]?.plan?.toLowerCase() || 'single';


    const countResult = await pool.query(`
      SELECT COUNT(*) FROM parent_children WHERE parent_id = $1
    `, [req.user.id]);
    const currentCount = parseInt(countResult.rows[0].count);




    const limit = (plan.includes('family') || plan === 'family') ? 4 : 1;

    if (currentCount >= limit) {
      return res.status(403).json({
        error: `Plan limit reached. Your '${plan}' plan allows max ${limit} child${limit > 1 ? 'ren' : ''}. Upgrade to 'Family' to add more.`
      });
    }


    let childId;


    if (phone) {
      const existingStudent = await pool.query(
        'SELECT * FROM users WHERE phone = $1 AND role = $2',
        [phone, 'student']
      );

      if (existingStudent.rows.length > 0) {
        childId = existingStudent.rows[0].id;


        const existingLink = await pool.query(
          'SELECT * FROM parent_children WHERE parent_id = $1 AND child_id = $2',
          [req.user.id, childId]
        );

        if (existingLink.rows.length > 0) {
          return res.status(400).json({ error: 'Student already linked to this parent' });
        }
      }
    }


    if (!childId) {

      const passwordHash = await bcrypt.hash('child123', 10);

      const childEmail = req.body.email || `child_${Date.now()}@edulearn.com`;


      if (req.body.email) {
        const emailCheck = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          [childEmail]
        );
        if (emailCheck.rows.length > 0) {
          return res.status(400).json({ error: 'Email already registered' });
        }
      }

      const childResult = await pool.query(`
          INSERT INTO users (name, email, password_hash, role, is_approved, is_onboarded, school, age, student_class, phone)
          VALUES ($1, $2, $3, 'student', true, false, $4, $5, $6, $7)
          RETURNING id, name, email, role
        `, [name, childEmail, passwordHash, school, age, studentClass || grade, phone]);

      childId = childResult.rows[0].id;
    }


    await pool.query(`
      INSERT INTO parent_children (parent_id, child_id)
      VALUES ($1, $2)
    `, [req.user.id, childId]);


    const { subjects } = req.body;
    if (subjects && Array.isArray(subjects) && subjects.length > 0) {
      for (const subjectId of subjects) {

        if (subjectId.length > 10) {
          await pool.query(`
            INSERT INTO student_subjects (student_id, subject_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            `, [childId, subjectId]);
        }
      }
    }


    await pool.query(`
      INSERT INTO user_xp (user_id, total_xp, level) 
      VALUES ($1, 0, 1)
      ON CONFLICT (user_id) DO NOTHING
    `, [childId]);


    const childDetails = await pool.query('SELECT id, name, email, role, school, age, student_class FROM users WHERE id = $1', [childId]);
    res.status(201).json(childDetails.rows[0]);
  } catch (error) {
    console.error('Add child error:', error);
    res.status(500).json({ error: 'Failed to add child' });
  }
});


router.get('/:id/children', authMiddleware, async (req, res) => {
  try {

    if (String(req.user.id) !== String(req.params.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.avatar, u.created_at,
             COALESCE(ux.total_xp, 0) as xp, COALESCE(ux.level, 1) as level
      FROM users u
      INNER JOIN parent_children pc ON u.id = pc.child_id
      LEFT JOIN user_xp ux ON u.id = ux.user_id
      WHERE pc.parent_id = $1
    `, [req.params.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({ error: 'Failed to get children' });
  }
});




router.get('/admins/list', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.avatar, u.created_at,
             EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = 'super_admin') as is_super_admin
      FROM users u
      WHERE u.role = 'admin'
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ error: 'Failed to get admins' });
  }
});


router.post('/admins/invite', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;


    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, phone, is_approved, is_onboarded)
      VALUES ($1, $2, $3, 'admin', $4, true, true)
      RETURNING id, name, email, role
    `, [name, email, passwordHash, phone]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Invite admin error:', error);
    res.status(500).json({ error: 'Failed to invite admin' });
  }
});


router.post('/:id/promote', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { otp_code } = req.body;
    const OtpService = require('../services/OtpService');


    const superAdminCheck = await pool.query("SELECT 1 FROM user_roles WHERE role = 'super_admin' LIMIT 1");
    const isBootstrap = superAdminCheck.rows.length === 0;

    if (!isBootstrap) {
      if (!otp_code) {
        return res.status(400).json({ error: 'OTP required for this action', requires_otp: true });
      }

      const isValid = await OtpService.verifyOTP(req.user.id, otp_code, 'sensitive_action');
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }
    }

    await pool.query(`
      INSERT INTO user_roles (user_id, role)
      VALUES ($1, 'super_admin')
      ON CONFLICT DO NOTHING
    `, [req.params.id]);


    await pool.query(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES ($1, 'Role Updated', 'You have been promoted to Super Admin.', 'system')
    `, [req.params.id]);

    res.json({ message: 'User promoted to Super Admin' });
  } catch (error) {
    console.error('Promote error:', error);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});


router.post('/:id/demote', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    await pool.query(`
      DELETE FROM user_roles WHERE user_id = $1 AND role = 'super_admin'
    `, [req.params.id]);

    res.json({ message: 'User demoted from Super Admin' });
  } catch (error) {
    console.error('Demote error:', error);
    res.status(500).json({ error: 'Failed to demote user' });
  }
});

module.exports = router;
