// PaymentPage.jsx - FIXED VERSION with proper data flow
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get data from OrderSummaryPage
  const item = location.state?.item;
  const selectedAddressId = location.state?.selectedAddress;
  const addresses = location.state?.addresses;
  const orderTotal = location.state?.orderTotal;
  
  // Find the selected address
  const selectedAddress = addresses?.find(addr => addr.id === selectedAddressId);
  
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderProcessing, setOrderProcessing] = useState(false);
  
  // Email state for collection
  const [customerEmail, setCustomerEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    // Redirect if no required data
    if (!item || !selectedAddress || !orderTotal) {
      console.log('Missing required data for payment:', {
        item: !!item,
        selectedAddress: !!selectedAddress,
        orderTotal: !!orderTotal
      });
      navigate('/menu');
      return;
    }

    // Load Razorpay script
    const loadRazorpayScript = () => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    loadRazorpayScript();
  }, [item, selectedAddress, orderTotal, navigate]);

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e) => {
    const email = e.target.value;
    setCustomerEmail(email);
    
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  // FIXED: Create order details object with proper data structure
  const createOrderDetails = () => {
    // Validate email before proceeding
    if (!customerEmail || !validateEmail(customerEmail)) {
      throw new Error('Valid email address is required');
    }

    // FIXED: Clean phone number properly
    const cleanPhone = selectedAddress.phoneNumber.replace(/\D/g, '');
    
    console.log('Creating order details with:', {
      customerName: selectedAddress.fullName,
      customerEmail: customerEmail,
      customerPhone: cleanPhone,
      deliveryAddress: selectedAddress.address
    });

    return {
      orderId: `ORDER_${Date.now()}`,
      item: {
        name: item.name,
        restaurant: item.restaurant || 'TasteSphere',
        price: typeof item.price === 'string' ? parseInt(item.price.replace(/[^\d]/g, '')) : item.price,
        image: item.image || '',
        description: item.description || ''
      },
      totalAmount: orderTotal.total,
      customerName: selectedAddress.fullName,
      customerEmail: customerEmail, // FIXED: Use collected email
      customerPhone: cleanPhone, // FIXED: Clean phone number
      deliveryAddress: selectedAddress.address,
      selectedAddress: selectedAddress,
      orderBreakdown: orderTotal,
      estimatedDelivery: '25-30 minutes'
    };
  };

  // Handle Razorpay payment
  const handleRazorpayPayment = async () => {
    // Validate email first
    if (!customerEmail || !validateEmail(customerEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const orderDetails = createOrderDetails();
      
      console.log('📝 Creating Razorpay order with details:', orderDetails);

      // Create Razorpay order
      const orderResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: orderDetails.totalAmount,
          currency: 'INR',
          receipt: `receipt_${orderDetails.orderId}`,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create payment order');
      }

      console.log('✅ Razorpay order created:', orderData.order.id);

      // Configure Razorpay options
      const razorpayOptions = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'TasteSphere',
        description: `Order: ${item.name}`,
        order_id: orderData.order.id,
        prefill: {
          name: orderDetails.customerName,
          email: orderDetails.customerEmail,
          contact: orderDetails.customerPhone,
        },
        notes: {
          order_id: orderDetails.orderId,
        },
        theme: {
          color: '#ff6b35',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError('Payment cancelled by user');
          },
        },
        handler: async (response) => {
          await verifyPayment(response, orderData.order, orderDetails);
        },
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(razorpayOptions);
      razorpay.open();

    } catch (error) {
      console.error('Razorpay payment error:', error);
      setError(error.message || 'Payment initialization failed');
      setLoading(false);
    }
  };

  // FIXED: Verify payment with proper data passing
  const verifyPayment = async (razorpayResponse, order, orderDetails) => {
    setOrderProcessing(true);

    try {
      console.log('🔍 Verifying payment for customer:', orderDetails.customerName, orderDetails.customerEmail, orderDetails.customerPhone);

      const verifyResponse = await fetch('/api/payment/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_signature: razorpayResponse.razorpay_signature,
          orderDetails: orderDetails, // FIXED: Pass complete order details with customer info
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.success) {
        console.log('✅ Payment verified, notifications:', verifyData.notifications);
        // Payment successful
        navigate('/payment-success', {
          state: {
            order: verifyData.order,
            notifications: verifyData.notifications,
          },
        });
      } else {
        throw new Error(verifyData.message || 'Payment verification failed');
      }

    } catch (error) {
      console.error('Payment verification error:', error);
      setError(error.message || 'Payment verification failed');
    } finally {
      setLoading(false);
      setOrderProcessing(false);
    }
  };

  // FIXED: Handle Cash on Delivery with proper data
  const handleCODPayment = async () => {
    // Validate email first
    if (!customerEmail || !validateEmail(customerEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    setOrderProcessing(true);

    try {
      const orderDetails = createOrderDetails();
      
      console.log('📦 Creating COD order for customer:', orderDetails.customerName, orderDetails.customerEmail, orderDetails.customerPhone);
      
      // FIXED: Add COD fee to total amount and prepare proper data
      const codOrderDetails = {
        ...orderDetails,
        totalAmount: orderDetails.totalAmount + 10, // Add ₹10 COD fee
        paymentMethod: 'cod'
      };

      const response = await fetch('/api/payment/create-cod-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderDetails: codOrderDetails, // FIXED: Pass complete order details
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ COD order created, notifications:', data.notifications);
        // COD order successful
        navigate('/payment-success', {
          state: {
            order: data.order,
            notifications: data.notifications,
          },
        });
      } else {
        throw new Error(data.message || 'COD order creation failed');
      }

    } catch (error) {
      console.error('COD order error:', error);
      setError(error.message || 'COD order creation failed');
    } finally {
      setLoading(false);
      setOrderProcessing(false);
    }
  };

  // Handle payment method selection
  const handlePaymentSubmit = () => {
    if (paymentMethod === 'razorpay') {
      handleRazorpayPayment();
    } else if (paymentMethod === 'cod') {
      handleCODPayment();
    }
  };

  // Don't render if no required data
  if (!item || !selectedAddress || !orderTotal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Order Found</h2>
          <p className="text-gray-600 mb-6">Please select an item from the menu first.</p>
          <button
            onClick={() => navigate('/menu')}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Go to Menu
          </button>
        </div>
      </div>
    );
  }

  // Calculate final total including COD fee if applicable
  const finalTotal = paymentMethod === 'cod' ? orderTotal.total + 10 : orderTotal.total;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment</h1>
          <p className="text-gray-600">Complete your order payment</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Order Summary</h2>
            
            {/* Item Details */}
            <div className="flex items-center space-x-4 mb-6">
              {item.image && (
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{item.name}</h3>
                <p className="text-gray-600 text-sm">{item.restaurant || 'TasteSphere'}</p>
                <p className="text-orange-500 font-semibold">{item.price}</p>
              </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-medium text-gray-800">{selectedAddress.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-800">{selectedAddress.phoneNumber}</p>
              </div>
              {selectedAddress.alternatePhone && (
                <div>
                  <p className="text-sm text-gray-600">Alternate Phone</p>
                  <p className="font-medium text-gray-800">{selectedAddress.alternatePhone}</p>
                </div>
              )}
            </div>

            {/* FIXED: Email Collection with better validation feedback */}
            <div className="mb-6">
              <label className="block text-sm text-gray-600 mb-2">
                Email Address *
                <span className="text-xs text-gray-500 ml-1">(Required for order confirmation)</span>
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={handleEmailChange}
                placeholder="Enter your email for order updates"
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  emailError ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {emailError && (
                <p className="text-red-500 text-sm mt-1">⚠️ {emailError}</p>
              )}
              {customerEmail && !emailError && (
                <p className="text-green-600 text-sm mt-1">✅ Email looks good!</p>
              )}
            </div>

            {/* Delivery Address */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Delivery Address</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-800">{selectedAddress.type}</p>
                <p className="text-gray-800">{selectedAddress.address}</p>
                {selectedAddress.landmark && (
                  <p className="text-gray-600 text-sm">Near: {selectedAddress.landmark}</p>
                )}
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Item Total</span>
                <span className="font-medium">₹{orderTotal.itemPrice}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-medium">₹{orderTotal.deliveryFee}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Platform Fee</span>
                <span className="font-medium">₹{orderTotal.platformFee}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">GST</span>
                <span className="font-medium">₹{orderTotal.gst}</span>
              </div>
              {paymentMethod === 'cod' && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">COD Fee</span>
                  <span className="font-medium">₹10</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                <span>Total Amount</span>
                <span className="text-orange-500">₹{finalTotal}</span>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Payment Method</h2>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">❌ {error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 mb-6">
              
              {/* Razorpay Option */}
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  paymentMethod === 'razorpay' 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setPaymentMethod('razorpay')}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={() => setPaymentMethod('razorpay')}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Online Payment</p>
                        <p className="text-sm text-gray-600">Pay securely with UPI, Cards, NetBanking</p>
                      </div>
                      <img 
                        src="https://razorpay.com/assets/razorpay-logo.svg" 
                        alt="Razorpay"
                        className="h-6 w-auto"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* COD Option */}
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  paymentMethod === 'cod' 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setPaymentMethod('cod')}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Cash on Delivery</p>
                        <p className="text-sm text-gray-600">Pay when your order arrives (+₹10 fee)</p>
                      </div>
                      <div className="text-2xl">💵</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Payment Button */}
            <button
              onClick={handlePaymentSubmit}
              disabled={loading || orderProcessing || !customerEmail || emailError}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all ${
                loading || orderProcessing || !customerEmail || emailError
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 transform hover:scale-105'
              }`}
            >
              {loading || orderProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {orderProcessing ? 'Processing Order...' : 'Loading...'}
                </div>
              ) : (
                <>
                  {paymentMethod === 'razorpay' 
                    ? `Pay ₹${orderTotal.total}` 
                    : `Place COD Order ₹${finalTotal}`
                  }
                </>
              )}
            </button>

            {/* Email Required Notice */}
            {!customerEmail && (
              <div className="mt-2 text-center">
                <p className="text-xs text-red-500">📧 Email address is required to proceed</p>
              </div>
            )}

            {/* Security Note */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                🔒 Your payment information is secure and encrypted
              </p>
            </div>

            {/* Debug Info (remove in production) */}
            {process.env.NODE_ENV === 'development' && customerEmail && (
              <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
                <p>Debug - Customer Data:</p>
                <p>Name: {selectedAddress.fullName}</p>
                <p>Email: {customerEmail}</p>
                <p>Phone: {selectedAddress.phoneNumber}</p>
              </div>
            )}

          </div>
        </div>

        {/* Processing Overlay */}
        {orderProcessing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 text-center max-w-md mx-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Processing Your Order</h3>
              <p className="text-gray-600">Please wait while we confirm your payment and place your order...</p>
              <p className="text-sm text-gray-500 mt-2">Sending notifications to: {customerEmail}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;