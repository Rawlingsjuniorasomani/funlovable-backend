const axios = require('axios');
const PaymentModel = require('../models/PaymentModel');
const SubscriptionModel = require('../models/SubscriptionModel');
const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const PendingRegistrationModel = require('../models/PendingRegistrationModel');
const AuthService = require('./AuthService');
const UserModel = require('../models/UserModel');
const SmsService = require('./SmsService');

const getPaystackSecretKey = () => {
    const key = String(process.env.PAYSTACK_SECRET_KEY || '').trim();
    if (!key) return '';
    if (key.startsWith('pk_')) {
        throw new Error('PAYSTACK_SECRET_KEY appears to be a public key (pk_). Please use your Paystack secret key (sk_).');
    }
    return key;
};

const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + Number(days || 0));
    return d;
};

class PaymentService {
    static async initializeRegistration({ email, role, planId, payload }) {
        const paystackSecretKey = getPaystackSecretKey();
        if (!paystackSecretKey) {
            throw new Error('Paystack secret key not configured');
        }

        if (role !== 'parent' && role !== 'student') {
            throw new Error('Invalid role for registration');
        }

        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            throw new Error('Email already registered');
        }

        // Validate planId is a UUID (basic check)
        if (!planId || typeof planId !== 'string') {
            throw new Error('Invalid plan ID provided');
        }

        // Basic UUID format validation (8-4-4-4-12 hex characters)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(planId)) {
            console.error(`[PaymentService.initializeRegistration] Invalid plan ID format: "${planId}". Expected UUID format.`);
            throw new Error(`Invalid plan ID format. Please select a valid subscription plan.`);
        }

        const planRes = await pool.query('SELECT id, price, paystack_plan_code FROM plans WHERE id = $1', [planId]);
        if (planRes.rows.length === 0) {
            throw new Error('Plan not found');
        }

        const amount = Number(planRes.rows[0].price);
        const planCode = planRes.rows[0].paystack_plan_code;

        // Include the role in the callback so frontend can pick correct dashboard after return
        const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/payment/verify?role=${encodeURIComponent(role)}`;

        const paystackPayload = {
            email,
            amount: Math.round(Number(amount) * 100),
            currency: 'GHS',
            callback_url: callbackUrl,
            metadata: {
                flow: 'registration',
                plan_id: planId,
                role
            }
        };

        if (planCode) {
            paystackPayload.plan = planCode;
        }

        const PAYSTACK_TIMEOUT_MS = Number(process.env.PAYSTACK_TIMEOUT_MS) || 30000;

        let response;
        const PAYSTACK_MAX_RETRIES = Number(process.env.PAYSTACK_MAX_RETRIES) || 2;
        const BACKOFF_BASE_MS = 800;

        for (let attempt = 1; attempt <= PAYSTACK_MAX_RETRIES + 1; attempt++) {
            try {
                response = await axios.post(
                    'https://api.paystack.co/transaction/initialize',
                    paystackPayload,
                    {
                        headers: {
                            Authorization: `Bearer ${paystackSecretKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: PAYSTACK_TIMEOUT_MS,
                    }
                );
                break; // success
            } catch (error) {
                const statusCode = error?.response?.status;
                // If client error (4xx) or other non-retryable, throw immediately
                if (statusCode && statusCode >= 400 && statusCode < 500) {
                    const msg = error?.response?.data?.message || error?.response?.data || error.message || String(error);
                    console.error('Paystack Init Registration Error (non-retryable):', msg);
                    throw new Error(`Paystack initialization failed: ${msg}`);
                }

                // If we've exhausted retries, surface a descriptive error
                if (attempt > PAYSTACK_MAX_RETRIES) {
                    let msg = error?.response?.data?.message || error?.response?.data?.data?.message || error?.message || String(error);
                    if (error && error.code === 'ECONNABORTED') {
                        msg = `Paystack request timed out after ${PAYSTACK_TIMEOUT_MS}ms`;
                    } else if (error && error.request && !error.response) {
                        msg = 'Network error contacting Paystack - no response received';
                    } else if (statusCode) {
                        msg = `Paystack returned status ${statusCode}`;
                    }
                    console.error('Paystack Init Registration Error (final):', error?.response?.data || error?.message || error);
                    throw new Error(`Paystack initialization failed: ${msg}`);
                }

                // Otherwise log and back off then retry
                console.warn(`Paystack initialize attempt ${attempt} failed; will retry.`, {
                    status: statusCode,
                    message: error?.response?.data || error?.message || String(error)
                });
                const backoff = BACKOFF_BASE_MS * attempt;
                await new Promise(r => setTimeout(r, backoff));
                continue;
            }
        }

        const { authorization_url, access_code, reference } = response.data.data;

        await PendingRegistrationModel.create({
            reference,
            email,
            role,
            plan_id: planId,
            amount,
            currency: 'GHS',
            status: 'pending',
            paystack_access_code: access_code,
            payload: payload || {}
        });

        return { authorization_url, reference };
    }

    static async verifyPayment(reference) {
        try {
            const paystackSecretKey = getPaystackSecretKey();
            if (!paystackSecretKey) {
                throw new Error('Paystack secret key not configured');
            }

            console.log(`[PaymentService.verifyPayment] Looking up pending registration for reference: ${reference}`);

            // Quick debug: check if the record exists at all in DB
            const allPending = await pool.query('SELECT reference, email, role, status FROM pending_registrations ORDER BY created_at DESC LIMIT 5');
            console.log(`[PaymentService.verifyPayment] Recent pending registrations in DB:`, allPending.rows.map(r => ({ ref: r.reference, email: r.email, role: r.role, status: r.status })));

            // 1. Verify with Paystack
            const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${paystackSecretKey}`
                }
            });

            const data = response.data.data;

            if (data.status === 'success') {
                // 2. Update Payment Record
                const existingPayment = await PaymentModel.findByReference(reference);
                if (existingPayment) {
                    await PaymentModel.updateStatus(reference, 'success');
                }

                // 3. If this is a registration flow, create the user(s) now
                if (!existingPayment) {
                    const pending = await PendingRegistrationModel.findByReference(reference);
                    console.log(`[PaymentService.verifyPayment] Pending registration lookup:`, {
                        found: !!pending,
                        email: pending?.email,
                        role: pending?.role,
                        status: pending?.status,
                        reference: reference
                    });

                    if (!pending) {
                        console.warn(`[PaymentService.verifyPayment] WARN: No pending registration found for reference ${reference}. This means initializeRegistration may not have saved to DB.`);
                    }

                    if (pending && pending.status !== 'completed') {
                        const client = await pool.connect();
                        try {
                            await client.query('BEGIN');

                            // Re-fetch with row lock to handle race conditions (e.g. webhook vs frontend redirect)
                            const lockedRes = await client.query('SELECT * FROM pending_registrations WHERE reference = $1 FOR UPDATE', [reference]);
                            const lockedPending = lockedRes.rows[0];

                            if (!lockedPending || lockedPending.status === 'completed') {
                                await client.query('COMMIT');
                                console.log(`[PaymentService.verifyPayment] Pending registration already processed (race condition handled).`);

                                // Fix: Retrieve the already created user to return token/session
                                const existingUserRes = await pool.query('SELECT * FROM users WHERE email = $1', [pending.email]);
                                const existingUser = existingUserRes.rows[0];

                                if (existingUser) {
                                    const token = AuthService.generateToken(existingUser);
                                    return { status: 'success', data: data, user: existingUser, token };
                                }

                                return { status: 'success', data: data };
                            }

                            // Use the locked record for data consistency
                            let planId = lockedPending.plan_id || data.metadata?.plan_id || null;
                            let durationDays = 30;

                            // Safeguard: Ensure planId is a valid UUID before querying
                            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                            if (planId && !uuidRegex.test(planId)) {
                                console.warn(`[PaymentService.verifyPayment] Warning: Invalid plan ID format "${planId}". Ignoring plan lookup.`);
                                planId = null;
                            }

                            if (planId) {
                                try {
                                    const dRes = await client.query('SELECT duration_days FROM plans WHERE id = $1', [planId]);
                                    if (dRes.rows.length > 0 && dRes.rows[0].duration_days) {
                                        durationDays = Number(dRes.rows[0].duration_days);
                                    }
                                } catch (dbErr) {
                                    console.error(`[PaymentService.verifyPayment] Plan lookup failed for id ${planId}:`, dbErr.message);
                                    // Fallback to default duration
                                }
                            }

                            const registrationPayload = lockedPending.payload && typeof lockedPending.payload === 'object' ? lockedPending.payload : {};

                            console.log(`[PaymentService.verifyPayment] Registration payload from pending record:`, {
                                name: registrationPayload.name,
                                email: registrationPayload.email,
                                phone: registrationPayload.phone,
                                hasChild: !!registrationPayload.child,
                                password: !!registrationPayload.password
                            });

                            const role = lockedPending.role || 'parent';
                            // Hard security: payment registration flow must never create admin users
                            if (role !== 'parent' && role !== 'student') {
                                throw new Error('Invalid role for registration');
                            }
                            const password = registrationPayload.password;
                            if (!password) {
                                throw new Error('Missing registration password');
                            }

                            const passwordHash = await bcrypt.hash(password, 10);

                            // Check if parent email already exists (in case of race condition)
                            const checkParent = await client.query('SELECT id FROM users WHERE email = $1', [lockedPending.email]);
                            if (checkParent.rows.length > 0) {
                                throw new Error('Email already registered');
                            }

                            const baseUser = await client.query(
                                `INSERT INTO users (name, email, password_hash, role, phone, is_approved, is_onboarded, school, age, student_class)
                                 VALUES ($1, $2, $3, $4, $5, true, true, $6, $7, $8)
                                 RETURNING id, name, email, role, is_approved, is_onboarded`,
                                [
                                    registrationPayload.name,
                                    lockedPending.email,
                                    passwordHash,
                                    role,
                                    registrationPayload.phone || null,
                                    registrationPayload.school || null,
                                    registrationPayload.age || null,
                                    registrationPayload.studentClass || registrationPayload.grade || null
                                ]
                            ).catch((err) => {
                                console.error(`[PaymentService.verifyPayment] Failed to insert user:`, {
                                    error: err.message,
                                    code: err.code,
                                    detail: err.detail,
                                    name: registrationPayload.name,
                                    email: lockedPending.email,
                                    role: role
                                });
                                throw err;
                            });

                            const user = baseUser.rows[0];

                            console.log(`[PaymentService.verifyPayment] Created user:`, {
                                id: user.id,
                                email: user.email,
                                role: user.role,
                                name: user.name
                            });

                            const smsTargets = [];
                            if (registrationPayload.phone) {
                                smsTargets.push({ phone: registrationPayload.phone, name: registrationPayload.name, role });
                            }

                            if (role === 'parent') {
                                await client.query('INSERT INTO parents (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);

                                const child = registrationPayload.child;
                                if (child && child.name) {
                                    const childPassword = child.password || 'password123';
                                    const childHash = await bcrypt.hash(childPassword, 10);
                                    const childEmail = child.email || `child_${Date.now()}@edulearn.com`;

                                    // Check if child email already exists
                                    const checkChild = await client.query('SELECT id FROM users WHERE email = $1', [childEmail]);
                                    if (checkChild.rows.length > 0) {
                                        throw new Error(`Student email already registered: ${childEmail}`);
                                    }

                                    const childRes = await client.query(
                                        `INSERT INTO users (name, email, password_hash, role, phone, is_approved, is_onboarded, school, age, student_class)
                                         VALUES ($1, $2, $3, 'student', $4, true, true, $5, $6, $7)
                                         RETURNING id, name, email, role`,
                                        [
                                            child.name,
                                            childEmail,
                                            childHash,
                                            child.phone || null,
                                            child.school || registrationPayload.school || null,
                                            child.age || null,
                                            child.studentClass || child.grade || null
                                        ]
                                    );
                                    const childUser = childRes.rows[0];

                                    if (child.phone) {
                                        smsTargets.push({ phone: child.phone, name: child.name, role: 'student' });
                                    }

                                    await client.query(
                                        'INSERT INTO parent_children (parent_id, child_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                                        [user.id, childUser.id]
                                    );
                                    await client.query(
                                        'INSERT INTO user_xp (user_id, total_xp, level) VALUES ($1, 0, 1) ON CONFLICT DO NOTHING',
                                        [childUser.id]
                                    );

                                    // Enroll child in selected subjects (if provided)
                                    const subjects = child.subjects;
                                    if (Array.isArray(subjects) && subjects.length > 0) {
                                        for (const subjectId of subjects) {
                                            // Only insert valid UUID subject IDs to avoid SQL errors
                                            if (typeof subjectId === 'string' && uuidRegex.test(subjectId)) {
                                                await client.query(
                                                    `INSERT INTO student_subjects (student_id, subject_id)
                                                     VALUES ($1, $2)
                                                     ON CONFLICT DO NOTHING`,
                                                    [childUser.id, subjectId]
                                                );
                                            } else {
                                                console.warn(`[PaymentService.verifyPayment] Skipping invalid subject id for child enrollment: ${subjectId}`);
                                            }
                                        }
                                    }
                                }
                            }

                            const startDate = new Date();
                            const endDate = addDays(startDate, durationDays);

                            // Fetch the plan name/type to use for the subscription plan column
                            let planType = 'family'; // default to family
                            if (planId && uuidRegex.test(planId)) {
                                try {
                                    const planTypeRes = await client.query('SELECT plan_name FROM plans WHERE id = $1', [planId]);
                                    if (planTypeRes.rows.length > 0 && planTypeRes.rows[0].plan_name) {
                                        planType = planTypeRes.rows[0].plan_name.toLowerCase();
                                    }
                                } catch (err) {
                                    console.warn(`[PaymentService.verifyPayment] Plan name lookup failed: ${err.message}`);
                                }
                            }

                            if (!planId) {
                                try {
                                    const planByAmountRes = await client.query(
                                        'SELECT id FROM plans WHERE price = $1 ORDER BY created_at DESC LIMIT 1',
                                        [lockedPending.amount]
                                    );
                                    if (planByAmountRes.rows.length > 0 && planByAmountRes.rows[0].id) {
                                        planId = planByAmountRes.rows[0].id;
                                    }
                                } catch (err) {
                                    console.warn(`[PaymentService.verifyPayment] Plan ID fallback lookup by amount failed: ${err.message}`);
                                }
                            }

                            if (!planId) {
                                throw new Error('Missing plan ID for subscription');
                            }

                            await client.query(
                                `INSERT INTO payments (user_id, subscription_id, amount, currency, status, payment_method, reference, paystack_reference, metadata)
                                 VALUES ($1, NULL, $2, 'GHS', 'success', 'paystack', $3, NULL, $4::jsonb)`,
                                [user.id, lockedPending.amount, reference, JSON.stringify({ plan_id: planId, flow: 'registration' })]
                            );

                            await client.query(
                                "UPDATE subscriptions SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND status = 'active'",
                                [user.id]
                            );
                            await client.query(
                                `INSERT INTO subscriptions (user_id, plan, amount, status, starts_at, expires_at, payment_reference)
                                 VALUES ($1, $2, $3, 'active', $4, $5, $6)`,
                                [user.id, planId, lockedPending.amount, startDate, endDate, reference]
                            );

                            await client.query(
                                `UPDATE users
                                 SET subscription_status = 'active',
                                     subscription_start_date = $2,
                                     subscription_end_date = $3
                                 WHERE id = $1`,
                                [user.id, startDate, endDate]
                            );

                            await client.query(
                                "UPDATE pending_registrations SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE reference = $1",
                                [reference]
                            );

                            await client.query('COMMIT');

                            console.log(`[PaymentService.verifyPayment] Transaction committed. Generated token for user ${user.id} with role ${user.role}`);

                            for (const t of smsTargets) {
                                SmsService.sendWelcomeSMS(t).catch((e) => {
                                    console.error('Welcome SMS failed:', e?.response?.data || e?.message || e);
                                });
                            }

                            const token = AuthService.generateToken(user);
                            return { status: 'success', data, user, token };
                        } catch (e) {
                            await client.query('ROLLBACK');
                            throw e;
                        } finally {
                            client.release();
                        }
                    }
                }

                // 4. Update existing user's subscription (upgrade flow)
                const payment = existingPayment;

                if (payment) {
                    console.log(`[PaymentService.verifyPayment] Handling upgrade flow for existing payment. User ID: ${payment.user_id}`);
                    const paymentMetadata = payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {};
                    let planId = paymentMetadata.plan_id || data.metadata?.plan_id || null;

                    let durationDays = 30;

                    // Safeguard: Ensure planId is a valid UUID before querying
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (planId && !uuidRegex.test(planId)) {
                        console.warn(`[PaymentService.verifyPayment] Warning: Invalid plan ID format "${planId}" in upgrade flow. Ignoring plan lookup.`);
                        planId = null;
                    }

                    if (planId) {
                        try {
                            const planRes = await pool.query(
                                'SELECT duration_days FROM plans WHERE id = $1',
                                [planId]
                            );
                            if (planRes.rows.length > 0 && planRes.rows[0].duration_days) {
                                durationDays = Number(planRes.rows[0].duration_days);
                            }
                        } catch (err) {
                            console.error(`[PaymentService.verifyPayment] Plan lookup failed for id ${planId} in upgrade flow:`, err.message);
                        }
                    }

                    const startDate = new Date();
                    const endDate = addDays(startDate, durationDays);

                    // Ensure only one active subscription at a time
                    await SubscriptionModel.deactivateActive(payment.user_id);

                    const subscription = await SubscriptionModel.create({
                        user_id: payment.user_id,
                        plan_id: planId,
                        amount: payment.amount,
                        status: 'active',
                        start_date: startDate,
                        expires_at: endDate,
                        payment_reference: reference
                    });

                    // Keep users table in sync (auth middleware relies on these fields)
                    await pool.query(
                        `UPDATE users
                         SET subscription_status = 'active',
                             subscription_start_date = $2,
                             subscription_end_date = $3
                         WHERE id = $1`,
                        [payment.user_id, startDate, endDate]
                    );

                    return { status: 'success', data, subscription };
                }

                console.warn(`[PaymentService.verifyPayment] WARN: No pending registration and no existing payment found for reference ${reference}. Returning minimal success response with NO user/token.`);
                return { status: 'success', data };
            } else {
                const existingPayment = await PaymentModel.findByReference(reference);
                if (existingPayment) {
                    await PaymentModel.updateStatus(reference, 'failed');
                }
                const pending = await PendingRegistrationModel.findByReference(reference);
                if (pending && pending.status !== 'completed') {
                    await PendingRegistrationModel.updateStatus(reference, 'failed');
                }
                return { status: 'failed' };
            }

        } catch (error) {
            const msg =
                error?.response?.data?.message ||
                error?.response?.data?.data?.message ||
                error?.message;
            console.error('Paystack Verify Error:', error?.response?.data || error?.message);
            throw new Error(`Payment verification failed: ${msg}`);
        }
    }

    static async initializePayment(user, planId, amount) {
        try {
            const paystackSecretKey = getPaystackSecretKey();
            if (!paystackSecretKey) {
                throw new Error('Paystack secret key not configured');
            }

            const email = user.email;
            const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/payment/verify`; // Frontend verification route

            // Fetch Plan details to check for recurring plan code
            // We need to fetch the plan using PlanModel or direct query. 
            // Since we are in Service, it's better to use Model. 
            // BUT PlanModel.findById queries 'plans' table.

            // Note: PlanModel wasn't imported. I need to add it or query directly.
            // Let's assume I can query using pool or need to import PlanModel.
            // For safety and existing pattern, I'll use pool since PlanModel might not be imported in this file yet.

            // Check imports at top of file: PaymentModel, SubscriptionModel, pool. 
            // PlanModel is NOT imported. I will add import at top in next step? 
            // For now, I'll use direct pool query to be safe and atomic in this edit.

            const planResult = await pool.query('SELECT paystack_plan_code FROM plans WHERE id = $1', [planId]);
            const planCode = planResult.rows[0]?.paystack_plan_code;

            const payload = {
                email,
                amount: Math.round(Number(amount) * 100), // Ensure integer Kobo/Pesewas
                currency: 'GHS', // Ghanaian Cedis
                callback_url: callbackUrl,
                metadata: {
                    plan_id: planId,
                    user_id: user.id
                }
            };

            // If it's a recurring plan, add the plan code
            if (planCode) {
                payload.plan = planCode;
            }

            // 1. Initialize with Paystack
            let response;
            try {
                response = await axios.post(
                    'https://api.paystack.co/transaction/initialize',
                    payload,
                    {
                        headers: {
                            Authorization: `Bearer ${paystackSecretKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 15000,
                    }
                );
            } catch (error) {
                const msg = error?.response?.data?.message || error?.response?.data?.data?.message || error?.message;
                console.error('Paystack Init Error:', error?.response?.data || error?.message);
                throw new Error(`Paystack initialization failed: ${msg}`);
            }

            const { authorization_url, access_code, reference } = response.data.data;

            // 2. Create Pending Payment Record
            await PaymentModel.create({
                user_id: user.id,
                plan_id: planId,
                amount,
                reference,
                paystack_reference: access_code,
                status: 'pending'
            });

            return { authorization_url, reference };

        } catch (error) {
            console.error('Payment initialization failed:', error?.response?.data || error?.message);
            throw error;
        }
    }
}

module.exports = PaymentService;
