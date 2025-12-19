const pool = require('../src/db/pool');

async function checkTables() {
    try {
        const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('Tables:', res.rows.map(r => r.table_name));

        // Check subscriptions columns if it exists
        if (res.rows.find(r => r.table_name === 'subscriptions')) {
            const cols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'subscriptions'
        `);
            console.log('Subscriptions columns:', cols.rows);
        } else {
            console.log('Subscriptions table does NOT exist');
        }

    } catch (err) {
        console.error('Error checking tables:', err);
    } finally {
        pool.end();
    }
}

checkTables();
