const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const pool = require('./pool');

async function cleanupInvalidPlans() {
    try {
        console.log('🧹 Cleaning up invalid plans...');

        // First, show current plans
        const current = await pool.query('SELECT id, plan_name, price FROM plans');
        console.log('\nCurrent plans:');
        current.rows.forEach(p => {
            console.log(`  - ID: "${p.id}", Name: "${p.plan_name}", Price: ${p.price}`);
        });

        // Delete plans with invalid UUIDs (not matching UUID format)
        const result = await pool.query(`
            DELETE FROM plans 
            WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            RETURNING id, plan_name, price
        `);

        if (result.rows.length > 0) {
            console.log('\n✅ Deleted invalid plans:');
            result.rows.forEach(p => {
                console.log(`  - ID: "${p.id}", Name: "${p.plan_name}", Price: ${p.price}`);
            });
        } else {
            console.log('\n✅ No invalid plans found.');
        }

        // Show remaining plans
        const remaining = await pool.query('SELECT id, plan_name, price FROM plans');
        console.log('\nRemaining plans:');
        if (remaining.rows.length === 0) {
            console.log('  (none)');
        } else {
            remaining.rows.forEach(p => {
                console.log(`  - ID: "${p.id}", Name: "${p.plan_name}", Price: ${p.price}`);
            });
        }

        console.log('\n✅ Cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
}

cleanupInvalidPlans();
