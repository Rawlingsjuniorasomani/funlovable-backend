require('dotenv').config();
const pool = require('./pool');

async function inspect() {
    const client = await pool.connect();
    try {
        console.log("--- Tables ---");
        const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log(tables.rows.map(r => r.table_name).join(', '));

        console.log("\n--- teacher_subjects Schema ---");
        const ts = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'teacher_subjects'
    `);
        console.log(ts.rows);

        
        console.log("\n--- student_subjects Schema (if exists) ---");
        const ss = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'student_subjects'
    `);
        console.log(ss.rows);

        
        console.log("\n--- subjects Schema ---");
        const sub = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'subjects'
    `);
        console.log(sub.rows);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

inspect();
