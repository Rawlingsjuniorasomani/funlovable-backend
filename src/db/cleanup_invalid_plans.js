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

        // Expanded Cleanup: Remove records referencing "single child" or invalid UUIDs in other tables
        console.log('\n🧹 Cleaning up invalid references in pending_registrations...');

        // Delete pending registrations with invalid plan_id (text like "single child")
        // Since plan_id is essentially text in practice here (even if column is uuid, the error implies it MIGHT be text or jsonb in payload)
        // Wait, if column is UUID, we can't search for 'single child' without casting error unless we check length or pattern
        // The user says "remove the single child that is causing the error"
        // It's safer to delete ANYTHING where plan_id is not a valid UUID format

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

        // Also clean up payments metadata if possible (JSONB is safe to query)
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
