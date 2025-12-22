require('dotenv').config({ path: __dirname + '/../../.env' });
const pool = require('./pool');

async function cleanupDuplicatePhones() {
    try {
        console.log('Cleaning up duplicate phone numbers...');

        
        const duplicates = await pool.query(`
            SELECT phone, COUNT(*) 
            FROM users 
            WHERE phone IS NOT NULL 
            GROUP BY phone 
            HAVING COUNT(*) > 1
        `);

        for (const row of duplicates.rows) {
            const phone = row.phone;
            console.log(`Processing duplicate phone: ${phone}`);

            
            const users = await pool.query(`
                SELECT id, email, created_at 
                FROM users 
                WHERE phone = $1 
                ORDER BY created_at DESC
            `, [phone]);

            
            const toUpdate = users.rows.slice(1);

            for (const user of toUpdate) {
                
                const newPhone = `${phone}_dup_${Math.floor(Math.random() * 10000)}`;
                console.log(`Updating user ${user.id} phone to ${newPhone}`);
                await pool.query('UPDATE users SET phone = $1 WHERE id = $2', [newPhone, user.id]);
            }
        }

        console.log('Cleanup complete.');
    } catch (error) {
        console.error('Error cleaning up duplicates:', error);
    } finally {
        pool.end();
    }
}

cleanupDuplicatePhones();
