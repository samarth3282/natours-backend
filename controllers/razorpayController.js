const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/bookingModel');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createRazorpayOrder = catchAsync(async (req, res, next) => {
    // Get currently booked tour
    const tour = await Tour.findById(req.params.tourId);

    // Create Razorpay order
    const options = {
        amount: tour.price * 100, // amount in smallest currency unit (paise for INR)
        currency: 'INR', // Change to INR for Indian market
        receipt: `tour_${tour._id}_${Date.now()}`,
        notes: {
            tourId: tour._id.toString(),
            userId: req.user._id.toString(),
            tourName: tour.name,
        },
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
        status: 'success',
        order: {
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID,
            tour: {
                name: tour.name,
                price: tour.price,
                imageCover: tour.imageCover,
            },
            user: {
                name: req.user.name,
                email: req.user.email,
            },
        },
    });
});

exports.verifyRazorpayPayment = catchAsync(async (req, res, next) => {
    const {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
    } = req.body;

    // Verify payment signature
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    const isAuthentic = expectedSignature === razorpaySignature;

    if (isAuthentic) {
        // Get order details from Razorpay
        const order = await razorpay.orders.fetch(razorpayOrderId);

        // Create booking in database
        const booking = await Booking.create({
            tour: order.notes.tourId,
            user: order.notes.userId,
            price: order.amount / 100, // convert paise back to rupees
            paymentId: razorpayPaymentId,
            orderId: razorpayOrderId,
        });

        res.status(200).json({
            status: 'success',
            message: 'Payment verified successfully',
            booking,
        });
    } else {
        res.status(400).json({
            status: 'fail',
            message: 'Payment verification failed',
        });
    }
});

// Get payment details
exports.getPaymentDetails = catchAsync(async (req, res, next) => {
    const { paymentId } = req.params;

    const payment = await razorpay.payments.fetch(paymentId);

    res.status(200).json({
        status: 'success',
        payment,
    });
});

// Refund payment
exports.refundPayment = catchAsync(async (req, res, next) => {
    const { paymentId } = req.params;
    const { amount } = req.body; // amount in paise

    const refund = await razorpay.payments.refund(paymentId, {
        amount: amount || undefined, // if no amount specified, full refund
        speed: 'normal',
    });

    res.status(200).json({
        status: 'success',
        refund,
    });
});
