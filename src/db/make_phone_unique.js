require('dotenv').config({ path: __dirname + '/../../.env' });
const pool = require('./pool');

async function addUniquePhoneConstraint() {
    try {
        console.log('Adding unique constraint to phone column...');
        
        
        
        
        await pool.query('ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone);');
        console.log('Successfully added unique constraint to phone.');
    } catch (error) {
        console.error('Error altering table:', error);
    } finally {
        pool.end();
    }
}

addUniquePhoneConstraint();
