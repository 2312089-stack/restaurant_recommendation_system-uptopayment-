import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Mail, Star } from 'lucide-react';

const OrderSummaryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedItem = location.state?.item;
  const selectedAddressId = location.state?.selectedAddress;
  const addresses = location.state?.addresses;
  
  console.log('OrderSummary - Item:', selectedItem);
  console.log('OrderSummary - Address ID:', selectedAddressId);
  console.log('OrderSummary - All Addresses:', addresses);

  // Find the selected address from the addresses array
  const selectedAddressData = addresses?.find(addr => addr.id === selectedAddressId);
  
  console.log('OrderSummary - Selected Address Data:', selectedAddressData);

  // Redirect if no required data
  if (!selectedItem || !selectedAddressId || !selectedAddressData || !addresses) {
    console.log('Missing required data, redirecting to home');
    console.log('Missing data check:', {
      selectedItem: !!selectedItem,
      selectedAddressId: !!selectedAddressId,
      selectedAddressData: !!selectedAddressData,
      addresses: !!addresses
    });
    navigate('/');
    return null;
  }

  const calculateOrderTotal = () => {
    // Handle different price formats
    let itemPrice = 0;
    if (typeof selectedItem.price === 'string') {
      // Remove ₹ symbol and extract number
      itemPrice = parseInt(selectedItem.price.replace('₹', '').replace(',', '').trim()) || 0;
    } else if (typeof selectedItem.price === 'number') {
      itemPrice = selectedItem.price;
    }
    
    const deliveryFee = 25;
    const platformFee = 5;
    const gst = Math.round(itemPrice * 0.05);
    return {
      itemPrice,
      deliveryFee,
      platformFee,
      gst,
      total: itemPrice + deliveryFee + platformFee + gst
    };
  };

  const orderSummary = calculateOrderTotal();

  const handleContinue = () => {
    console.log('Navigating to payment with:', {
      item: selectedItem,
      selectedAddress: selectedAddressId,
      addresses: addresses,
      orderTotal: orderSummary
    });
    
    // ✅ FIX: Pass data correctly to payment page
    navigate('/payment', { 
      state: { 
        item: selectedItem,
        selectedAddress: selectedAddressId, // Pass the ID
        addresses: addresses, // Pass the full addresses array
        orderTotal: orderSummary
      } 
    });
  };

  const handleEditAddress = () => {
    navigate('/address', { 
      state: { 
        item: selectedItem 
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={handleEditAddress}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">Order Summary</h2>
            <div></div>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <span className="ml-2 text-sm text-green-600 font-medium">Address</span>
              </div>
              <div className="w-16 h-px bg-green-600"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">2</div>
                <span className="ml-2 text-sm text-orange-600 font-medium">Order Summary</span>
              </div>
              <div className="w-16 h-px bg-gray-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm">3</div>
                <span className="ml-2 text-sm text-gray-400">Payment</span>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Deliver to:</h3>
              <button 
                onClick={handleEditAddress}
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Change
              </button>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center mb-2">
                <span className="font-semibold text-gray-900 mr-2">{selectedAddressData.type}</span>
                {selectedAddressData.isDefault && (
                  <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                    Default
                  </span>
                )}
              </div>
              <p className="font-semibold text-gray-900">{selectedAddressData.fullName}</p>
              <p className="text-gray-700">{selectedAddressData.address}</p>
              <p className="text-gray-600">{selectedAddressData.phoneNumber}</p>
              {selectedAddressData.alternatePhone && (
                <p className="text-gray-600">Alt: {selectedAddressData.alternatePhone}</p>
              )}
              {selectedAddressData.landmark && (
                <p className="text-gray-500 text-sm mt-1">{selectedAddressData.landmark}</p>
              )}
            </div>
          </div>

          {/* Order Item */}
          <div className="mb-6">
            <div className="flex items-center space-x-4 p-4 border rounded-lg">
              <img 
                src={selectedItem.image} 
                alt={selectedItem.name} 
                className="w-16 h-16 object-cover rounded-lg" 
              />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{selectedItem.name}</h4>
                <p className="text-sm text-gray-600">From: {selectedItem.restaurant}</p>
                <div className="flex items-center mt-1">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-green-600 fill-current" />
                    <Star className="w-4 h-4 text-green-600 fill-current" />
                    <Star className="w-4 h-4 text-green-600 fill-current" />
                    <Star className="w-4 h-4 text-green-600 fill-current" />
                    <Star className="w-4 h-4 text-gray-300" />
                  </div>
                  <span className="ml-2 text-sm text-gray-600">{selectedItem.rating || '4.2'} • (1,861)</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  {selectedItem.originalPrice && (
                    <>
                      <span className="text-green-600 font-semibold">50%</span>
                      <span className="text-gray-500 line-through">{selectedItem.originalPrice}</span>
                    </>
                  )}
                  <span className="font-bold text-gray-900">{selectedItem.price}</span>
                </div>
                <p className="text-xs text-gray-500">Qty: 1</p>
              </div>
            </div>
            <p className="text-sm text-green-600 mt-2">9 Offers Available</p>
            <p className="text-sm text-gray-600 mt-2">Delivery by {new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}</p>
          </div>

          {/* Bill Details */}
          <div className="border-t pt-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Bill Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Item Total</span>
                <span>₹{orderSummary.itemPrice}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>₹{orderSummary.deliveryFee}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fee</span>
                <span>₹{orderSummary.platformFee}</span>
              </div>
              <div className="flex justify-between">
                <span>GST</span>
                <span>₹{orderSummary.gst}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>Total Amount</span>
                <span className="text-orange-600">₹{orderSummary.total}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mb-6">
            <div className="flex items-center space-x-2 text-gray-600 mb-4">
              <Mail className="w-4 h-4" />
              <span className="text-sm">Email ID required for delivery</span>
              <button className="text-orange-600 text-sm font-medium ml-auto">Add Email</button>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-start space-x-2">
                <div className="w-8 h-6 bg-orange-400 rounded-sm flex items-center justify-center">
                  <span className="text-xs font-bold text-white">📦</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Rest assured with Open Box Delivery</p>
                  <p className="text-sm text-gray-700">
                    Delivery agent will open the package so you can check for correct product, damage or missing items. Share OTP to accept the delivery. 
                    <button className="text-orange-600 ml-1">Why?</button>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-gray-900">₹{orderSummary.total}</div>
            <button
              onClick={handleContinue}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Continue to Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSummaryPage;