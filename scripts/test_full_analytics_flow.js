require('dotenv').config();
const pool = require('../src/db/pool');

async function testFullAnalyticsFlow() {
    try {
        const parentRes = await pool.query("SELECT id FROM users WHERE role = 'parent' LIMIT 1");
        const parentId = parentRes.rows[0].id;
        console.log('Testing with parent ID:', parentId);

        // Step 1: Get children
        const childrenResult = await pool.query(`
      SELECT u.id, u.name, u.avatar, u.student_class as grade
      FROM users u
      INNER JOIN parent_children pc ON u.id = pc.child_id
      WHERE pc.parent_id = $1
    `, [parentId]);

        const children = childrenResult.rows;
        const childIds = children.map(c => c.id);
        console.log('Children:', children.length);

        if (childIds.length === 0) {
            console.log('No children - would return empty response');
            return;
        }

        // Step 2: Investment
        const investmentResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE user_id = $1 AND status = 'success' OR status = 'completed'
    `, [parentId]);
        const totalInvested = parseFloat(investmentResult.rows[0].total);
        console.log('Total invested:', totalInvested);

        // Step 3: Process each child
        console.log('\nProcessing children analytics...');
        const childrenAnalytics = await Promise.all(
            children.map(async (child) => {
                console.log(`  Processing child: ${child.name}`);

                // Progress
                const progressResult = await pool.query(`
          SELECT 
            COUNT(*) as completed_lessons,
            COALESCE(SUM(time_spent_minutes), 0) as total_time
          FROM user_progress 
          WHERE user_id = $1 AND is_completed = true
        `, [child.id]);

                const completed = parseInt(progressResult.rows[0].completed_lessons);
                const totalTime = parseInt(progressResult.rows[0].total_time);
                const totalLessons = 50;
                const progress = Math.min(Math.round((completed / totalLessons) * 100), 100);

                // Quiz stats
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

                console.log(`    Progress: ${progress}%, Quiz avg: ${quizStats.average_score}, XP: ${xp.total_xp}`);

                return {
                    ...child,
                    progress,
                    quizStats,
                    avgScore: quizStats.average_score,
                    xp,
                    totalXP: xp.total_xp,
                    completedLessons: completed,
                    totalTime,
                    streak: 0 // Simplified
                };
            })
        );

        console.log('\n✅ All child analytics processed successfully');
        console.log('Total children processed:', childrenAnalytics.length);

        // Calculate averages
        const avgChildScore = childrenAnalytics.length > 0
            ? Math.round(childrenAnalytics.reduce((acc, c) => acc + c.quizStats.average_score, 0) / childrenAnalytics.length)
            : 0;

        console.log('Average child score:', avgChildScore);
        console.log('\n✅ Full analytics flow completed successfully!');

    } catch (err) {
        console.error('❌ Error in analytics flow:', err.message);
        console.error('Stack:', err.stack);
    } finally {
        pool.end();
    }
}

testFullAnalyticsFlow();
