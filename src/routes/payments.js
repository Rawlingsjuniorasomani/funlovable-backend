const express = require('express');
const PaymentController = require('../controllers/PaymentController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/initialize-registration', PaymentController.initRegistration);
router.post('/initialize', authMiddleware, PaymentController.init);
router.get('/verify/:reference', PaymentController.verify);
router.get('/', authMiddleware, PaymentController.getPayments);

module.exports = router;
