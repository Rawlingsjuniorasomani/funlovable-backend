const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const pool = require('./pool');

async function updatePlanNames() {
    try {
        console.log('📝 Updating plan names...');

        
        const current = await pool.query('SELECT id, plan_name, price FROM plans ORDER BY price');
        console.log('\nCurrent plans:');
        current.rows.forEach(p => {
            console.log(`  - "${p.plan_name}" - GHS ${p.price}`);
        });

        
        await pool.query(`
            UPDATE plans 
            SET plan_name = 'Single Child' 
            WHERE price = 300
        `);

        await pool.query(`
            UPDATE plans 
            SET plan_name = 'Family Plan' 
            WHERE price = 1300
        `);

        
        const updated = await pool.query('SELECT id, plan_name, price FROM plans ORDER BY price');
        console.log('\nUpdated plans:');
        updated.rows.forEach(p => {
            console.log(`  - "${p.plan_name}" - GHS ${p.price}`);
        });

        console.log('\n✅ Plan names updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Update failed:', error);
        process.exit(1);
    }
}

updatePlanNames();
