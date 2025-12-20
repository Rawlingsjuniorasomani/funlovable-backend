require('dotenv').config();
const PaymentService = require('./src/services/PaymentService');
const pool = require('./src/db/pool');
const bcrypt = require('bcryptjs'); // Needed for logic simulation

async function testRegistration() {
    console.log('--- STARTING REGISTRATION DEBUG ---');
    try {
        const referenceToTest = 'sffwxtickm'; // The failed reference

        // 1. Fetch Pending Record
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            console.log(`Fetching record for ref: ${referenceToTest}`);

            const lockedRes = await client.query('SELECT * FROM pending_registrations WHERE reference = $1 FOR UPDATE', [referenceToTest]);
            const lockedPending = lockedRes.rows[0];

            if (!lockedPending) {
                console.error("Pending record not found!");
                return;
            }

            console.log('Found Record:', {
                ref: lockedPending.reference,
                email: lockedPending.email,
                role: lockedPending.role
            });
            console.log('Payload:', JSON.stringify(lockedPending.payload, null, 2));

            // --- SIMULATE VERIFICATION LOGIC ---
            const registrationPayload = lockedPending.payload;
            const role = lockedPending.role || 'parent';
            const email = lockedPending.email;

            // ... (Logic from PaymentService lines 233-400) ...

            // 1. Create Parent
            const baseUser = await client.query(
                `INSERT INTO users (name, email, password_hash, role, phone, is_approved, is_onboarded, school, age, student_class)
                 VALUES ($1, $2, 'HASHED_PW', $3, $4, true, true, $5, $6, $7)
                 RETURNING id`,
                [
                    registrationPayload.name,
                    email,
                    role, // 'parent'
                    registrationPayload.phone || null,
                    registrationPayload.school || null,
                    registrationPayload.age || null,
                    registrationPayload.studentClass || registrationPayload.grade || null
                ]
            );
            console.log('Parent Created:', baseUser.rows[0]);
            const parentId = baseUser.rows[0].id;

            // Insert Parent Table
            await client.query('INSERT INTO parents (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [parentId]);
            console.log('Parent Record Created');

            // Insert Child
            const child = registrationPayload.child;
            if (child && child.name) {
                console.log('Creating Child:', child.name);
                const childEmail = child.email || `child_${Date.now()}@edulearn.com`;

                // Check dupes
                // const checkChild = ... skip for now

                const childUser = await client.query(
                    `INSERT INTO users (name, email, password_hash, role, phone, is_approved, is_onboarded, school, age, student_class)
                     VALUES ($1, $2, 'HASHED_PW', 'student', $3, true, true, $4, $5, $6)
                     RETURNING id`,
                    [
                        child.name,
                        childEmail,
                        child.phone || null,
                        child.school || registrationPayload.school || null,
                        child.age || null,
                        child.studentClass || child.grade || null
                    ]
                );
                console.log('Child Created:', childUser.rows[0]);
                const childId = childUser.rows[0].id;

                // Link
                await client.query(
                    'INSERT INTO parent_children (parent_id, child_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [parentId, childId]
                );
                console.log('Parent-Child Linked');

                // Subjects
                const subjects = child.subjects;
                if (Array.isArray(subjects) && subjects.length > 0) {
                    // Check UUIDs...
                    // Wait, what if subject ID is invalid here?
                    console.log('Enrolling in subjects:', subjects);
                }
            } else {
                console.log('NO CHILD DATA FOUND in payload.child');
            }

            console.log('--- TEST SUCCESS (Rolled back) ---');
            await client.query('ROLLBACK');

        } catch (err) {
            console.error('--- LOGIC FAILED ---');
            console.error(err);
            await client.query('ROLLBACK');
        } finally {
            client.release();
        }

    } catch (e) {
        console.error('Top Level Error:', e);
    } finally {
        pool.end();
    }
}

testRegistration();
