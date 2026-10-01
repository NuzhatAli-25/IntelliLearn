const express = require('express');
const { 
  processPayment,
  getPaymentHistory,
  getPaymentDetails,
  refundPayment,
  handleWebhook
} = require('../controllers/paymentController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public route for webhook
router.route('/webhook')
  .post(handleWebhook);

// Protected routes
router.use(protect);

router.route('/process')
  .post(processPayment);

router.route('/history')
  .get(getPaymentHistory);

router.route('/:id')
  .get(getPaymentDetails);

router.route('/:id/refund')
  .put(authorize('admin'), refundPayment);

module.exports = router;