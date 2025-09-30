import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, Building, MapPin, CheckCircle, Loader } from 'lucide-react';
import AddressForm from './AddressForm';

const AddressPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedItem = location.state?.item;
  
  const [selectedAddress, setSelectedAddress] = useState('');
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API base URL - adjust according to your backend setup
  const API_BASE_URL = 'http://localhost:5000/api'; // Backend running on port 5000
const calculateOrderTotal = (item) => {
  // Handle different price formats from dish details
  let itemPrice = 0;
  
  if (item.originalPrice) {
    // Use the numeric price if available
    itemPrice = item.originalPrice;
  } else if (typeof item.price === 'string') {
    // Extract number from string format like "₹299"
    itemPrice = parseInt(item.price.replace(/[^\d]/g, '')) || 0;
  } else if (typeof item.price === 'number') {
    itemPrice = item.price;
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
  // Helper function to check and get auth token
  const getAuthToken = () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      console.log('No auth token found');
      return null;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp && payload.exp < currentTime) {
        console.log('Token expired');
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        return null;
      }
      
      return token;
    } catch (error) {
      console.log('Token parsing error:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      return null;
    }
  };

  // Fetch addresses from backend
  const fetchAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching addresses...');
      
      const token = getAuthToken();
      console.log('Token found:', !!token);
      
      if (!token) {
        console.log('No valid auth token found, using fallback addresses');
        // Fallback to original hardcoded addresses if no token
        const fallbackAddresses = [
          { 
            id: '1', 
            type: 'Home', 
            address: '7/A, Toovey puram, Thoothukkudi 628003', 
            landmark: 'Near Apollo Hospital', 
            fullName: 'Raja Varsheni', 
            phoneNumber: '9514526109',
            isDefault: true
          },
          { 
            id: '2', 
            type: 'Work', 
            address: '456 IT Park, OMR, Chennai - 600096', 
            landmark: 'Opposite to Food Court', 
            fullName: 'Raja Varsheni', 
            phoneNumber: '9514526109',
            isDefault: false
          },
          { 
            id: '3', 
            type: 'Other', 
            address: '789 Anna Salai, Chennai - 600002', 
            landmark: 'Metro Station nearby', 
            fullName: 'Raja Varsheni', 
            phoneNumber: '9514526109',
            isDefault: false
          }
        ];
        setSavedAddresses(fallbackAddresses);
        setSelectedAddress('1'); // Select first address by default
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/addresses`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('API Response status:', response.status);

      if (response.status === 401) {
        console.log('Unauthorized - clearing tokens');
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.success) {
        // Transform backend data to match frontend expectations
        const transformedAddresses = result.data.map(addr => ({
          id: addr._id,
          type: addr.type.charAt(0).toUpperCase() + addr.type.slice(1), // Capitalize first letter
          address: `${addr.houseNo}, ${addr.roadArea}, ${addr.city} - ${addr.pincode}`,
          landmark: addr.landmark,
          fullName: addr.fullName,
          phoneNumber: addr.phoneNumber,
          alternatePhone: addr.alternatePhone,
          isDefault: addr.isDefault,
          // Keep original data for potential use
          originalData: addr
        }));
        
        setSavedAddresses(transformedAddresses);
        
        // Auto-select default address if available
        const defaultAddress = transformedAddresses.find(addr => addr.isDefault);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress.id);
        } else if (transformedAddresses.length > 0) {
          setSelectedAddress(transformedAddresses[0].id);
        }
      } else {
        setError(result.message || 'Failed to fetch addresses');
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      console.log('Using fallback addresses due to API error');
      
      // Fallback to hardcoded addresses on API error
      const fallbackAddresses = [
        { 
          id: '1', 
          type: 'Home', 
          address: '7/A, Toovey puram, Thoothukkudi 628003', 
          landmark: 'Near Apollo Hospital', 
          fullName: 'Raja Varsheni', 
          phoneNumber: '9514526109',
          isDefault: true
        },
        { 
          id: '2', 
          type: 'Work', 
          address: '456 IT Park, OMR, Chennai - 600096', 
          landmark: 'Opposite to Food Court', 
          fullName: 'Raja Varsheni', 
          phoneNumber: '9514526109',
          isDefault: false
        }
      ];
      setSavedAddresses(fallbackAddresses);
      setSelectedAddress('1');
      setError('Using offline addresses. Please login for full functionality.');
    } finally {
      setLoading(false);
    }
  };

  // Create new address via API
  const createAddress = async (addressData) => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('Authentication required. Please login.');
      }
      
      // Clean the address data to avoid validation errors
      const cleanedData = {
        ...addressData,
        alternatePhone: addressData.alternatePhone || '', // Ensure it's always a string
        landmark: addressData.landmark || '' // Ensure it's always a string
      };
      
      console.log('Creating address with data:', cleanedData);
      
      const response = await fetch(`${API_BASE_URL}/addresses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      });

      console.log('Create address response status:', response.status);
      
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        throw new Error('Session expired. Please login again.');
      }

      const result = await response.json();
      console.log('Create address response:', result);
      
      if (result.success) {
        return result.data;
      } else {
        // Handle validation errors
        if (result.errors && Array.isArray(result.errors)) {
          const errorMessages = result.errors.map(err => 
            typeof err === 'object' ? err.message || err.msg : err
          ).join(', ');
          throw new Error(errorMessages);
        }
        throw new Error(result.message || 'Failed to create address');
      }
    } catch (error) {
      console.error('Error creating address:', error);
      throw error;
    }
  };

  // Load addresses on component mount
  useEffect(() => {
    fetchAddresses();
  }, []);

  // Redirect if no item selected - use useEffect to avoid navigation warnings
 useEffect(() => {
  if (!selectedItem) {
    console.log('No item selected, redirecting to menu');
    navigate('/menu');
    return;
  }
  
  // Log the received item for debugging
  console.log('AddressPage received item:', selectedItem);
}, [selectedItem, navigate]);
  
  // Log the received item for debugging
  
  const handleAddressSelection = () => {
  if (selectedAddress) {
    const selectedAddressData = savedAddresses.find(addr => addr.id === selectedAddress);
    
    if (!selectedAddressData) {
      console.error('Selected address not found:', selectedAddress);
      setError('Please select a valid address');
      return;
    }
    
    console.log('Navigating to order summary with:', { 
      item: selectedItem, 
      selectedAddressId: selectedAddress,
      selectedAddressData: selectedAddressData 
    });
    
    // Calculate order total for the next page
    const orderSummary = calculateOrderTotal(selectedItem);
    
    // Navigate to order summary with all required data
    navigate('/order-summary', { 
      state: { 
        item: selectedItem, 
        selectedAddress: selectedAddress, // Pass the ID
        addresses: savedAddresses, // Pass the full addresses array
        selectedAddressData: selectedAddressData, // Pass the address object for convenience
        orderTotal: orderSummary // Add calculated totals
      } 
    });
  } else {
    setError('Please select a delivery address');
  }
};

  const handleAddAddress = async (newAddressData) => {
    try {
      setError(null);
      console.log('Adding new address:', newAddressData);
      
      // Create address via API
      const createdAddress = await createAddress(newAddressData);
      console.log('Address created successfully:', createdAddress);
      
      // Transform the created address
      const transformedAddress = {
        id: createdAddress._id,
        type: createdAddress.type.charAt(0).toUpperCase() + createdAddress.type.slice(1),
        address: `${createdAddress.houseNo}, ${createdAddress.roadArea}, ${createdAddress.city} - ${createdAddress.pincode}`,
        landmark: createdAddress.landmark,
        fullName: createdAddress.fullName,
        phoneNumber: createdAddress.phoneNumber,
        alternatePhone: createdAddress.alternatePhone,
        isDefault: createdAddress.isDefault,
        originalData: createdAddress
      };
      
      // Update local state
      setSavedAddresses(prev => {
        // If this is set as default, update other addresses
        const updatedAddresses = createdAddress.isDefault 
          ? prev.map(addr => ({ ...addr, isDefault: false }))
          : prev;
        return [...updatedAddresses, transformedAddress];
      });
      
      setSelectedAddress(transformedAddress.id);
      setShowAddAddressForm(false);
      
      console.log('Address form closed, staying on address page for user to continue');
      
    } catch (error) {
      console.error('Failed to add address:', error);
      setError(error.message || 'Failed to save address. Please try again.');
    }
  };

  const handleCancel = () => {
    if (showAddAddressForm) {
      setShowAddAddressForm(false);
      setError(null);
    } else {
      navigate('/');
    }
  };

  // Don't render anything if no item (will redirect)
  if (!selectedItem) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-orange-500" />
              <span className="ml-2 text-gray-600">Loading addresses...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && savedAddresses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <button 
                onClick={() => navigate('/')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">Add delivery address</h2>
            </div>
            
            <div className="text-center py-12">
              <div className="text-red-500 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchAddresses}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showAddAddressForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <AddressForm
            onSave={handleAddAddress}
            onCancel={handleCancel}
            isEdit={false}
          />
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-6">
            <button 
              onClick={() => navigate('/')}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">Add delivery address</h2>
          </div>
          
          {/* Show error message if exists */}
          {error && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">1</div>
                <span className="ml-2 text-sm text-orange-600 font-medium">Address</span>
              </div>
              <div className="w-16 h-px bg-gray-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm">2</div>
                <span className="ml-2 text-sm text-gray-400">Order Summary</span>
              </div>
              <div className="w-16 h-px bg-gray-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm">3</div>
                <span className="ml-2 text-sm text-gray-400">Payment</span>
              </div>
            </div>
          </div>

          {/* Selected Item Display */}
          {selectedItem && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <img 
                  src={selectedItem.image} 
                  alt={selectedItem.name} 
                  className="w-16 h-16 object-cover rounded-lg" 
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedItem.name}</h3>
                  <p className="text-sm text-gray-600">{selectedItem.restaurant}</p>
                  <p className="font-bold text-orange-600">{selectedItem.price}</p>
                </div>
              </div>
            </div>
          )}

          {/* Saved Addresses */}
          <div className="space-y-4 mb-6">
            {savedAddresses.length > 0 ? (
              savedAddresses.map(addr => (
                <div 
                  key={addr.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <label className="flex items-start cursor-pointer flex-1">
                      <input
                        type="radio"
                        name="address"
                        value={addr.id}
                        checked={selectedAddress === addr.id}
                        onChange={() => setSelectedAddress(addr.id)}
                        className="mt-1 mr-3 text-orange-500 focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {addr.type === 'Home' ? <Home className="w-4 h-4 mr-2 text-orange-600" /> :
                           addr.type === 'Work' ? <Building className="w-4 h-4 mr-2 text-orange-600" /> :
                           <MapPin className="w-4 h-4 mr-2 text-orange-600" />}
                          <span className="font-semibold text-gray-900">{addr.type}</span>
                          {addr.isDefault && (
                            <span className="ml-2 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-800 font-medium mb-1">
                          {addr.fullName} | {addr.phoneNumber}
                        </p>
                        <p className="text-sm text-gray-600">{addr.address}</p>
                        {addr.landmark && (
                          <p className="text-xs text-gray-500 mt-1">{addr.landmark}</p>
                        )}
                      </div>
                    </label>
                    {selectedAddress === addr.id && (
                      <button 
                        onClick={handleAddressSelection}
                        className="ml-4 text-orange-600 hover:text-orange-700 px-3 py-1 bg-orange-50 rounded-md text-sm font-medium transition-colors"
                      >
                        Deliver Here
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No saved addresses found</p>
                <p className="text-sm">Add your first delivery address</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowAddAddressForm(true)}
            className="w-full border-2 border-dashed border-orange-300 rounded-lg p-4 text-center hover:border-orange-400 hover:bg-orange-50 transition-colors text-orange-600 font-medium"
          >
            + Add New Address
          </button>

          <div className="flex space-x-4 mt-6">
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddressSelection}
              disabled={!selectedAddress}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>

  );
};
// Update the Selected Item Display section to show better error handling
const SelectedItemDisplay = () => {
  if (!selectedItem) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="text-red-600 mr-3">⚠️</div>
          <div>
            <h3 className="font-semibold text-red-800">No item selected</h3>
            <p className="text-sm text-red-600">Please select an item from the menu first.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-3">
        <img 
          src={selectedItem.image || 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&dpr=1'} 
          alt={selectedItem.name} 
          className="w-16 h-16 object-cover rounded-lg" 
          onError={(e) => {
            e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&dpr=1';
          }}
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{selectedItem.name}</h3>
          <p className="text-sm text-gray-600">{selectedItem.restaurant || 'Restaurant'}</p>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-orange-600">
              {selectedItem.price || `₹${selectedItem.originalPrice || 0}`}
            </span>
            {selectedItem.quantity && selectedItem.quantity > 1 && (
              <span className="text-sm text-gray-500">× {selectedItem.quantity}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AddressPage;