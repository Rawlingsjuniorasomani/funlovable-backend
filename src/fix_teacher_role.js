const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('./db/pool');
const jwt = require('jsonwebtoken');

async function fixTeacherRole() {
    try {
        
        
        const res = await pool.query("SELECT id, email, role, is_approved FROM users");
        console.log("Current Users:");
        res.rows.forEach(u => console.log(`- ${u.email}: ${u.role} (Approved: ${u.is_approved})`));

        
        
        

        
        

        
        

        await pool.query("UPDATE users SET role = 'teacher', is_approved = true WHERE email LIKE '%teacher%'");
        console.log("Updated potential teacher accounts to confirmed teacher role.");

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

fixTeacherRole();
