import React, { useState } from 'react';
import { ArrowLeft, Home, Briefcase, Plus, X, Save, Locate } from 'lucide-react';

const AddressForm = ({
  address,
  onSave,
  onCancel,
  isEdit = false
}) => {
  const [formData, setFormData] = useState({
    fullName: address?.fullName || '',
    phoneNumber: address?.phoneNumber || '',
    alternatePhone: address?.alternatePhone || '',
    pincode: address?.originalData?.pincode || address?.pincode || '',
    state: address?.originalData?.state || address?.state || '',
    city: address?.originalData?.city || address?.city || '',
    houseNo: address?.originalData?.houseNo || address?.houseNo || '',
    roadArea: address?.originalData?.roadArea || address?.roadArea || '',
    landmark: address?.landmark || '',
    type: address?.originalData?.type || address?.type?.toLowerCase() || 'home',
    isDefault: address?.isDefault || false,
  });

  const [showAlternatePhone, setShowAlternatePhone] = useState(!!address?.alternatePhone);
  const [showLandmark, setShowLandmark] = useState(!!address?.landmark);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    } else if (formData.fullName.trim().length > 100) {
      newErrors.fullName = 'Full name must be less than 100 characters';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^[+]?[\d\s-()]{10,15}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid phone number (10-15 digits)';
    }

    if (formData.alternatePhone && formData.alternatePhone.trim()) {
      if (!/^[+]?[\d\s-()]{10,15}$/.test(formData.alternatePhone.replace(/\s/g, ''))) {
        newErrors.alternatePhone = 'Please enter a valid alternate phone number';
      }
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^[0-9]{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Pincode must be exactly 6 digits';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    } else if (formData.state.trim().length < 2) {
      newErrors.state = 'State must be at least 2 characters';
    } else if (formData.state.trim().length > 50) {
      newErrors.state = 'State must be less than 50 characters';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    } else if (formData.city.trim().length < 2) {
      newErrors.city = 'City must be at least 2 characters';
    } else if (formData.city.trim().length > 50) {
      newErrors.city = 'City must be less than 50 characters';
    }

    if (!formData.houseNo.trim()) {
      newErrors.houseNo = 'House/Building number is required';
    } else if (formData.houseNo.trim().length > 200) {
      newErrors.houseNo = 'House number is too long';
    }

    if (!formData.roadArea.trim()) {
      newErrors.roadArea = 'Road/Area is required';
    } else if (formData.roadArea.trim().length > 200) {
      newErrors.roadArea = 'Road/Area is too long';
    }

    if (formData.landmark && formData.landmark.length > 200) {
      newErrors.landmark = 'Landmark is too long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      console.log('Form validation failed:', errors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const cleanedData = {
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        alternatePhone: formData.alternatePhone ? formData.alternatePhone.trim() : '',
        pincode: formData.pincode.trim(),
        state: formData.state.trim(),
        city: formData.city.trim(),
        houseNo: formData.houseNo.trim(),
        roadArea: formData.roadArea.trim(),
        landmark: formData.landmark ? formData.landmark.trim() : '',
        type: formData.type,
        isDefault: formData.isDefault
      };

      console.log('Submitting address data:', cleanedData);
      await onSave(cleanedData);
    } catch (error) {
      console.error('Form submission error:', error);
      
      if (error.message && error.message.includes('validation')) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to save address. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location detected:', position.coords);
          setFormData(prev => ({
            ...prev,
            pincode: '400001',
            state: 'Maharashtra',
            city: 'Mumbai'
          }));
        },
        (error) => {
          console.error('Location error:', error);
          setFormData(prev => ({
            ...prev,
            pincode: '400001',
            state: 'Maharashtra', 
            city: 'Mumbai'
          }));
        }
      );
    } else {
      setFormData(prev => ({
        ...prev,
        pincode: '400001',
        state: 'Maharashtra',
        city: 'Mumbai'
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          type="button"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Address' : 'Add New Address'}
        </h1>
      </div>

      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="text-sm">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                errors.fullName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your full name"
              maxLength={100}
            />
            {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your phone number"
              maxLength={15}
            />
            {errors.phoneNumber && <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>}
            
            {!showAlternatePhone && (
              <button
                type="button"
                onClick={() => setShowAlternatePhone(true)}
                className="flex items-center space-x-1 text-orange-500 text-sm mt-2 hover:text-orange-600"
              >
                <Plus className="w-4 h-4" />
                <span>Add Alternate Phone Number</span>
              </button>
            )}
          </div>

          {/* Alternate Phone */}
          {showAlternatePhone && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Alternate Phone Number
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowAlternatePhone(false);
                    handleInputChange('alternatePhone', '');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="tel"
                value={formData.alternatePhone}
                onChange={(e) => handleInputChange('alternatePhone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.alternatePhone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter alternate phone number"
                maxLength={15}
              />
              {errors.alternatePhone && <p className="text-red-500 text-sm mt-1">{errors.alternatePhone}</p>}
            </div>
          )}

          {/* Pincode and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pincode <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => handleInputChange('pincode', e.target.value.replace(/\D/g, ''))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.pincode ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter pincode"
                maxLength={6}
              />
              {errors.pincode && <p className="text-red-500 text-sm mt-1">{errors.pincode}</p>}
            </div>
            
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleUseLocation}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
              >
                <Locate className="w-4 h-4" />
                <span>Use My Location</span>
              </button>
            </div>
          </div>

          {/* State and City */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.state ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter state"
                maxLength={50}
              />
              {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.city ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter city"
                maxLength={50}
              />
              {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
            </div>
          </div>

          {/* House Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              House No., Building Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.houseNo}
              onChange={(e) => handleInputChange('houseNo', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                errors.houseNo ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="House No., Building Name"
              maxLength={200}
            />
            {errors.houseNo && <p className="text-red-500 text-sm mt-1">{errors.houseNo}</p>}
          </div>

          {/* Road/Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Road name, Area, Colony <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.roadArea}
              onChange={(e) => handleInputChange('roadArea', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                errors.roadArea ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Road name, Area, Colony"
              maxLength={200}
            />
            {errors.roadArea && <p className="text-red-500 text-sm mt-1">{errors.roadArea}</p>}
            
            {!showLandmark && (
              <button
                type="button"
                onClick={() => setShowLandmark(true)}
                className="flex items-center space-x-1 text-orange-500 text-sm mt-2 hover:text-orange-600"
              >
                <Plus className="w-4 h-4" />
                <span>Add Nearby Famous Shop/Mall/Landmark</span>
              </button>
            )}
          </div>

          {/* Landmark */}
          {showLandmark && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Nearby Famous Shop/Mall/Landmark
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowLandmark(false);
                    handleInputChange('landmark', '');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={formData.landmark}
                onChange={(e) => handleInputChange('landmark', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.landmark ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Near Phoenix Mall, Opposite McDonald's"
                maxLength={200}
              />
              {errors.landmark && <p className="text-red-500 text-sm mt-1">{errors.landmark}</p>}
            </div>
          )}

          {/* Address Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type of Address
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => handleInputChange('type', 'home')}
                className={`flex items-center space-x-2 px-4 py-3 border-2 rounded-lg transition-colors ${
                  formData.type === 'home' 
                    ? 'border-orange-500 bg-orange-50 text-orange-700' 
                    : 'border-gray-300 hover:border-orange-300 text-gray-700'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Home</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleInputChange('type', 'work')}
                className={`flex items-center space-x-2 px-4 py-3 border-2 rounded-lg transition-colors ${
                  formData.type === 'work' 
                    ? 'border-orange-500 bg-orange-50 text-orange-700' 
                    : 'border-gray-300 hover:border-orange-300 text-gray-700'
                }`}
              >
                <Briefcase className="w-5 h-5" />
                <span className="font-medium">Work</span>
              </button>

              <button
                type="button"
                onClick={() => handleInputChange('type', 'other')}
                className={`flex items-center space-x-2 px-4 py-3 border-2 rounded-lg transition-colors ${
                  formData.type === 'other' 
                    ? 'border-orange-500 bg-orange-50 text-orange-700' 
                    : 'border-gray-300 hover:border-orange-300 text-gray-700'
                }`}
              >
                <span className="font-medium">Other</span>
              </button>
            </div>
          </div>

          {/* Default Address Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => handleInputChange('isDefault', e.target.checked)}
              className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
            />
            <label htmlFor="isDefault" className="text-sm font-medium text-gray-700 cursor-pointer">
              Set as default address
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex space-x-4 pt-6 mt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEdit ? 'Update Address' : 'Save Address'}</span>
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddressForm;