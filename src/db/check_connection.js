require('dotenv').config();
const pool = require('./pool');

async function checkDatabase() {
    try {
        console.log('Testing database connection...');
        const timeRes = await pool.query('SELECT NOW()');
        console.log('✅ Database connected. Server time:', timeRes.rows[0].now);

        console.log('\nFetching tables...');
        const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

        if (tablesRes.rows.length === 0) {
            console.log('⚠️ No tables found in public schema.');
        } else {
            console.log('✅ Tables found:');
            tablesRes.rows.forEach(row => {
                console.log(` - ${row.table_name}`);
            });
        }

        
        const userCountRes = await pool.query('SELECT count(*) FROM users');
        console.log(`\n✅ Total Users: ${userCountRes.rows[0].count}`);

        pool.end();
    } catch (err) {
        console.error('❌ Database check failed:', err);
        process.exit(1);
    }
}

checkDatabase();
