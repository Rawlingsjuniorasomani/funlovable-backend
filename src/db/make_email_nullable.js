require('dotenv').config({ path: __dirname + '/../../.env' });
const pool = require('./pool');

async function makeEmailNullable() {
    try {
        console.log('Altering users table to make email nullable...');
        await pool.query('ALTER TABLE users ALTER COLUMN email DROP NOT NULL;');
        console.log('Successfully made email nullable.');
    } catch (error) {
        console.error('Error altering table:', error);
    } finally {
        pool.end();
    }
}

makeEmailNullable();
