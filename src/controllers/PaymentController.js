const PaymentService = require('../services/PaymentService');

class PaymentController {
    static async verify(req, res) {
        try {
            const { reference } = req.params;
            console.log(`[PaymentController.verify] Starting verification for reference: ${reference}`);
            
            const result = await PaymentService.verifyPayment(reference);
            console.log(`[PaymentController.verify] Verification result:`, {
                status: result?.status,
                userRole: result?.user?.role,
                userId: result?.user?.id,
                hasToken: !!result?.token,
                flow: result?.data?.metadata?.flow
            });

            if (result && result.token) {
                console.log(`[PaymentController.verify] Existing request cookies:`, req.cookies);
                
                
                const cookieOptions = {
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    path: '/'
                };
                try {
                    res.clearCookie('token', cookieOptions);
                } catch (e) {
                    console.warn('Failed to clear existing token cookie:', e?.message || e);
                }

                console.log(`[PaymentController.verify] Setting token cookie for user role: ${result.user?.role}`);
                res.cookie('token', result.token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    maxAge: 24 * 60 * 60 * 1000,
                    path: '/'
                });
            } else {
                console.warn('[PaymentController.verify] No token returned from verifyPayment');

                
                const cookieOptions = {
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    path: '/'
                };
                try {
                    res.clearCookie('token', cookieOptions);
                } catch (e) {
                    console.warn('Failed to clear token cookie when no token returned:', e?.message || e);
                }
            }
            
            res.json(result);
        } catch (error) {
            console.error('[PaymentController.verify] Error:', error?.message || error);
            if (process.env.NODE_ENV === 'development') {
                return res.status(500).json({ error: 'Verification failed', details: error?.message || String(error) });
            }
            res.status(500).json({ error: 'Verification failed' });
        }
    }

    static async initRegistration(req, res) {
        try {
            const { email, role, planId, payload } = req.body;
            const result = await PaymentService.initializeRegistration({ email, role, planId, payload });
            res.json(result);
        } catch (error) {
            const details = error?.response?.data || error?.message;
                console.error('Init registration error:', details);
                if (error.message === 'Email already registered' || error.message === 'Plan not found') {
                    return res.status(400).json({ error: error.message });
                }
                if (error.message && String(error.message).toLowerCase().includes('paystack')) {
                    return res.status(500).json({ error: error.message, details });
                }

                
                if (process.env.NODE_ENV === 'development') {
                    return res.status(500).json({ error: error.message || 'Initialization failed', details });
                }

                return res.status(500).json({ error: 'Initialization failed' });
        }
    }

    static async init(req, res) {
        try {
            const { planId, amount } = req.body;
            const result = await PaymentService.initializePayment(req.user, planId, amount);
            res.json(result);
        } catch (error) {
            const details = error?.response?.data || error?.message;
            console.error('Init payment error:', details);
            res.status(500).json({ error: 'Initialization failed', details });
        }
    }

    static async getPayments(req, res) {
        try {
            const PaymentModel = require('../models/PaymentModel');
            const payments = await PaymentModel.findByUser(req.user.id);
            res.json(payments);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch payments' });
        }
    }
}

module.exports = PaymentController;
