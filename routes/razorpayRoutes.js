const express = require('express');
const razorpayController = require('../controllers/razorpayController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Create Razorpay order
router.post('/create-order/:tourId', razorpayController.createRazorpayOrder);

// Verify payment
router.post('/verify-payment', razorpayController.verifyRazorpayPayment);

// Get payment details
router.get('/payment/:paymentId', razorpayController.getPaymentDetails);

// Refund payment (admin only)
router.post(
    '/refund/:paymentId',
    authController.restrictTo('admin'),
    razorpayController.refundPayment
);

module.exports = router;
