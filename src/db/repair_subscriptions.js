require('dotenv').config();
const pool = require('./pool');
const SubscriptionModel = require('../models/SubscriptionModel');

async function repair() {
    const client = await pool.connect();
    try {
        console.log("--- Repairing Subscriptions ---");

         

        
        const beatrice = await client.query("SELECT id FROM users WHERE email = 'beatriceafrifaantwi@gmail.com'");
        if (beatrice.rows.length > 0) {
            const uid = beatrice.rows[0].id;
            const check = await client.query("SELECT * FROM subscriptions WHERE user_id = $1", [uid]);
            if (check.rows.length === 0) {
                console.log("Forcing subscription for Beatrice (Debugging Fix)...");
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 30);
                await SubscriptionModel.create({
                    user_id: uid,
                    plan_id: 'family', 
                    plan_name: 'Debug Fix Plan',
                    amount: 1300,
                    status: 'active',
                    start_date: startDate,
                    expires_at: endDate,
                    payment_method: 'system-fix'
                });
                console.log('  -> Fixed Beatrice.');
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

repair();
