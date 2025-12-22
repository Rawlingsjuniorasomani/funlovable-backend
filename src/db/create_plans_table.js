require('dotenv').config();
const pool = require('./pool');

const runMigration = async () => {
    try {
        console.log('Creating plans table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS plans (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                price INTEGER NOT NULL,
                duration VARCHAR(20) NOT NULL,
                features TEXT[] DEFAULT '{}',
                recommended BOOLEAN DEFAULT FALSE,
                description TEXT
            );
        `);

        
        const count = await pool.query('SELECT COUNT(*) FROM plans');
        if (parseInt(count.rows[0].count) === 0) {
            console.log('Seeding initial plans...');
            const plans = [
                {
                    id: "basic",
                    name: "Basic Plan",
                    price: 3000,
                    duration: "Monthly",
                    features: ["Access to all basic subjects", "Quiz attempts & tracking", "Standard support", "1 Child account"],
                    recommended: false
                },
                {
                    id: "premium",
                    name: "Premium Plan",
                    price: 8000,
                    duration: "Quarterly",
                    features: ["All Basic features", "Live Classes Access", "Priority Teacher Support", "Detailed Performance Analytics", "Up to 3 Child accounts"],
                    recommended: true
                },
                {
                    id: "annual",
                    name: "Annual Scholar",
                    price: 30000,
                    duration: "Yearly",
                    features: ["All Premium features", "Offline content access", "1-on-1 Mentoring sessions", "Exam Preparation Kit", "Unlimited Child accounts"],
                    recommended: false
                }
            ];

            for (const plan of plans) {
                await pool.query(
                    `INSERT INTO plans (id, name, price, duration, features, recommended, description) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [plan.id, plan.name, plan.price, plan.duration, plan.features, plan.recommended, ""]
                );
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

runMigration();
