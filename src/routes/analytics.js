const express = require('express');
const pool = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get admin analytics
router.get('/admin', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    // User counts by role
    const userCountsResult = await pool.query(`
      SELECT role, COUNT(*) as count FROM users GROUP BY role
    `);

    // New registrations this month
    const newUsersResult = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM users 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY date
    `);

    // Payment stats
    const paymentStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END) as total_revenue,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_payments
      FROM payments
    `);

    // Daily revenue (last 30 days)
    const dailyRevenueResult = await pool.query(`
      SELECT DATE(created_at) as date, SUM(amount) as revenue
      FROM payments
      WHERE status = 'success' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY date
    `);

    // Active subscriptions
    const subscriptionsResult = await pool.query(`
      SELECT plan, COUNT(*) as count 
      FROM subscriptions WHERE status = 'active'
      GROUP BY plan
    `);

    // Quiz attempts stats
    const quizStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_attempts,
        AVG(percentage) as average_score,
        COUNT(CASE WHEN passed THEN 1 END) as passed_count
      FROM quiz_attempts
    `);

    // Recent activity (Users and Payments mixed)
    const recentActivityResult = await pool.query(`
      SELECT 'user' as type, name as title, created_at as date, email as subtitle
      FROM users
      ORDER BY created_at DESC LIMIT 5
    `);

    const recentPaymentsResult = await pool.query(`
      SELECT 'payment' as type, amount::text as title, created_at as date, status as subtitle
      FROM payments
      ORDER BY created_at DESC LIMIT 5
    `);

    // Merge and sort
    const recentActivity = [...recentActivityResult.rows, ...recentPaymentsResult.rows]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    // System alerts
    const alerts = [];

    // Check for pending teachers
    const pendingTeachersResult = await pool.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'teacher' AND is_approved = false
    `);

    const pendingCount = parseInt(pendingTeachersResult.rows[0].count);
    if (pendingCount > 0) {
      alerts.push({
        type: 'warning',
        message: `${pendingCount} Teacher approval${pendingCount > 1 ? 's' : ''} pending`,
        date: new Date()
      });
    }

    // Check for recent failed payments
    const failedPaymentsResult = await pool.query(`
      SELECT COUNT(*) as count FROM payments 
      WHERE status = 'failed' AND created_at >= CURRENT_DATE - INTERVAL '24 hours'
    `);
    const failedCount = parseInt(failedPaymentsResult.rows[0].count);
    if (failedCount > 0) {
      alerts.push({
        type: 'error',
        message: `${failedCount} Payment failure${failedCount > 1 ? 's' : ''} in last 24h`,
        date: new Date()
      });
    }

    res.json({
      userCounts: userCountsResult.rows,
      newUsers: newUsersResult.rows,
      paymentStats: paymentStatsResult.rows[0],
      dailyRevenue: dailyRevenueResult.rows,
      subscriptions: subscriptionsResult.rows,
      quizStats: quizStatsResult.rows[0],
      pendingTeachers: pendingCount,
      recentActivity,
      systemAlerts: alerts
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get teacher analytics
router.get('/teacher', authMiddleware, requireRole('teacher'), async (req, res) => {
  try {
    const teacherId = req.user.id;

    // Subjects taught
    const subjectsResult = await pool.query(`
      SELECT COUNT(DISTINCT ts.subject_id) as count
      FROM teacher_subjects ts
      WHERE ts.teacher_id = $1
    `, [teacherId]);

    // Total students in classes
    const studentsResult = await pool.query(`
      SELECT COUNT(DISTINCT up.user_id) as count
      FROM user_progress up
      INNER JOIN lessons l ON up.lesson_id = l.id
      INNER JOIN modules m ON l.module_id = m.id
      INNER JOIN subjects s ON m.subject_id = s.id
      JOIN teacher_subjects ts ON ts.subject_id = s.id
      WHERE ts.teacher_id = $1
    `, [teacherId]);

    // Quiz performance in teacher's subjects
    const quizPerformanceResult = await pool.query(`
      SELECT 
        AVG(qa.percentage) as average_score,
        COUNT(*) as total_attempts
      FROM quiz_attempts qa
      INNER JOIN quizzes q ON qa.quiz_id = q.id
      INNER JOIN modules m ON q.module_id = m.id
      INNER JOIN subjects s ON m.subject_id = s.id
      JOIN teacher_subjects ts ON ts.subject_id = s.id
      WHERE ts.teacher_id = $1
    `, [teacherId]);

    res.json({
      subjectsCount: parseInt(subjectsResult.rows[0].count),
      studentsCount: parseInt(studentsResult.rows[0].count),
      quizPerformance: quizPerformanceResult.rows[0]
    });
  } catch (error) {
    console.error('Teacher analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get student analytics
router.get('/student', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Progress stats
    const progressResult = await pool.query(`
      SELECT 
        COUNT(*) as completed_lessons,
        SUM(time_spent_minutes) as total_time
      FROM user_progress 
      WHERE user_id = $1 AND is_completed = true
    `, [userId]);

    // Quiz stats
    const quizResult = await pool.query(`
      SELECT 
        COUNT(*) as total_attempts,
        AVG(percentage) as average_score,
        COUNT(CASE WHEN passed THEN 1 END) as quizzes_passed
      FROM quiz_attempts WHERE user_id = $1
    `, [userId]);

    // XP and level
    const xpResult = await pool.query(
      'SELECT total_xp, level FROM user_xp WHERE user_id = $1',
      [userId]
    );

    // Achievements
    const achievementsResult = await pool.query(`
      SELECT COUNT(*) as count FROM user_achievements WHERE user_id = $1
    `, [userId]);

    // Recent activity
    const recentActivityResult = await pool.query(`
      SELECT 'lesson' as type, l.title as name, up.completed_at as date
      FROM user_progress up
      INNER JOIN lessons l ON up.lesson_id = l.id
      WHERE up.user_id = $1 AND up.is_completed = true
      UNION ALL
      SELECT 'quiz' as type, q.title as name, qa.completed_at as date
      FROM quiz_attempts qa
      INNER JOIN quizzes q ON qa.quiz_id = q.id
      WHERE qa.user_id = $1
      ORDER BY date DESC LIMIT 10
    `, [userId]);

    // Last played lesson
    const lastPlayedResult = await pool.query(`
      SELECT 
        l.id as lesson_id,
        l.title,
        m.subject_id
      FROM user_progress up
      INNER JOIN lessons l ON up.lesson_id = l.id
      INNER JOIN modules m ON l.module_id = m.id
      WHERE up.user_id = $1
      ORDER BY up.updated_at DESC LIMIT 1
    `, [userId]);

    res.json({
      progress: progressResult.rows[0],
      quizStats: quizResult.rows[0],
      xp: xpResult.rows[0] || { total_xp: 0, level: 1 },
      achievementsCount: parseInt(achievementsResult.rows[0].count),
      recentActivity: recentActivityResult.rows,
      lastPlayedLesson: lastPlayedResult.rows[0]
    });
  } catch (error) {
    console.error('Student analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get parent analytics (for children)
router.get('/parent', authMiddleware, async (req, res) => {
  try {
    const parentId = req.user.id;

    // 1. Get children
    const childrenResult = await pool.query(`
      SELECT u.id, u.name, u.avatar, u.student_class as grade
      FROM users u
      INNER JOIN parent_children pc ON u.id = pc.child_id
      WHERE pc.parent_id = $1
    `, [parentId]);
    const children = childrenResult.rows;
    const childIds = children.map(c => c.id);

    if (childIds.length === 0) {
      return res.json({
        children: [],
        overview: {
          totalEnrolled: 0,
          avgScore: 0,
          weeklyLearningMinutes: 0,
          totalInvested: 0
        },
        weeklyActivity: [],
        monthlyPayments: [],
        subjectBreakdown: [],
        recentActivity: []
      });
    }

    // 2. Overview Stats
    // Total Invested
    const investmentResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE user_id = $1 AND status = 'success' OR status = 'completed'
    `, [parentId]);
    const totalInvested = parseFloat(investmentResult.rows[0].total);

    // 3. Children Detailed Stats
    const childrenAnalytics = await Promise.all(
      children.map(async (child) => {
        // Progress & Time
        const progressResult = await pool.query(`
          SELECT 
            COUNT(*) as completed_lessons,
            COALESCE(SUM(time_spent_minutes), 0) as total_time
          FROM user_progress 
          WHERE user_id = $1 AND is_completed = true
        `, [child.id]);

        // Course Progress (Completion rate)
        const totalLessons = 50; // hardcoded denominator for now
        const completed = parseInt(progressResult.rows[0].completed_lessons);
        const totalTime = parseInt(progressResult.rows[0].total_time);
        const progress = Math.min(Math.round((completed / totalLessons) * 100), 100);

        // Quiz Stats (Avg Score)
        const quizResult = await pool.query(`
          SELECT 
            COALESCE(AVG(score), 0) as average_score, 
            COUNT(*) as attempts
          FROM quiz_attempts WHERE user_id = $1
        `, [child.id]);

        const quizStats = {
          average_score: Math.round(parseFloat(quizResult.rows[0].average_score)),
          attempts: parseInt(quizResult.rows[0].attempts)
        };

        // XP
        const xpResult = await pool.query(
          'SELECT total_xp, level FROM user_xp WHERE user_id = $1',
          [child.id]
        );
        const xp = {
          total_xp: xpResult.rows[0]?.total_xp || 0,
          level: xpResult.rows[0]?.level || 1
        };

        // Streak Calculation (Consecutive days with activity in last 30 days)
        const activityDatesResult = await pool.query(`
          SELECT DISTINCT DATE(created_at) as date
          FROM (
            SELECT created_at FROM user_progress WHERE user_id = $1
            UNION ALL
            SELECT created_at FROM quiz_attempts WHERE user_id = $1
          ) activities
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
          ORDER BY date DESC
        `, [child.id]);

        const dates = activityDatesResult.rows.map(r => new Date(r.date).toDateString());
        let streak = 0;
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        // If active today or yesterday, start counting
        if (dates.length > 0 && (dates[0] === today || dates[0] === yesterday)) {
          streak = 1;
          let currentDate = new Date(dates[0]);
          for (let i = 1; i < dates.length; i++) {
            const prevDate = new Date(dates[i]);
            const diffTime = Math.abs(currentDate - prevDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              streak++;
              currentDate = prevDate;
            } else {
              break;
            }
          }
        }

        return {
          ...child,
          progress,
          quizStats,
          avgScore: quizStats.average_score, // Support ParentAnalytics which expects flat avgScore
          xp,
          totalXP: xp.total_xp, // Support ParentAnalytics which expects flat totalXP
          completedLessons: completed,
          totalTime,
          streak
        };
      })
    );

    // 4. Aggregates for Charts

    // Weekly Learning Time (Last 7 days)
    const weeklyActivityResult = await pool.query(`
      SELECT 
        to_char(d.day, 'Dy') as day,
        u.name as child_name,
        COALESCE(SUM(up.time_spent_minutes), 0) as minutes
      FROM (
        SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date as day
      ) d
      CROSS JOIN unnest($1::uuid[]) as child_id
      JOIN users u ON u.id = child_id
      LEFT JOIN user_progress up ON DATE(up.completed_at) = d.day AND up.user_id = child_id
      GROUP BY d.day, u.name
      ORDER BY d.day
    `, [childIds]);

    // Reshape for frontend: [{ day: 'Mon', kwame: 10, ama: 20 }, ...]
    const weeklyMap = {};
    weeklyActivityResult.rows.forEach(row => {
      if (!weeklyMap[row.day]) weeklyMap[row.day] = { day: row.day };
      // Sanitize name for key? Or just use name assuming unique for display
      const key = row.child_name.toLowerCase().split(' ')[0]; // simple key
      weeklyMap[row.day][key] = parseInt(row.minutes);
    });
    const weeklyActivity = Object.values(weeklyMap);

    // Monthly Payments (Last 6 months)
    const monthlyPaymentResult = await pool.query(`
      SELECT 
        to_char(d.month, 'Mon') as month_label,
        COALESCE(SUM(p.amount), 0) as amount
      FROM (
        SELECT generate_series(DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months', DATE_TRUNC('month', CURRENT_DATE), '1 month')::date as month
      ) d
      LEFT JOIN payments p ON DATE_TRUNC('month', p.created_at) = d.month AND p.user_id = $1 AND (p.status = 'success' OR p.status = 'completed')
      GROUP BY d.month
      ORDER BY d.month
    `, [parentId]);
    const monthlyPayments = monthlyPaymentResult.rows;

    // Subject Performance Breakdown
    // Average quiz score per subject per child
    const subjectStatsResult = await pool.query(`
      SELECT 
        s.name as subject,
        u.name as child_name,
        AVG(qa.score) as score
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN modules m ON q.module_id = m.id
      JOIN subjects s ON m.subject_id = s.id
      JOIN users u ON qa.user_id = u.id
      WHERE qa.user_id = ANY($1::uuid[])
      GROUP BY s.name, u.name
    `, [childIds]);

    const subjectMap = {};
    subjectStatsResult.rows.forEach(row => {
      if (!subjectMap[row.subject]) subjectMap[row.subject] = { subject: row.subject };
      const key = row.child_name.toLowerCase().split(' ')[0];
      subjectMap[row.subject][key] = Math.round(parseFloat(row.score));
    });
    const subjectBreakdown = Object.values(subjectMap);

    // Recent Activity (Already implemented effectively, reusing logic)
    const activityResult = await pool.query(`
      SELECT 'lesson' as type, l.title as name, up.completed_at as date, u.name as student_name
      FROM user_progress up
      INNER JOIN lessons l ON up.lesson_id = l.id
      INNER JOIN users u ON up.user_id = u.id
      WHERE up.user_id = ANY($1::uuid[]) AND up.is_completed = true
      UNION ALL
      SELECT 'quiz' as type, q.title as name, qa.completed_at as date, u.name as student_name
      FROM quiz_attempts qa
      INNER JOIN quizzes q ON qa.quiz_id = q.id
      INNER JOIN users u ON qa.user_id = u.id
      WHERE qa.user_id = ANY($1::uuid[])
      ORDER BY date DESC LIMIT 5
    `, [childIds]);

    // Calculate overall averages
    const totalWeeklyTime = weeklyActivityResult.rows.reduce((acc, curr) => acc + parseInt(curr.minutes), 0);
    const avgChildScore = childrenAnalytics.length > 0
      ? Math.round(childrenAnalytics.reduce((acc, c) => acc + c.quizStats.average_score, 0) / childrenAnalytics.length)
      : 0;

    res.json({
      children: childrenAnalytics,
      overview: {
        totalEnrolled: children.length,
        avgScore: avgChildScore,
        weeklyLearningMinutes: totalWeeklyTime,
        totalInvested
      },
      weeklyActivity,
      monthlyPayments,
      subjectBreakdown,
      recentActivity: activityResult.rows
    });

  } catch (error) {
    console.error('Parent analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

module.exports = router;
