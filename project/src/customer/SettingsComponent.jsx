import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Lock, MapPin, Camera, Bell, FileText, Plus, Edit3, Trash2, Eye, EyeOff, Upload, Save } from 'lucide-react';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// API Helper Functions
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Get current user info from token
const getCurrentUser = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
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
  // State management
  const [activeSection, setActiveSection] = useState('main');
  const [isDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState({ type: '', text: '' });
  const [currentUser, setCurrentUser] = useState(null);

  // Address management states
  const [addresses, setAddresses] = useState([]);
  const [editingAddress, setEditingAddress] = useState(null);

  // Form states for credentials
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmailInput, setNewEmailInput] = useState('');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Notification States
  const [notifications, setNotifications] = useState({
    pushEnabled: true,
    orderUpdates: true,
    offers: true,
    wishlistAlerts: false,
    smartReminders: true
  });

  // Load user profile on component mount
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const user = getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setCurrentEmail(user.email || '');
          await loadAddresses();
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();
  }, []);

  // Load addresses from API
  const loadAddresses = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('/addresses');
      setAddresses(response.data || []);
    } catch (error) {
      console.error('Error loading addresses:', error);
      setApiMessage({ 
        type: 'error', 
        text: 'Failed to load addresses. Please refresh the page.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save address (create or update)
  const handleSaveAddress = async (addressData) => {
    try {
      setIsLoading(true);
      
      if (editingAddress) {
        // Update existing address
        await apiRequest(`/addresses/${editingAddress._id}`, {
          method: 'PUT',
          body: JSON.stringify(addressData),
        });
        setApiMessage({ type: 'success', text: 'Address updated successfully!' });
      } else {
        // Create new address
        await apiRequest('/addresses', {
          method: 'POST',
          body: JSON.stringify(addressData),
        });
        setApiMessage({ type: 'success', text: 'Address added successfully!' });
      }
      
      await loadAddresses(); // Reload addresses
      setEditingAddress(null);
      setActiveSection('addresses');
    } catch (error) {
      console.error('Save address error:', error);
      setApiMessage({ 
        type: 'error', 
        text: error.message || 'Failed to save address. Please try again.' 
      });
    } finally {
      setIsLoading(false);
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
      setIsLoading(true);
      await apiRequest(`/addresses/${addressId}`, {
        method: 'DELETE',
      });
      setApiMessage({ type: 'success', text: 'Address deleted successfully!' });
      await loadAddresses(); // Reload addresses
    } catch (error) {
      console.error('Delete address error:', error);
      setApiMessage({ 
        type: 'error', 
        text: error.message || 'Failed to delete address. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      setIsLoading(true);
      await apiRequest(`/addresses/${addressId}/set-default`, {
        method: 'PUT',
      });
      setApiMessage({ type: 'success', text: 'Default address updated!' });
      await loadAddresses(); // Reload addresses
    } catch (error) {
      console.error('Set default address error:', error);
      setApiMessage({ 
        type: 'error', 
        text: error.message || 'Failed to set default address. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewAddress = () => {
    setEditingAddress(null);
    setActiveSection('address-form');
  };

  // Change email request
  const handleChangeEmailRequest = async () => {
    if (!currentEmail || !newEmailInput || !currentPassword) {
      setApiMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmailInput)) {
      setApiMessage({ type: 'error', text: 'Please enter a valid new email address' });
      return;
    }

    if (currentEmail.toLowerCase() === newEmailInput.toLowerCase()) {
      setApiMessage({ type: 'error', text: 'New email must be different from current email' });
      return;
    }

    try {
      setIsLoading(true);
      await apiRequest('/settings-auth/change-email', {
        method: 'PUT',
        body: JSON.stringify({
          newEmail: newEmailInput,
          currentPassword: currentPassword,
        }),
      });
      
      setApiMessage({ 
        type: 'success', 
        text: `Verification email sent to ${newEmailInput}. Please check your inbox and click the verification link to complete the email change.` 
      });
      
      // Clear form
      setNewEmailInput('');
      setCurrentPassword('');
    } catch (error) {
      console.error('Change email error:', error);
      setApiMessage({ 
        type: 'error', 
        text: error.message || 'Failed to send verification email. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setApiMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setApiMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setApiMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }

    try {
      setIsLoading(true);
      await apiRequest('/settings-auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword,
        }),
      });
      
      setApiMessage({ type: 'success', text: 'Password changed successfully!' });
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Change password error:', error);
      setApiMessage({ 
        type: 'error', 
        text: error.message || 'Failed to change password. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password request
  const handleForgotPasswordRequest = async () => {
    if (!forgotPasswordEmail) {
      setApiMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotPasswordEmail)) {
      setApiMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    try {
      setIsLoading(true);
      await apiRequest('/settings-auth/reset-password-request', {
        method: 'POST',
        body: JSON.stringify({
          email: forgotPasswordEmail,
        }),
      });
      
      setApiMessage({ 
        type: 'success', 
        text: 'If an account with that email exists, you will receive a password reset link shortly.' 
      });
      
      // Clear form
      setForgotPasswordEmail('');
    } catch (error) {
      console.error('Forgot password error:', error);
      setApiMessage({ 
        type: 'error', 
        text: 'An error occurred. Please try again later.' 
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
      onClose && onClose();
    } else {
      setActiveSection('main');
      setApiMessage({ type: '', text: '' });
    }
  };

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
            onClick={() => setActiveSection('forgot-password')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <Lock className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-white">Reset Password (Forgot Password)</span>
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

      {isLoading && addresses.length === 0 ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map(address => (
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
          ))}
          
          {addresses.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No addresses found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Add your first address to get started</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

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
          Update Email Address
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Email Address
            </label>
            <input
              type="email"
              value={currentEmail}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This is your current registered email address
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Email Address *
            </label>
            <input
              type="email"
              value={newEmailInput}
              onChange={(e) => setNewEmailInput(e.target.value)}
              placeholder="Enter your new email address"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This will be your new email address for login
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password *
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
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
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter your current password to confirm this change
            </p>
          </div>

          <button
            onClick={handleChangeEmailRequest}
            disabled={isLoading || !newEmailInput || !currentPassword}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>{isLoading ? 'Sending Verification Email...' : 'Send Verification Email'}</span>
          </button>

          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-start">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Email Change Process:
                </p>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>1. Your current email is automatically filled</li>
                  <li>2. Enter your desired new email address</li>
                  <li>3. Enter your current password for verification</li>
                  <li>4. A verification email will be sent to your new email</li>
                  <li>5. Click the link in the email to complete the change</li>
                  <li>6. You can then login with your new email address</li>
                </ul>
              </div>
            </div>
          </div>
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
            onClick={handleChangePassword}
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

  const renderForgotPassword = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setActiveSection('main')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Reset Password (Forgot Password)
        </h1>
      </div>

      <MessageAlert type={apiMessage.type} text={apiMessage.text} />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Password Reset Request
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              placeholder="Enter your registered email address"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter the email address associated with your account
            </p>
          </div>

          <button
            onClick={handleForgotPasswordRequest}
            disabled={isLoading || !forgotPasswordEmail}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>{isLoading ? 'Sending Reset Link...' : 'Send Password Reset Link'}</span>
          </button>

          <div className="bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <div className="flex items-start">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                  Password Reset Process:
                </p>
                <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <li>1. Enter your registered email address above</li>
                  <li>2. Click "Send Password Reset Link"</li>
                  <li>3. Check your email inbox for the reset link</li>
                  <li>4. Click the link in the email to reset your password</li>
                  <li>5. Create a new password and login again</li>
                </ul>
              </div>
            </div>
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

      <MessageAlert type={apiMessage.type} text={apiMessage.text} />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 space-y-6">
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

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Order Updates</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get notified about order status changes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.orderUpdates}
                onChange={(e) => setNotifications({ ...notifications, orderUpdates: e.target.checked })}
                className="sr-only peer"
                disabled={!notifications.pushEnabled}
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600 ${!notifications.pushEnabled ? 'opacity-50' : ''}`}></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Special Offers</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receive notifications about deals and promotions</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.offers}
                onChange={(e) => setNotifications({ ...notifications, offers: e.target.checked })}
                className="sr-only peer"
                disabled={!notifications.pushEnabled}
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600 ${!notifications.pushEnabled ? 'opacity-50' : ''}`}></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={() => setApiMessage({ type: 'success', text: 'Notification preferences saved successfully!' })}
          className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center space-x-2"
        >
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
      case 'forgot-password':
        return renderForgotPassword();
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
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;