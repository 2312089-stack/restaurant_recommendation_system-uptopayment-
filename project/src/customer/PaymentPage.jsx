// customer/PaymentPage.jsx - UPDATED: Auto-fetch email & phone
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const item = location.state?.item;
  const selectedAddressId = location.state?.selectedAddress;
  const addresses = location.state?.addresses;
  const orderTotal = location.state?.orderTotal;
  
  const selectedAddress = addresses?.find(addr => addr.id === selectedAddressId);
  
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderProcessing, setOrderProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    if (!item || !selectedAddress || !orderTotal) {
      console.log('Missing required data for payment');
      navigate('/menu');
      return;
    }

    // Load Razorpay script
    const loadRazorpayScript = () => {
      return new Promise((resolve, reject) => {
        if (window.Razorpay) {
          setRazorpayLoaded(true);
          resolve(true);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          console.log('✅ Razorpay script loaded');
          setRazorpayLoaded(true);
          resolve(true);
        };
        script.onerror = () => {
          console.error('❌ Failed to load Razorpay script');
          setError('Failed to load payment gateway. Please refresh.');
          reject(false);
        };
        document.body.appendChild(script);
      });
    };

    loadRazorpayScript().catch(err => {
      console.error('Razorpay script loading error:', err);
    });
  }, [item, selectedAddress, orderTotal, navigate]);

  const createOrderDetails = () => {
    // ✅ REMOVED: Email validation - will be fetched from user account
    const cleanPhone = selectedAddress.phoneNumber.replace(/\D/g, '');
    const dishId = item._id || item.id || item.dishId;
    
    if (!dishId) {
      console.error('WARNING: No dishId found in item:', item);
      throw new Error('Invalid item data');
    }
    
    console.log('📦 Creating order with auto-fetch email/phone');

    return {
      orderId: `ORDER_${Date.now()}`,
      dishId: dishId,
      item: {
        name: item.name,
        restaurant: item.restaurant || 'TasteSphere',
        price: typeof item.price === 'string' ? parseInt(item.price.replace(/[^\d]/g, '')) : item.price,
        image: item.image || '',
        description: item.description || '',
        dishId: dishId,
        restaurantId: item.restaurantId || item.seller
      },
      totalAmount: orderTotal.total,
      customerName: selectedAddress.fullName,
      // ✅ These will be auto-fetched on backend from User model
      customerEmail: null, // Backend will fetch from User.emailId
      customerPhone: cleanPhone, // From selected address
      deliveryAddress: selectedAddress.address,
      selectedAddress: selectedAddress,
      orderBreakdown: orderTotal,
      estimatedDelivery: '25-30 minutes'
    };
  };

  const handleRazorpayPayment = async () => {
    if (!razorpayLoaded || !window.Razorpay) {
      setError('Payment gateway is not ready. Please refresh the page.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const orderDetails = createOrderDetails();
      
      console.log('🔐 Creating Razorpay order...');

      // Get auth token
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Please login to continue');
      }

      // Create Razorpay order
      const orderResponse = await fetch('http://localhost:5000/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: orderDetails.totalAmount,
          currency: 'INR',
          receipt: `receipt_${orderDetails.orderId}`,
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.message || 'Failed to create payment order');
      }

      const orderData = await orderResponse.json();

      if (!orderData.success || !orderData.order?.id) {
        throw new Error('Invalid order data received');
      }

      console.log('✅ Razorpay order created:', orderData.order.id);

      // Configure Razorpay
      const razorpayOptions = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'TasteSphere',
        description: `Order: ${item.name}`,
        order_id: orderData.order.id,
        prefill: {
          name: orderDetails.customerName,
          contact: orderDetails.customerPhone,
          // ✅ REMOVED: email prefill - backend will fetch it
        },
        notes: {
          order_id: orderDetails.orderId,
        },
        theme: {
          color: '#ff6b35',
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed');
            setLoading(false);
            setError('Payment cancelled. Please try again.');
          },
        },
        handler: async (response) => {
          console.log('💳 Payment successful, verifying...');
          await verifyPayment(response, orderData.order, orderDetails);
        },
      };

      const razorpay = new window.Razorpay(razorpayOptions);
      
      razorpay.on('payment.failed', function (response) {
        console.error('❌ Payment failed:', response.error);
        setLoading(false);
        setError(`Payment failed: ${response.error.description || 'Unknown error'}`);
      });

      razorpay.open();

    } catch (error) {
      console.error('❌ Razorpay payment error:', error);
      setError(error.message || 'Payment initialization failed');
      setLoading(false);
    }
  };

  const verifyPayment = async (razorpayResponse, order, orderDetails) => {
    setOrderProcessing(true);

    try {
      console.log('🔐 Verifying payment...');

      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const verifyResponse = await fetch('http://localhost:5000/api/payment/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // ✅ Backend extracts userId from this
        },
        body: JSON.stringify({
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_signature: razorpayResponse.razorpay_signature,
          orderDetails: orderDetails,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.message || 'Verification failed');
      }

      const verifyData = await verifyResponse.json();
      console.log('✅ Payment verified:', verifyData);
      
      if (verifyData.success) {
        console.log('📧 Email sent to user account email');
        console.log('📱 WhatsApp sent to:', orderDetails.customerPhone);
        
        navigate('/payment-success', { 
          state: { 
            order: {
              orderId: verifyData.order.orderId,
              dishId: orderDetails.dishId,
              totalAmount: orderDetails.totalAmount,
              customerName: orderDetails.customerName,
              customerPhone: orderDetails.customerPhone,
              deliveryAddress: orderDetails.deliveryAddress,
              paymentMethod: 'razorpay',
              razorpayPaymentId: razorpayResponse.razorpay_payment_id,
              orderStatus: verifyData.order.orderStatus || 'Confirmed',
              estimatedDelivery: orderDetails.estimatedDelivery,
              item: orderDetails.item
            },
            notifications: verifyData.notifications || {
              email: 'sent',
              whatsapp: 'sent',
              summary: 'Notifications sent to your registered email and phone'
            }
          },
          replace: true
        });
      } else {
        throw new Error(verifyData.message || 'Payment verification failed');
      }

    } catch (error) {
      console.error('❌ Payment verification error:', error);
      setError(error.message || 'Payment verification failed');
      setLoading(false);
      setOrderProcessing(false);
    }
  };

  const handleCODOrder = async () => {
    try {
      setLoading(true);
      setError('');

      const orderDetails = createOrderDetails();
      
      console.log('💵 Creating COD order...');

      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Please login to continue');
      }
      
      const response = await fetch('http://localhost:5000/api/payment/create-cod-order', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // ✅ Backend extracts userId
        },
        body: JSON.stringify({
          orderDetails: {
            ...orderDetails,
            totalAmount: orderDetails.totalAmount + 10 // COD fee
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'COD order failed');
      }

      const data = await response.json();
      console.log('✅ COD order created:', data);

      if (data.success && data.order) {
        console.log('📧 Email sent to user account email');
        console.log('📱 WhatsApp sent to:', orderDetails.customerPhone);
        
        navigate('/payment-success', { 
          state: { 
            order: {
              orderId: data.order.orderId,
              dishId: orderDetails.dishId,
              totalAmount: orderDetails.totalAmount + 10,
              customerName: orderDetails.customerName,
              customerPhone: orderDetails.customerPhone,
              deliveryAddress: orderDetails.deliveryAddress,
              paymentMethod: 'cod',
              orderStatus: data.order.orderStatus || 'Confirmed',
              estimatedDelivery: orderDetails.estimatedDelivery,
              item: orderDetails.item
            },
            notifications: data.notifications || {
              email: 'sent',
              whatsapp: 'sent',
              summary: 'COD order confirmation sent'
            }
          },
          replace: true
        });
      } else {
        throw new Error(data.message || 'COD order failed');
      }
    } catch (error) {
      console.error('❌ COD order error:', error);
      setError(error.message || 'Order failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = () => {
    if (paymentMethod === 'razorpay') {
      handleRazorpayPayment();
    } else if (paymentMethod === 'cod') {
      handleCODOrder();
    }
  };

  if (!item || !selectedAddress || !orderTotal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Order Found</h2>
          <p className="text-gray-600 mb-6">Please select an item first.</p>
          <button
            onClick={() => navigate('/menu')}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg"
          >
            Go to Menu
          </button>
        </div>
      </div>
    );
  }

  const finalTotal = paymentMethod === 'cod' ? orderTotal.total + 10 : orderTotal.total;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment</h1>
          <p className="text-gray-600">Complete your order payment</p>
          <p className="text-sm text-green-600 mt-2">
            ✅ Notifications will be sent to your registered email & phone
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Order Summary</h2>
            
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

            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-medium text-gray-800">{selectedAddress.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-800">{selectedAddress.phoneNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">📧 Email Notification</p>
                <p className="font-medium text-green-600">Sent to your registered email</p>
              </div>
            </div>

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
                <p className="text-sm text-red-700">{error}</p>
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
                    className="h-4 w-4 text-orange-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Online Payment</p>
                        <p className="text-sm text-gray-600">UPI, Cards, NetBanking</p>
                      </div>
                      <img 
                        src="https://razorpay.com/assets/razorpay-logo.svg" 
                        alt="Razorpay"
                        className="h-6"
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
                    className="h-4 w-4 text-orange-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Cash on Delivery</p>
                        <p className="text-sm text-gray-600">Pay when order arrives (+₹10)</p>
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
              disabled={loading || orderProcessing || (paymentMethod === 'razorpay' && !razorpayLoaded)}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all ${
                loading || orderProcessing || (paymentMethod === 'razorpay' && !razorpayLoaded)
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

            {paymentMethod === 'razorpay' && !razorpayLoaded && (
              <div className="mt-2 text-center">
                <p className="text-xs text-orange-500">Loading payment gateway...</p>
              </div>
            )}

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                🔒 Your payment information is secure and encrypted
              </p>
              <p className="text-xs text-green-600 mt-2">
                📧 Email & 📱 WhatsApp notifications will be sent automatically
              </p>
            </div>

          </div>
        </div>

        {/* Processing Overlay */}
        {orderProcessing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 text-center max-w-md mx-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Processing Your Order</h3>
              <p className="text-gray-600">Confirming payment and sending notifications...</p>
              <p className="text-sm text-green-600 mt-2">
                ✉️ Email will be sent to your registered account<br/>
                📱 WhatsApp to: {selectedAddress.phoneNumber}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;