// components/seller/auth/SellerSignup.jsx - WITH INTEGRATED ONBOARDING FLOW
import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, ChefHat, Store, MapPin, UtensilsCrossed, CreditCard, FileCheck, CheckCircle, Upload, Clock, Phone, Mail, Building, User, Camera, Plus, Trash2, ArrowRight } from 'lucide-react';

const SellerSignup = ({ onBackToLogin, onSignupComplete }) => {
  const [email, setEmail] = useState('');
  const [currentStep, setCurrentStep] = useState('email');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  
  // Password setup state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Onboarding States
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingErrors, setOnboardingErrors] = useState({});

  const API_BASE_URL = 'http://localhost:5000/api';

  // Onboarding Form Data
  const [formData, setFormData] = useState({
    // Step 1 - Business Profile
    restaurantName: '',
    ownerName: '',
    businessType: '',
    logo: null,
    bannerImage: null,
    description: '',
    
    // Step 2 - Location & Contact
    address: '',
    pincode: '',
    latitude: '',
    longitude: '',
    phoneNumber: '',
    emailAddress: '',
    openingHours: {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '22:00', closed: false },
      saturday: { open: '09:00', close: '23:00', closed: false },
      sunday: { open: '10:00', close: '22:00', closed: false }
    },
    
    // Step 3 - Menu Setup
    
    
    // Step 3 - Payments & Finance
    bankAccount: '',
    ifscCode: '',
    accountHolder: '',
    panNumber: '',
    gstNumber: '',
    razorpayId: '',
    
    // Step 4 - Verification Documents
    ownerIdProof: null,
    businessProof: null,
    termsAccepted: false
  });

  // Business types and categories
  const businessTypes = ['Restaurant', 'Café', 'Hotel Dining', 'Cloud Kitchen', 'Fast Food', 'Bakery', 'Sweet Shop', 'Bar & Grill'];
  const categories = ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Chinese', 'Indian', 'Continental', 'South Indian'];
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Helper validations
  const isOtpComplete = otp.every(digit => digit !== '');
 const isPasswordValid = password.length >= 8;
const isConfirmPasswordValid = confirmPassword.length >= 8;

  // Restaurant/Chef icon component
  const RestaurantIcon = () => (
    <div className="relative w-full h-full">
      <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-8 h-4 bg-white rounded-t-full"></div>
      <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-6 h-2 bg-white rounded"></div>
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-10 h-3 bg-white rounded-full"></div>
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
      <div className="absolute bottom-1.5 left-6 w-1.5 h-1.5 bg-white rounded-full"></div>
      <div className="absolute bottom-1.5 right-6 w-1.5 h-1.5 bg-white rounded-full"></div>
    </div>
  );

  const handleContinue = async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      console.log('📧 Sending seller OTP to:', email);
      
      const response = await fetch(`${API_BASE_URL}/seller/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      console.log('📡 Seller OTP response:', data);
      
      if (data.success) {
        setServerOtp(data.otp.toString());
        setCurrentStep('otp');
        console.log('✅ Seller OTP sent successfully');
      } else {
        setError(data.error || 'Failed to send OTP');
        console.log('❌ Failed to send seller OTP:', data.error);
      }
    } catch (err) {
      console.error('❌ Seller OTP error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) {
      const nextInput = document.querySelector(`input[name="seller-otp-${index + 1}"]`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.querySelector(`input[name="seller-otp-${index - 1}"]`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerify = () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 4) {
      setError('Please enter complete OTP');
      return;
    }
    
    console.log('🔍 Verifying seller OTP:', enteredOtp, 'vs', serverOtp);
    
    if (enteredOtp === serverOtp) {
      setCurrentStep('password');
      setError('');
      console.log('✅ Seller OTP verified successfully');
    } else {
      setError('Invalid OTP. Please try again.');
      console.log('❌ Seller OTP verification failed');
    }
  };
// Fix in SellerSignup.jsx - handleSignup function
const handleSignup = async () => {
  if (password.length < 8) {
  setError('Business account password must be at least 8 characters long');
  return;
}
  if (password !== confirmPassword) {
    setError('Passwords do not match');
    return;
  }
  
  setLoading(true);
  setError('');
  
  try {
    console.log('👤 Creating seller account for:', email);
    
    const response = await fetch(`${API_BASE_URL}/seller/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: email.toLowerCase().trim(), 
        password,
        businessName: '',
        businessType: 'Restaurant' // FIXED: Changed from 'restaurant' to 'Restaurant'
      }),
    });
    
    const data = await response.json();
    console.log('📡 Seller registration response:', data);
    
    if (data.success) {
      console.log('✅ Seller account created successfully');
      
      // Store token for onboarding
      localStorage.setItem('sellerToken', data.token);
      
      // Start onboarding flow
      setFormData(prev => ({
        ...prev,
        emailAddress: email
      }));
      setShowOnboarding(true);
      setCurrentStep('onboarding');
      console.log('🚀 Starting onboarding flow...');
    } else {
      setError(data.error || 'Failed to create seller account');
      console.log('❌ Seller registration failed:', data.error);
    }
  } catch (err) {
    console.error('❌ Seller signup error:', err);
    setError('Network error. Please try again.');
  } finally {
    setLoading(false);
  }
};
  
  const handleResendCode = async () => {
    setOtp(['', '', '', '']);
    setError('');
    console.log('🔄 Resending seller OTP');
    await handleContinue();
  };

  const handleChangeEmail = () => {
    setCurrentStep('email');
    setOtp(['', '', '', '']);
    setError('');
    setServerOtp('');
    console.log('📝 Changing seller email');
  };

  // Onboarding Functions
  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedData = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const handleFileUpload = (field, file) => {
    updateFormData(field, file);
  };

  

  const validateStep = (step) => {
    const newErrors = {};
    
    switch(step) {
      case 1:
        if (!formData.restaurantName) newErrors.restaurantName = 'Restaurant name is required';
        if (!formData.ownerName) newErrors.ownerName = 'Owner name is required';
        if (!formData.businessType) newErrors.businessType = 'Business type is required';
        break;
      case 2:
        if (!formData.address) newErrors.address = 'Address is required';
        if (!formData.pincode) newErrors.pincode = 'Pincode is required';
        if (!formData.phoneNumber) newErrors.phoneNumber = 'Phone number is required';
        break;
      
      case 3:
        if (!formData.bankAccount) newErrors.bankAccount = 'Bank account is required';
        if (!formData.ifscCode) newErrors.ifscCode = 'IFSC code is required';
        if (!formData.accountHolder) newErrors.accountHolder = 'Account holder name is required';
        break;
      case 4:
        if (!formData.ownerIdProof) newErrors.ownerIdProof = 'Owner ID proof is required';
        if (!formData.businessProof) newErrors.businessProof = 'Business proof is required';
        if (!formData.termsAccepted) newErrors.termsAccepted = 'Please accept terms and conditions';
        break;
    }
    
    setOnboardingErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(onboardingStep)) {
      setOnboardingStep(prev => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    setOnboardingStep(prev => Math.max(prev - 1, 1));
  };

  const submitOnboarding = async () => {
    setLoading(true);
    try {
      // Create FormData for file uploads
      const onboardingData = new FormData();
      
      // Append all form data
      Object.keys(formData).forEach(key => {
       
         if (key === 'openingHours') {
          onboardingData.append(key, JSON.stringify(formData[key]));
        } else if (formData[key] instanceof File) {
          onboardingData.append(key, formData[key]);
        } else if (formData[key] !== null && formData[key] !== '') {
          onboardingData.append(key, formData[key]);
        }
      });

      const res = await fetch(`${API_BASE_URL}/seller/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sellerToken')}`
        },
        body: onboardingData
      });

      const data = await res.json();
      
      if (data.success) {
        console.log('✅ Onboarding completed successfully');
        
        // Clear form data
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setError('');
        setOtp(['', '', '', '']);
        
        // Complete signup process
        onSignupComplete();
      } else {
        setError(data.error || 'Onboarding failed');
      }
    } catch (err) {
      console.error('❌ Onboarding error:', err);
      setError('Network error during onboarding');
    } finally {
      setLoading(false);
    }
  };

  // ONBOARDING FLOW
  if (showOnboarding) {
    const steps = [
      { number: 1, title: 'Business Profile', icon: Building },
      { number: 2, title: 'Location & Contact', icon: MapPin },
     
      { number: 3, title: 'Payments & Finance', icon: CreditCard },
      { number: 4, title: 'Verification Documents', icon: FileCheck },
      { number: 5, title: 'Review & Submit', icon: CheckCircle }
    ];

    const renderStep = () => {
      switch(onboardingStep) {
        case 1:
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Building className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Business Profile</h2>
                <p className="text-gray-600">Tell us about your restaurant</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Restaurant/Business Name</label>
                  <input
                    type="text"
                    value={formData.restaurantName}
                    onChange={(e) => updateFormData('restaurantName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g., Rajesh's Kitchen"
                  />
                  {onboardingErrors.restaurantName && <p className="text-red-500 text-sm mt-1">{onboardingErrors.restaurantName}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner/Manager Name</label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => updateFormData('ownerName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Your full name"
                  />
                  {onboardingErrors.ownerName && <p className="text-red-500 text-sm mt-1">{onboardingErrors.ownerName}</p>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
                <select
                  value={formData.businessType}
                  onChange={(e) => updateFormData('businessType', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select business type</option>
                  {businessTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {onboardingErrors.businessType && <p className="text-red-500 text-sm mt-1">{onboardingErrors.businessType}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Brief description of your restaurant..."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo Upload</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('logo', e.target.files[0])}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload" className="cursor-pointer text-orange-600 hover:text-orange-700">
                      Upload Logo
                    </label>
                    {formData.logo && <p className="text-sm text-green-600 mt-2">{formData.logo.name}</p>}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('bannerImage', e.target.files[0])}
                      className="hidden"
                      id="banner-upload"
                    />
                    <label htmlFor="banner-upload" className="cursor-pointer text-orange-600 hover:text-orange-700">
                      Upload Banner
                    </label>
                    {formData.bannerImage && <p className="text-sm text-green-600 mt-2">{formData.bannerImage.name}</p>}
                  </div>
                </div>
              </div>
            </div>
          );
        
        case 2:
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <MapPin className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Location & Contact</h2>
                <p className="text-gray-600">Where can customers find you?</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => updateFormData('address', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Street address, area, city, state"
                />
                {onboardingErrors.address && <p className="text-red-500 text-sm mt-1">{onboardingErrors.address}</p>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => updateFormData('pincode', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="641001"
                  />
                  {onboardingErrors.pincode && <p className="text-red-500 text-sm mt-1">{onboardingErrors.pincode}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="+91 9876543210"
                  />
                  {onboardingErrors.phoneNumber && <p className="text-red-500 text-sm mt-1">{onboardingErrors.phoneNumber}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={formData.emailAddress}
                    onChange={(e) => updateFormData('emailAddress', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50"
                    disabled
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Opening Hours</label>
                <div className="space-y-3">
                  {days.map(day => (
                    <div key={day} className="flex items-center space-x-4">
                      <div className="w-24 text-sm font-medium text-gray-700 capitalize">{day}</div>
                      <input
                        type="checkbox"
                        checked={!formData.openingHours[day].closed}
                        onChange={(e) => updateNestedData('openingHours', day, { ...formData.openingHours[day], closed: !e.target.checked })}
                        className="rounded text-orange-500"
                      />
                      <span className="text-sm text-gray-600">Open</span>
                      {!formData.openingHours[day].closed && (
                        <>
                          <input
                            type="time"
                            value={formData.openingHours[day].open}
                            onChange={(e) => updateNestedData('openingHours', day, { ...formData.openingHours[day], open: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={formData.openingHours[day].close}
                            onChange={(e) => updateNestedData('openingHours', day, { ...formData.openingHours[day], close: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        
        
        
        case 3:
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <CreditCard className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Payments & Finance</h2>
                <p className="text-gray-600">Setup payment details for earnings</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account Number</label>
                  <input
                    type="text"
                    value={formData.bankAccount}
                    onChange={(e) => updateFormData('bankAccount', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="1234567890123456"
                  />
                  {onboardingErrors.bankAccount && <p className="text-red-500 text-sm mt-1">{onboardingErrors.bankAccount}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                  <input
                    type="text"
                    value={formData.ifscCode}
                    onChange={(e) => updateFormData('ifscCode', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="SBIN0001234"
                  />
                  {onboardingErrors.ifscCode && <p className="text-red-500 text-sm mt-1">{onboardingErrors.ifscCode}</p>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Holder Name</label>
                <input
                  type="text"
                  value={formData.accountHolder}
                  onChange={(e) => updateFormData('accountHolder', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Account holder full name"
                />
                {onboardingErrors.accountHolder && <p className="text-red-500 text-sm mt-1">{onboardingErrors.accountHolder}</p>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number</label>
                  <input
                    type="text"
                    value={formData.panNumber}
                    onChange={(e) => updateFormData('panNumber', e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="ABCDE1234F"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GST Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => updateFormData('gstNumber', e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="33ABCDE1234F1Z5"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Razorpay ID (Optional)</label>
                <input
                  type="text"
                  value={formData.razorpayId}
                  onChange={(e) => updateFormData('razorpayId', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="rzp_live_1234567890"
                />
                <p className="text-xs text-gray-500 mt-1">For direct payouts (leave blank to use platform payments)</p>
              </div>
            </div>
          );
        
        case 4:
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <FileCheck className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Verification Documents</h2>
                <p className="text-gray-600">Upload required documents for verification</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner ID Proof (Aadhaar/Passport/License)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload('ownerIdProof', e.target.files[0])}
                      className="hidden"
                      id="owner-id-upload"
                    />
                    <label htmlFor="owner-id-upload" className="cursor-pointer text-orange-600 hover:text-orange-700">
                      Upload ID Proof
                    </label>
                    {formData.ownerIdProof && <p className="text-sm text-green-600 mt-2">{formData.ownerIdProof.name}</p>}
                  </div>
                  {onboardingErrors.ownerIdProof && <p className="text-red-500 text-sm mt-1">{onboardingErrors.ownerIdProof}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Proof (FSSAI/GST/Trade License)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload('businessProof', e.target.files[0])}
                      className="hidden"
                      id="business-proof-upload"
                    />
                    <label htmlFor="business-proof-upload" className="cursor-pointer text-orange-600 hover:text-orange-700">
                      Upload Business Proof
                    </label>
                    {formData.businessProof && <p className="text-sm text-green-600 mt-2">{formData.businessProof.name}</p>}
                  </div>
                  {onboardingErrors.businessProof && <p className="text-red-500 text-sm mt-1">{onboardingErrors.businessProof}</p>}
                </div>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={(e) => updateFormData('termsAccepted', e.target.checked)}
                    className="rounded text-orange-500"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    I accept the <button className="text-orange-600 underline">Terms & Conditions</button> and <button className="text-orange-600 underline">Privacy Policy</button>
                  </span>
                </label>
                {onboardingErrors.termsAccepted && <p className="text-red-500 text-sm mt-1">{onboardingErrors.termsAccepted}</p>}
              </div>
            </div>
          );

        case 5:
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <CheckCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Review & Submit</h2>
                <p className="text-gray-600">Please review your information before submitting</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h3 className="font-medium text-gray-800 mb-2">Business Information</h3>
                    <p><strong>Name:</strong> {formData.restaurantName}</p>
                    <p><strong>Owner:</strong> {formData.ownerName}</p>
                    <p><strong>Type:</strong> {formData.businessType}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-800 mb-2">Contact Details</h3>
                    <p><strong>Phone:</strong> {formData.phoneNumber}</p>
                    <p><strong>Email:</strong> {formData.emailAddress}</p>
                    <p><strong>Pincode:</strong> {formData.pincode}</p>
                  </div>
                  
                  
                  <div>
                    <h3 className="font-medium text-gray-800 mb-2">Banking</h3>
                    <p><strong>Account:</strong> ***{formData.bankAccount.slice(-4)}</p>
                    <p><strong>IFSC:</strong> {formData.ifscCode}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <FileCheck className="w-6 h-6 text-blue-600 mr-3" />
                  <div>
                    <h3 className="font-medium text-blue-800">What happens next?</h3>
                    <p className="text-blue-700 text-sm">Your application will be reviewed within 24-48 hours. You'll receive an email confirmation once approved.</p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={submitOnboarding}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting Application...
                  </span>
                ) : (
                  'Submit for Approval'
                )}
              </button>
            </div>
          );
        
        default:
          return null;
      }
    };

    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">TasteSphere</h1>
                <p className="text-sm text-gray-600">Partner Onboarding</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-50 px-6 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    onboardingStep >= step.number ? 'bg-orange-500 text-white' : 
                    onboardingStep > step.number ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {onboardingStep > step.number ? <CheckCircle className="w-6 h-6" /> : <step.icon className="w-5 h-5" />}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-1 ${onboardingStep > step.number ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              {steps.map(step => (
                <div key={step.number} className="flex-1 text-center">{step.title}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          {renderStep()}
          
          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={onboardingStep === 1}
              className="flex items-center px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Previous
            </button>
            
            {onboardingStep < 6 ? (
              <button
                onClick={nextStep}
                className="flex items-center px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
              >
                Next
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // PASSWORD STEP
  if (currentStep === 'password') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button
            onClick={() => setCurrentStep('otp')}
            className="flex items-center text-orange-600 mb-8 hover:text-orange-400 transition-colors"
            disabled={loading}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>

          <div className="text-center mb-8">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute w-full h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12">
                <RestaurantIcon />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-orange-600 mb-2">TasteSphere</h1>
            <p className="text-gray-600 font-medium mb-2">Seller Portal</p>
            <p className="text-gray-500 text-sm">Create a secure password</p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-6">
            <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password (6+ characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-orange-800 text-sm text-center">
                  🔒 Password must be at least 6 characters long
                </p>
              </div>

              <button
                type="submit"
                disabled={!isPasswordValid || !isConfirmPasswordValid || loading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  'Create Account & Continue'
                )}
              </button>
            </form>
          </div>

          <div className="text-center mt-6 text-xs text-gray-500">
            <p>Complete business setup in the next steps</p>
          </div>
        </div>
      </div>
    );
  }

  // OTP STEP
  if (currentStep === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button
            onClick={() => setCurrentStep('email')}
            className="flex items-center text-orange-600 mb-8 hover:text-orange-400 transition-colors"
            disabled={loading}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>

          <div className="text-center mb-8">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute w-full h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12">
                <RestaurantIcon />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-orange-600 mb-2">TasteSphere</h1>
            <p className="text-gray-600 font-medium mb-4">Seller Portal</p>
            <p className="text-gray-600 mb-4">
              Please enter the OTP sent to <br />
              <span className="font-semibold text-orange-500">{email}</span>{' '}
              <button
                onClick={handleChangeEmail}
                className="text-orange-500 hover:text-orange-600 transition-colors underline"
                disabled={loading}
              >
                Change
              </button>
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-center space-x-3 mb-8">
            {otp.map((digit, index) => (
              <input
                key={index}
                name={`seller-otp-${index}`}
                type="text"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg bg-white focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-50"
                maxLength={1}
                disabled={loading}
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={!isOtpComplete || loading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mb-6"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          <div className="text-center">
            <p className="text-gray-600 text-sm">
              Didn't receive the code?{' '}
              <button
                onClick={handleResendCode}
                disabled={loading}
                className="text-orange-500 hover:text-orange-600 transition-colors font-medium disabled:opacity-50 underline"
              >
                Resend OTP
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // EMAIL STEP (Default)
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button
          onClick={onBackToLogin}
          className="flex items-center text-orange-600 mb-8 hover:text-orange-400 transition-colors"
          disabled={loading}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        <div className="text-center mb-8">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute w-full h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12">
              <RestaurantIcon />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-orange-600 mb-2">TasteSphere</h1>
          <p className="text-gray-600 font-medium mb-2">Seller Portal</p>
          <p className="text-gray-500 text-sm">Create your business account</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6 mb-8">
          <input
            type="email"
            placeholder="Business Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
            required
          />
        </div>

        <button
          onClick={handleContinue}
          disabled={!email || loading}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending OTP...
            </span>
          ) : (
            'Continue'
          )}
        </button>

        <div className="text-center mt-6 text-xs text-gray-500">
          <p>Join thousands of businesses on TasteSphere</p>
        </div>
      </div>
    </div>
  );
};

export default SellerSignup;
