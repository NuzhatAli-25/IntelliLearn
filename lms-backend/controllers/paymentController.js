const Payment = require('../models/Payment');
const Course = require('../models/Course');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Process payment for course enrollment
// @route   POST /api/payments/process
// @access  Private
const processPayment = asyncHandler(async (req, res) => {
  const { courseId, paymentMethod, paymentMethodId } = req.body;
  
  // Verify course exists and get price
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }
  
  // Check if course is free
  if (course.price <= 0) {
    res.status(400);
    throw new Error('This course is free and does not require payment');
  }
  
  // Check if user is already enrolled
  if (course.studentsEnrolled.includes(req.user.id)) {
    res.status(400);
    throw new Error('You are already enrolled in this course');
  }
  
  try {
    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(course.price * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        courseId: courseId,
        userId: req.user.id,
        courseTitle: course.title
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    // Create payment record with pending status
    const payment = await Payment.create({
      student: req.user.id,
      course: courseId,
      amount: course.price,
      currency: 'USD',
      paymentMethod,
      transactionId: paymentIntent.id,
      status: 'pending'
    });
    
    res.status(200).json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentId: payment._id,
        amount: payment.amount,
        courseId: course._id,
        courseTitle: course.title
      }
    });
  } catch (error) {
    res.status(500);
    throw new Error('Payment processing failed: ' + error.message);
  }
});

// @desc    Get payment history for a user
// @route   GET /api/payments/history
// @access  Private
const getPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ student: req.user.id })
    .populate('course', 'title')
    .sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    count: payments.length,
    data: payments
  });
});

// @desc    Get payment details
// @route   GET /api/payments/:id
// @access  Private
const getPaymentDetails = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('student', 'name email')
    .populate('course', 'title description price');
  
  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }
  
  // Check if user owns this payment or is admin
  if (payment.student._id.toString() !== req.user.id && req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Not authorized to view this payment');
  }
  
  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Refund a payment
// @route   PUT /api/payments/:id/refund
// @access  Private (Admin)
const refundPayment = asyncHandler(async (req, res) => {
  let payment = await Payment.findById(req.params.id);
  
  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }
  
  // Check if user is admin
  if (req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Not authorized to refund payments');
  }
  
  // Check if payment can be refunded
  if (payment.status !== 'completed') {
    res.status(400);
    throw new Error('Only completed payments can be refunded');
  }
  
  // Update payment status
  payment = await Payment.findByIdAndUpdate(
    req.params.id,
    {
      status: 'refunded',
      refundedAt: Date.now()
    },
    {
      new: true,
      runValidators: true
    }
  );
  
  // Remove student from course enrollment
  const course = await Course.findById(payment.course);
  if (course) {
    course.studentsEnrolled = course.studentsEnrolled.filter(
      studentId => studentId.toString() !== payment.student.toString()
    );
    await course.save();
    
    // Remove course from user's enrolled courses
    const user = await User.findById(payment.student);
    if (user) {
      user.coursesEnrolled = user.coursesEnrolled.filter(
        courseId => courseId.toString() !== payment.course.toString()
      );
      await user.save();
    }
  }
  
  res.status(200).json({
    success: true,
    message: 'Payment refunded successfully',
    data: payment
  });
});

// @desc    Handle Stripe webhook
// @route   POST /api/payments/webhook
// @access  Public (verified by Stripe)
const handleWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      
      // Find and update the payment record
      const payment = await Payment.findOne({ transactionId: paymentIntent.id });
      
      if (payment) {
        // Update payment status
        payment.status = 'completed';
        await payment.save();
        
        // Enroll student in course
        const course = await Course.findById(payment.course);
        const user = await User.findById(payment.student);
        
        if (course && user) {
          // Add student to course if not already enrolled
          if (!course.studentsEnrolled.includes(payment.student.toString())) {
            course.studentsEnrolled.push(payment.student);
            await course.save();
          }
          
          // Add course to user's enrolled courses if not already added
          if (!user.coursesEnrolled.includes(payment.course.toString())) {
            user.coursesEnrolled.push(payment.course);
            await user.save();
          }
        }
      }
      break;
    
    case 'payment_intent.payment_failed':
      const failedPaymentIntent = event.data.object;
      
      // Update payment status to failed
      await Payment.findOneAndUpdate(
        { transactionId: failedPaymentIntent.id },
        { status: 'failed' }
      );
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  res.json({ received: true });
});

module.exports = {
  processPayment,
  getPaymentHistory,
  getPaymentDetails,
  refundPayment,
  handleWebhook
};