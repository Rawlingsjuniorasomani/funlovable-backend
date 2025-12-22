require('dotenv').config();
const pool = require('./pool');

async function getStudentCreds() {
    const client = await pool.connect();
    try {
        const parentEmail = 'beatriceafrifaantwi@gmail.com';
        const childId = '771fe18f-5c27-4e3b-9c31-d1508eca4f0e';

        const userRes = await client.query('SELECT role, email FROM users WHERE id = $1', [childId]);
        console.log('Child User:', userRes.rows[0]);

        
        
        

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

getStudentCreds();
