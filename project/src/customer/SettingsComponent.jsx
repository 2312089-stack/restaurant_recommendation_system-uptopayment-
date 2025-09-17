import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Lock, MapPin, Camera, Bell, FileText, Plus, Edit3, Trash2, Eye, EyeOff, Upload, Save } from 'lucide-react';

// Helper function to check auth token
const checkAuthToken = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return { valid: false, message: 'Please log in to access settings' };
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    
    if (payload.exp && payload.exp < currentTime) {
      return { valid: false, message: 'Session expired. Please log in again' };
    }
    
    return { valid: true, token };
  } catch (error) {
    return { valid: false, message: 'Invalid session. Please log in again' };
  }
};

// Mock customer data - in real app, this would come from your user API
const customer = {
  name: "John Doe",
  email: "john@example.com",
  phone: "+91 98765 43210",
  profilePhoto: "/api/placeholder/100/100",
  address: "123 Main St, Mumbai, Maharashtra 400001"
};

// Address Form Component
const AddressForm = ({ address, onSave, onCancel, isEdit }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    alternatePhone: '',
    pincode: '',
    state: '',
    city: '',
    houseNo: '',
    roadArea: '',
    landmark: '',
    type: 'home',
    isDefault: false,
    ...address
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (!formData.pincode.trim()) newErrors.pincode = 'Pincode is required';
    if (!/^[0-9]{6}$/.test(formData.pincode)) newErrors.pincode = 'Pincode must be 6 digits';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.houseNo.trim()) newErrors.houseNo = 'House/Building number is required';
    if (!formData.roadArea.trim()) newErrors.roadArea = 'Road/Area is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Form submit error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEdit ? 'Edit Address' : 'Add New Address'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                errors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                errors.phoneNumber ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.phoneNumber && <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Alternate Phone
            </label>
            <input
              type="tel"
              name="alternatePhone"
              value={formData.alternatePhone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pincode *
            </label>
            <input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              maxLength="6"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                errors.pincode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.pincode && <p className="text-red-500 text-sm mt-1">{errors.pincode}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              State *
            </label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                errors.state ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              City *
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                errors.city ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              House/Building Number *
            </label>
            <input
              type="text"
              name="houseNo"
              value={formData.houseNo}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                errors.houseNo ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.houseNo && <p className="text-red-500 text-sm mt-1">{errors.houseNo}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Road/Area *
            </label>
            <input
              type="text"
              name="roadArea"
              value={formData.roadArea}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                errors.roadArea ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.roadArea && <p className="text-red-500 text-sm mt-1">{errors.roadArea}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Landmark
            </label>
            <input
              type="text"
              name="landmark"
              value={formData.landmark}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="home">Home</option>
              <option value="work">Work</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Set as default address
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>{isLoading ? 'Saving...' : (isEdit ? 'Update Address' : 'Add Address')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

// Main Settings Component
const Settings = ({ onClose }) => {
  // Auth and debugging
  useEffect(() => {
    const debugAuth = () => {
      const token = localStorage.getItem('token');
      console.log('=== AUTH DEBUG ===');
      console.log('Token exists:', !!token);
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('Token payload:', payload);
          console.log('Token expires:', new Date(payload.exp * 1000));
          console.log('Current time:', new Date());
          console.log('Token expired:', payload.exp * 1000 < Date.now());
        } catch (e) {
          console.log('Token parsing error:', e);
        }
      } else {
        console.log('No token found - user needs to login');
      }
      console.log('==================');
    };
    
    debugAuth();
  }, []);

  // State management
  const [activeSection, setActiveSection] = useState('main');
  const [isDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState({ type: '', text: '' });

  // Address management states
  const [addresses, setAddresses] = useState([]);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressesLoading, setAddressesLoading] = useState(false);

  // Form states for credentials - Improved from second code
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmailInput, setNewEmailInput] = useState('');
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profilePhoto] = useState('/api/placeholder/100/100');

  // Notification States
  const [notifications, setNotifications] = useState({
    pushEnabled: true,
    orderUpdates: true,
    offers: true,
    wishlistAlerts: false,
    smartReminders: true
  });

  // API helper function
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const { valid, token } = checkAuthToken();
    
    if (!valid) {
      throw new Error('Authentication required');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      throw new Error('Session expired. Please log in again.');
    }

    return response;
  };

  // Address API functions (kept exactly from first code)
  const fetchAddresses = async () => {
    setAddressesLoading(true);
    try {
      const response = await makeAuthenticatedRequest('http://localhost:5000/api/addresses');
      const data = await response.json();
      
      if (data.success) {
        setAddresses(data.data);
      } else {
        setApiMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error('Fetch addresses error:', error);
      setApiMessage({ type: 'error', text: error.message });
    } finally {
      setAddressesLoading(false);
    }
  };

  const handleSaveAddress = async (addressData) => {
    try {
      const url = editingAddress 
        ? `http://localhost:5000/api/addresses/${editingAddress._id}`
        : 'http://localhost:5000/api/addresses';
      
      const method = editingAddress ? 'PUT' : 'POST';
      
      const response = await makeAuthenticatedRequest(url, {
        method,
        body: JSON.stringify(addressData)
      });

      const data = await response.json();
      
      if (data.success) {
        setApiMessage({ type: 'success', text: data.message });
        await fetchAddresses();
        setEditingAddress(null);
        setActiveSection('addresses');
      } else {
        setApiMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error('Save address error:', error);
      setApiMessage({ type: 'error', text: error.message });
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setActiveSection('address-form');
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(
        `http://localhost:5000/api/addresses/${addressId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      
      if (data.success) {
        setApiMessage({ type: 'success', text: data.message });
        await fetchAddresses();
      } else {
        setApiMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error('Delete address error:', error);
      setApiMessage({ type: 'error', text: error.message });
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      const response = await makeAuthenticatedRequest(
        `http://localhost:5000/api/addresses/${addressId}/set-default`,
        { method: 'PUT' }
      );

      const data = await response.json();
      
      if (data.success) {
        setApiMessage({ type: 'success', text: data.message });
        await fetchAddresses();
      } else {
        setApiMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error('Set default address error:', error);
      setApiMessage({ type: 'error', text: error.message });
    }
  };

  const handleAddNewAddress = () => {
    setEditingAddress(null);
    setActiveSection('address-form');
  };

  // Load addresses when addresses section is accessed
  useEffect(() => {
    if (activeSection === 'addresses') {
      fetchAddresses();
    }
  }, [activeSection]);

  // Improved email change function from second code
  const handleChangeEmail = async (newEmail, currentPassword) => {
    if (!newEmail || !currentPassword) {
      setApiMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setApiMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setIsLoading(true);
    setApiMessage({ type: '', text: '' });
    
    try {
      const response = await fetch('http://localhost:5000/api/settings-auth/change-email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          newEmail,
          currentPassword
        })
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem('token');
        setApiMessage({ 
          type: 'error', 
          text: 'Your session has expired. Please log in again.' 
        });
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }

      if (data.success) {
        setApiMessage({ 
          type: 'success', 
          text: `Verification email sent to ${newEmail}. Please check your email and click the verification link. You will be redirected to login.` 
        });
        setNewEmailInput('');
        setCurrentPassword('');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          setApiMessage({ 
            type: 'success', 
            text: 'Redirecting to login page...' 
          });
          // In a real app, you would navigate to login page
          console.log('Redirecting to login page...');
        }, 3000);
      } else {
        setApiMessage({ 
          type: 'error', 
          text: data.message 
        });
      }
    } catch (error) {
      console.error('Change email error:', error);
      setApiMessage({ 
        type: 'error', 
        text: 'Network error. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Improved password change function from second code
  const handleChangePassword = async (currentPassword, newPassword) => {
    if (newPassword.length < 6) {
      setApiMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
      return;
    }

    const token = localStorage.getItem('token');
    
    if (!token) {
      setApiMessage({ 
        type: 'error', 
        text: 'Please log in to change your password' 
      });
      return;
    }

    setIsLoading(true);
    setApiMessage({ type: '', text: '' });
    
    try {
      const response = await fetch('http://localhost:5000/api/settings-auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem('token');
        setApiMessage({ 
          type: 'error', 
          text: 'Your session has expired. Please log in again.' 
        });
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }

      if (data.success) {
        setApiMessage({ 
          type: 'success', 
          text: data.message 
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setApiMessage({ 
          type: 'error', 
          text: data.message 
        });
      }
    } catch (error) {
      console.error('Change password error:', error);
      setApiMessage({ 
        type: 'error', 
        text: 'Network error. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Improved reset password function from second code
  const handleResetPasswordRequest = async (email) => {
    if (!email) {
      setApiMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    setIsLoading(true);
    setApiMessage({ type: '', text: '' });
    try {
      const response = await fetch('http://localhost:5000/api/settings-auth/reset-password-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (data.success) {
        setApiMessage({ 
          type: 'success', 
          text: data.message 
        });
        setResetEmailInput('');
      } else {
        setApiMessage({ 
          type: 'error', 
          text: data.message 
        });
      }
    } catch (error) {
      console.error('Reset password request error:', error);
      setApiMessage({ 
        type: 'error', 
        text: 'Network error. Please check your connection and try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Message Alert Component
  const MessageAlert = ({ type, text }) => {
    if (!text) return null;
    return (
      <div className={`mb-4 p-3 rounded-lg ${
        type === 'success' 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        {text}
      </div>
    );
  };

  const handleBackToMain = () => {
    if (activeSection === 'main') {
      onClose();
    } else {
      setActiveSection('main');
      setApiMessage({ type: '', text: '' });
    }
  };

  const renderProfileSection = () => (
    <div className="flex items-center space-x-6 mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="relative group cursor-pointer">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
          JD
        </div>
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all duration-200 flex items-center justify-center">
          <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Click to change
          </span>
        </div>
      </div>
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{customer.name}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{customer.email}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{customer.phone}</p>
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-500">
          <span className="mr-1">📍</span>
          <p>{customer.address}</p>
        </div>
      </div>
      <button className="px-6 py-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
        Edit Profile
      </button>
    </div>
  );

  const renderMainSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={handleBackToMain}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>

      <MessageAlert type={apiMessage.type} text={apiMessage.text} />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <User className="w-5 h-5 mr-2 text-orange-500" />
            Account Security
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <button
            onClick={() => setActiveSection('addresses')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-white">Manage Saved Addresses</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>
          <button
            onClick={() => setActiveSection('credentials')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <Mail className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-white">Change Email / Password</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>
          <button
            onClick={() => setActiveSection('reset-password')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <Lock className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-white">Forgot / Reset Password</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>
          <button
            onClick={() => setActiveSection('profile-photo')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <Camera className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-white">Change Profile Photo</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Bell className="w-5 h-5 mr-2 text-orange-500" />
            Notifications
          </h2>
        </div>
        <div className="p-6">
          <button
            onClick={() => setActiveSection('notifications')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <Bell className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-white">Notification Preferences</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <FileText className="w-5 h-5 mr-2 text-orange-500" />
            Terms & Conditions
          </h2>
        </div>
        <div className="p-6">
          <button
            onClick={() => setActiveSection('terms')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <FileText className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-white">View Terms & Conditions</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderAddresses = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setActiveSection('main')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Addresses</h1>
      </div>

      <MessageAlert type={apiMessage.type} text={apiMessage.text} />

      <button
        onClick={handleAddNewAddress}
        className="w-full flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-500 transition-colors"
      >
        <Plus className="w-5 h-5 text-orange-500" />
        <span className="text-orange-500 font-medium">Add New Address</span>
      </button>

      {addressesLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No addresses found. Add your first address to get started.
            </div>
          ) : (
            addresses.map(address => (
              <div key={address._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs font-medium rounded">
                        {address.type.charAt(0).toUpperCase() + address.type.slice(1)}
                      </span>
                      {address.isDefault && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900 dark:text-white">{address.fullName}</p>
                      <p className="text-gray-700 dark:text-gray-300">{address.houseNo}, {address.roadArea}</p>
                      <p className="text-gray-700 dark:text-gray-300">{address.city}, {address.state} - {address.pincode}</p>
                      {address.landmark && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Landmark: {address.landmark}</p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Phone: {address.phoneNumber}
                        {address.alternatePhone && `, ${address.alternatePhone}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {!address.isDefault && (
                      <button
                        onClick={() => handleSetDefaultAddress(address._id)}
                        className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-orange-100 hover:text-orange-600 rounded transition-colors"
                        title="Set as default"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleEditAddress(address)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-orange-500 transition-colors"
                      title="Edit address"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(address._id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  // Improved renderCredentials from second code
  const renderCredentials = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setActiveSection('main')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Change Email / Password
        </h1>
      </div>

      <MessageAlert type={apiMessage.type} text={apiMessage.text} />

      {/* Update Email Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Update Email
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Email
            </label>
            <input
              type="email"
              value={customer.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Email *
            </label>
            <input
              type="email"
              value={newEmailInput}
              onChange={(e) => setNewEmailInput(e.target.value)}
              placeholder="Enter new email address"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password *
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password to confirm"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={() => handleChangeEmail(newEmailInput, currentPassword)}
            disabled={isLoading || !newEmailInput || !currentPassword}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>{isLoading ? 'Sending Verification...' : 'Update Email'}</span>
          </button>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            A verification email will be sent to your new email address. You'll need to verify it before the change takes effect.
          </p>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Change Password
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password *
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? 
                  <EyeOff className="w-4 h-4" /> : 
                  <Eye className="w-4 h-4" />
                }
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? 
                  <EyeOff className="w-4 h-4" /> : 
                  <Eye className="w-4 h-4" />
                }
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={() => {
              if (newPassword !== confirmPassword) {
                setApiMessage({ type: 'error', text: 'Passwords do not match' });
                return;
              }
              handleChangePassword(currentPassword, newPassword);
            }}
            disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>{isLoading ? 'Updating...' : 'Update Password'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Improved renderResetPassword from second code
  const renderResetPassword = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setActiveSection('main')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Reset Password
        </h1>
      </div>

      <MessageAlert type={apiMessage.type} text={apiMessage.text} />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center mb-6">
          <Lock className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Forgot Your Password?
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={resetEmailInput}
              onChange={(e) => setResetEmailInput(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={() => handleResetPasswordRequest(resetEmailInput)}
            disabled={isLoading || !resetEmailInput}
            className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>{isLoading ? 'Sending...' : 'Send Reset Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderProfilePhoto = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setActiveSection('main')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Change Profile Photo</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <div className="relative inline-block mb-6">
            <img
              src={profilePhoto}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600"
            />
            <button className="absolute bottom-0 right-0 p-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            <button className="flex items-center justify-center space-x-2 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Upload className="w-4 h-4" />
              <span className="text-gray-900 dark:text-white">Upload New Photo</span>
            </button>
            <button className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setActiveSection('main')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Preferences</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Push Notifications</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Enable or disable all push notifications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.pushEnabled}
                onChange={(e) => setNotifications({ ...notifications, pushEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center space-x-2">
          <Save className="w-4 h-4" />
          <span>Save Preferences</span>
        </button>
      </div>
    </div>
  );

  const renderTerms = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setActiveSection('main')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Terms & Conditions</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="prose dark:prose-invert max-w-none">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">TasteSphere Terms of Service</h3>
          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p><strong>Last updated:</strong> January 2025</p>
            
            <h4 className="font-semibold text-gray-900 dark:text-white">1. Acceptance of Terms</h4>
            <p>By accessing and using TasteSphere, you accept and agree to be bound by the terms and provision of this agreement.</p>
            
            <h4 className="font-semibold text-gray-900 dark:text-white">2. Use License</h4>
            <p>Permission is granted to temporarily download one copy of TasteSphere per device for personal, non-commercial transitory viewing only.</p>
            
            <h4 className="font-semibold text-gray-900 dark:text-white">3. Disclaimer</h4>
            <p>The materials on TasteSphere are provided on an 'as is' basis. TasteSphere makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
            
            <h4 className="font-semibold text-gray-900 dark:text-white">4. Limitations</h4>
            <p>In no event shall TasteSphere or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use TasteSphere, even if TasteSphere or a TasteSphere authorized representative has been notified orally or in writing of the possibility of such damage.</p>
            
            <h4 className="font-semibold text-gray-900 dark:text-white">5. Privacy Policy</h4>
            <p>Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information when you use our service.</p>
            
            <h4 className="font-semibold text-gray-900 dark:text-white">6. Contact Information</h4>
            <p>If you have any questions about these Terms & Conditions, please contact us at legal@tastesphere.com</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'address-form':
        return (
          <AddressForm
            address={editingAddress}
            onSave={handleSaveAddress}
            onCancel={() => setActiveSection('addresses')}
            isEdit={!!editingAddress}
          />
        );
      case 'addresses':
        return renderAddresses();
      case 'credentials':
        return renderCredentials();
      case 'reset-password':
        return renderResetPassword();
      case 'profile-photo':
        return renderProfilePhoto();
      case 'notifications':
        return renderNotifications();
      case 'terms':
        return renderTerms();
      default:
        return renderMainSettings();
    }
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderProfileSection()}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;
