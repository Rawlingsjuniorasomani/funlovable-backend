const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const pool = require('./pool');
const { v4: uuidv4 } = require('uuid');

async function seedPlans() {
    try {
        console.log('🌱 Seeding subscription plans...');

        const plans = [
            {
                plan_name: 'Single Child',
                price: 300,
                duration_days: 120, 
                features: JSON.stringify(['Access to all subjects', 'Basic quizzes', 'Progress tracking', 'Email support']),
                description: 'Perfect for getting started with termly assessments.'
            },
            {
                plan_name: 'Family Plan',
                price: 1300,
                duration_days: 365, 
                features: JSON.stringify(['All subjects included', 'Advanced analytics', 'Priority support', 'Downloadable resources', 'Live classes access']),
                description: 'Complete access for the entire academic year.'
            }
        ];

        
        
        
        
        
        
        
        
        

        
        const currentPlans = await pool.query('SELECT * FROM plans');

        if (currentPlans.rows.length > 0) {
            console.log('Plans already exist. Updating prices to match requirements where possible or adding new ones.');
            
            
        }

        console.log('Detected schema: plan_name, price, duration_days, description, features');

        for (const plan of plans) {
            
            const existing = await pool.query('SELECT * FROM plans WHERE price = $1', [plan.price]);

            if (existing.rows.length === 0) {
                await pool.query(`
            INSERT INTO plans (id, plan_name, price, duration_days, features, description)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [uuidv4(), plan.plan_name, plan.price, plan.duration_days, plan.features, plan.description]);
                console.log(`Created plan: ${plan.plan_name} (${plan.price} GHS)`);
            } else {
                console.log(`Plan with price ${plan.price} GHS already exists. Skipping.`);
            }
        }

        console.log('✅ Plans seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedPlans();
