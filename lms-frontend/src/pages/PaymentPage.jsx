import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './PaymentPage.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = ({ course, courseId, navigate }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      // Stripe.js has not loaded yet
      return;
    }
    
    setProcessing(true);
    
    try {
      // Create a payment method
      const { error, paymentMethod: pm } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
      });
      
      if (error) {
        console.error('Payment method creation error:', error);
        alert(error.message);
        setProcessing(false);
        return;
      }
      
      // Create payment intent
      const res = await axios.post('/api/payments/process', {
        courseId,
        paymentMethod: 'credit_card',
        paymentMethodId: pm.id
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const { clientSecret } = res.data.data;
      
      // Confirm the payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: pm.id,
      });
      
      if (result.error) {
        console.error('Payment confirmation error:', result.error);
        alert(result.error.message);
      } else if (result.paymentIntent.status === 'succeeded') {
        alert('Payment processed successfully!');
        navigate(`/courses/${courseId}`);
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="form-group">
        <label>Payment Method</label>
        <select 
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="payment-method-select"
          disabled={processing}
        >
          <option value="card">Credit/Debit Card</option>
        </select>
      </div>
      
      <div className="form-group">
        <label>Card Details</label>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>
      
      <button 
        type="submit" 
        className="btn btn-primary pay-button"
        disabled={!stripe || processing}
      >
        {processing ? 'Processing...' : `Pay $${course.price}`}
      </button>
    </form>
  );
};

const PaymentPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const res = await axios.get(`/api/courses/${courseId}`);
      setCourse(res.data.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setProcessing(true);
    
    // Simple validation
    if (paymentMethod === 'credit_card') {
      if (!cardNumber || !expiryDate || !cvv || !cardName) {
        alert('Please fill in all card details');
        setProcessing(false);
        return;
      }
    }
    
    try {
      // In a real application, we would tokenize the card details first
      // For this implementation, we'll send the payment method only
      const res = await axios.post('/api/payments/process', {
        courseId,
        paymentMethod
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      alert('Payment processed successfully!');
      // Redirect to course page
      navigate(`/courses/${courseId}`);
    } catch (err) {
      console.error(err);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="payment-page">Loading course details...</div>;
  }

  if (!course) {
    return <div className="payment-page">Course not found.</div>;
  }

  // Check if course is free
  if (course.price <= 0) {
    return (
      <div className="payment-page">
        <div className="payment-container">
          <h1>Enroll in Course</h1>
          <div className="course-info">
            <h2>{course.title}</h2>
            <p className="price">Free Course</p>
            <p className="description">{course.description}</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={async () => {
              try {
                await axios.put(`/api/courses/${courseId}/enroll`, {}, {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                  }
                });
                alert('Successfully enrolled in the course!');
                navigate(`/courses/${courseId}`);
              } catch (err) {
                console.error(err);
                alert('Failed to enroll in the course. Please try again.');
              }
            }}
          >
            Enroll Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="payment-container">
        <h1>Complete Your Purchase</h1>
        
        <div className="course-info">
          <h2>{course.title}</h2>
          <p className="price">${course.price}</p>
          <p className="description">{course.description}</p>
        </div>
        
        <Elements stripe={stripePromise}>
          <CheckoutForm course={course} courseId={courseId} navigate={navigate} />
        </Elements>
        
        <div className="security-note">
          <p>🔒 Your payment details are securely encrypted</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;