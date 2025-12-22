const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const pool = require('./pool');

async function cleanupInvalidPlans() {
    try {
        console.log('🧹 Cleaning up invalid plans...');

        
        const current = await pool.query('SELECT id, plan_name, price FROM plans');
        console.log('\nCurrent plans:');
        current.rows.forEach(p => {
            console.log(`  - ID: "${p.id}", Name: "${p.plan_name}", Price: ${p.price}`);
        });

        
        const result = await pool.query(`
            DELETE FROM plans 
            WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
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

        
        console.log('\n🧹 Cleaning up invalid references in pending_registrations...');

        
        
        
        
        

        const pendingResult = await pool.query(`
            DELETE FROM pending_registrations 
            WHERE plan_id IS NOT NULL 
            AND plan_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            RETURNING reference, email, plan_id
        `);

        if (pendingResult.rows.length > 0) {
            console.log('\n✅ Deleted invalid pending registrations:');
            pendingResult.rows.forEach(r => console.log(`  - Ref: ${r.reference}, Email: ${r.email}, Invalid Plan: "${r.plan_id}"`));
        } else {
            console.log('  (none found)');
        }

        
        console.log('\n🧹 Cleaning up payments metadata...');
        const paymentResult = await pool.query(`
            UPDATE payments 
            SET metadata = metadata - 'plan_id' 
            WHERE metadata->>'plan_id' = 'single child'
            RETURNING reference, user_id
        `);

        if (paymentResult.rows.length > 0) {
            console.log(`✅ Updated ${paymentResult.rows.length} payment records with invalid metadata.`);
        } else {
            console.log('  (none found)');
        }

        
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
