const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const pool = require('../src/db/pool');

async function updatePlanNames() {
    try {
        console.log('🔄 Updating plan names in database...');

        // Update Standard Plan -> Single Plan
        const res1 = await pool.query(`
            UPDATE plans 
            SET plan_name = 'Single Plan' 
            WHERE plan_name = 'Standard Plan' OR plan_name = 'Single Child' OR price = 300
        `);
        console.log(`Updated ${res1.rowCount} plans to 'Single Plan'`);

        // Update Premium Plan -> Family Plan
        const res2 = await pool.query(`
            UPDATE plans 
            SET plan_name = 'Family Plan' 
            WHERE plan_name = 'Premium Plan' OR price = 1300
        `);
        console.log(`Updated ${res2.rowCount} plans to 'Family Plan'`);

        // Also update subscriptions if they store the plan name as a string (denormalized)
        // Assuming 'users' table might have a 'subscription_plan' column or similar if not normalized.
        // Based on AdminParents.tsx, it accesses parent.subscription.plan. 
        // If subscription is a JSONB column or separate table, we should try to update it.
        // Let's check if 'subscriptions' table exists and has 'plan_type' or similar.
        // Since I don't have full schema, I'll try a generic update on 'subscriptions' table if it exists.

        try {
            const res3 = await pool.query(`
                UPDATE subscriptions 
                SET plan_type = 'Single Plan' 
                WHERE plan_type = 'Standard Plan' OR plan_type = 'Single Child'
            `);
            console.log(`Updated ${res3.rowCount} subscriptions (plan_type) to 'Single Plan'`);

            const res4 = await pool.query(`
                UPDATE subscriptions 
                SET plan_type = 'Family Plan' 
                WHERE plan_type = 'Premium Plan'
            `);
            console.log(`Updated ${res4.rowCount} subscriptions (plan_type) to 'Family Plan'`);
        } catch (e) {
            console.log('Skipping subscriptions table update (might not exist or different schema):', e.message);
        }

        console.log('✅ Plan names updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Update failed:', error);
        process.exit(1);
    }
}

updatePlanNames();
