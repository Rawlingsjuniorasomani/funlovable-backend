require('dotenv').config();
const pool = require('../src/db/pool');

async function checkParentChildren() {
    try {
        const res = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'parent_children'
      );
    `);
        console.log("Table 'parent_children' exists:", res.rows[0].exists);
    } catch (err) {
        console.error('Error checking table:', err);
    } finally {
        pool.end();
    }
}

checkParentChildren();
