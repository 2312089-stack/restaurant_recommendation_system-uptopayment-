import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  Home,
  User,
  ChefHat,
  ShoppingBag,
  Calendar,
  CreditCard,
  BarChart3,
  Star,
  Tag,
  Settings,
  Upload,
  Plus,
  Edit3,
  Trash2,
  Bell,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  MapPin,
  Clock,
  Camera,
  Save,
  Building,
  Phone,
  Mail,
  Globe,
  MessageCircle,
  Reply,
  Filter,
  TrendingUp,
  Award,
  ThumbsUp,
  Send
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

// FIXED: Helper function to construct correct image URLs
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // Remove any leading slashes and construct proper URL
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  
  // Return direct server URL without /api prefix for static files
  return `http://localhost:5000/${cleanPath}`;
};

const SellerDashboard = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [sellerData, setSellerData] = useState(null);
  const [stats, setStats] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [editingDish, setEditingDish] = useState(null);
  
  // Review states
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewStats, setReviewStats] = useState(null);
  const [reviewFilter, setReviewFilter] = useState('all');
  const [reviewSort, setReviewSort] = useState('newest');
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState('');

  // Form states
  const [dishForm, setDishForm] = useState({
    name: '',
    price: '',
    category: 'Main Course',
    type: 'veg',
    description: '',
    availability: true,
    preparationTime: 30
  });

  const [profileForm, setProfileForm] = useState({
    businessName: '',
    businessType: 'Restaurant',
    ownerName: '',
    phone: '',
    email: '',
    description: '',
    cuisine: [],
    priceRange: 'mid-range',
    seatingCapacity: '',
    servicesOffered: [],
    street: '',
    city: '',
    state: '',
    zipCode: '',
    latitude: '',
    longitude: '',
    openingHours: {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '22:00', closed: false },
      saturday: { open: '09:00', close: '22:00', closed: false },
      sunday: { open: '09:00', close: '22:00', closed: false }
    }
  });

  // File states for image uploads
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [profileImages, setProfileImages] = useState({
    logo: null,
    bannerImage: null
  });
  const [profileImagePreviews, setProfileImagePreviews] = useState({
    logo: null,
    bannerImage: null
  });

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'profile', label: 'Restaurant Profile', icon: User },
    { id: 'menu', label: 'Menu Management', icon: ChefHat },
    { id: 'orders', label: 'Order Management', icon: ShoppingBag },
    { id: 'reservations', label: 'Dining Reservations', icon: Calendar },
    { id: 'payments', label: 'Payments & Settlements', icon: CreditCard },
    { id: 'analytics', label: 'Analytics & Insights', icon: BarChart3 },
    { id: 'reviews', label: 'Reviews & Ratings', icon: Star },
    { id: 'offers', label: 'Offers & Notifications', icon: Tag },
    { id: 'settings', label: 'Settings & Support', icon: Settings }
  ];

  // Get token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('sellerToken') || localStorage.getItem('token');
  };

  // Load data on component mount
  useEffect(() => {
    loadSellerData();
    loadStats();
    loadDishes();
  }, []);

  // Load reviews when reviews section is active
  useEffect(() => {
    if (activeSection === 'reviews') {
      loadReviews();
    }
  }, [activeSection, reviewFilter, reviewSort]);

  // Clear messages after timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Load seller data
  const loadSellerData = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login to continue');
        return;
      }
      
      const response = await fetch(`${API_BASE}/seller/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok) {
        setSellerData(data.seller);
        // Populate profile form with existing data
        const seller = data.seller;
        setProfileForm({
          businessName: seller.businessName || '',
          businessType: seller.businessType || 'Restaurant',
          ownerName: seller.businessDetails?.ownerName || '',
          phone: seller.phone || '',
          email: seller.email || '',
          description: seller.businessDetails?.description || '',
          cuisine: seller.businessDetails?.cuisine || [],
          priceRange: seller.businessDetails?.priceRange || 'mid-range',
          seatingCapacity: seller.businessDetails?.seatingCapacity || '',
          servicesOffered: seller.businessDetails?.servicesOffered || [],
          street: seller.address?.street || '',
          city: seller.address?.city || '',
          state: seller.address?.state || '',
          zipCode: seller.address?.zipCode || '',
          latitude: seller.address?.coordinates?.latitude || '',
          longitude: seller.address?.coordinates?.longitude || '',
          openingHours: seller.businessDetails?.openingHours || {
            monday: { open: '09:00', close: '22:00', closed: false },
            tuesday: { open: '09:00', close: '22:00', closed: false },
            wednesday: { open: '09:00', close: '22:00', closed: false },
            thursday: { open: '09:00', close: '22:00', closed: false },
            friday: { open: '09:00', close: '22:00', closed: false },
            saturday: { open: '09:00', close: '22:00', closed: false },
            sunday: { open: '09:00', close: '22:00', closed: false }
          }
        });
      } else {
        setError(data.error || 'Failed to load profile');
      }
    } catch (err) {
      console.error('Load seller data error:', err);
      setError('Failed to connect to server');
    }
  };

  const loadStats = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/seller/menu/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok) {
        setStats(data.stats?.overview || {});
      }
    } catch (err) {
      console.error('Load stats error:', err);
    }
  };

  const loadDishes = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/seller/menu/dishes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load dishes');
      }
      setDishes(data.dishes || []);
    } catch (err) {
      console.error('Load dishes error:', err);
      setError('Failed to load dishes');
    }
  };

  // Load reviews for seller
  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const token = getAuthToken();
      
      const response = await fetch(`${API_BASE}/reviews/seller/reviews?rating=${reviewFilter}&sort=${reviewSort}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok) {
        setReviews(data.reviews || []);
        setReviewStats(data.stats || {});
      } else {
        setError(data.error || 'Failed to load reviews');
      }
    } catch (err) {
      console.error('Load reviews error:', err);
      setError('Failed to load reviews');
    } finally {
      setReviewsLoading(false);
    }
  };

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = getAuthToken();
      const formData = new FormData();

      // Append all profile form fields
      Object.keys(profileForm).forEach(key => {
        if (key === 'cuisine' || key === 'servicesOffered') {
          if (Array.isArray(profileForm[key])) {
            profileForm[key].forEach(item => formData.append(key, item));
          }
        } else if (key === 'openingHours') {
          formData.append(key, JSON.stringify(profileForm[key]));
        } else {
          formData.append(key, profileForm[key]);
        }
      });

      // Append images if selected
      if (profileImages.logo) {
        formData.append('logo', profileImages.logo);
      }
      if (profileImages.bannerImage) {
        formData.append('bannerImage', profileImages.bannerImage);
      }

      const response = await fetch(`${API_BASE}/seller/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Profile updated successfully!');
        await loadSellerData(); // Reload profile data
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle dish form submission
  const handleDishSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = getAuthToken();
      const formData = new FormData();
      
      // Append dish form data
      Object.keys(dishForm).forEach(key => {
        formData.append(key, dishForm[key]);
      });
      
      // Append image if selected
      if (selectedFile) {
        formData.append('dishImages', selectedFile);
      }

      const url = editingDish 
        ? `${API_BASE}/seller/menu/dish/${editingDish._id}`
        : `${API_BASE}/seller/menu/dish`;
        
      const method = editingDish ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(editingDish ? 'Dish updated successfully!' : 'Dish added successfully!');
        resetDishForm();
        loadDishes();
        setShowModal(false);
      } else {
        setError(data.error || 'Failed to save dish');
      }
    } catch (err) {
      console.error('Dish submission error:', err);
      setError('Failed to save dish');
    } finally {
      setLoading(false);
    }
  };

  // Handle dish deletion
  const handleDeleteDish = async (dishId) => {
    if (!window.confirm('Are you sure you want to delete this dish?')) {
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();
      
      const response = await fetch(`${API_BASE}/seller/menu/dish/${dishId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Dish deleted successfully!');
        loadDishes();
      } else {
        setError(data.error || 'Failed to delete dish');
      }
    } catch (err) {
      console.error('Delete dish error:', err);
      setError('Failed to delete dish');
    } finally {
      setLoading(false);
    }
  };

  // Reset dish form
  const resetDishForm = () => {
    setDishForm({
      name: '',
      price: '',
      category: 'Main Course',
      type: 'veg',
      description: '',
      availability: true,
      preparationTime: 30
    });
    setSelectedFile(null);
    setImagePreview(null);
    setEditingDish(null);
  };

  // FIXED: Handle image file selection
  const handleImageSelect = (event, type = 'dish') => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size should be less than 10MB');
      return;
    }

    // Validate file type - allow any image type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    if (type === 'dish') {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else if (type === 'logo' || type === 'bannerImage') {
      setProfileImages(prev => ({ ...prev, [type]: file }));
      setProfileImagePreviews(prev => ({ ...prev, [type]: URL.createObjectURL(file) }));
    }

    // Clear any existing errors
    if (error) setError('');
  };

  // Star rating component
  const StarRating = ({ rating, size = 'sm' }) => {
    const starSize = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Stats card component
  const StatsCard = ({ title, value, icon: Icon, color, bgColor }) => (
    <div className={`${bgColor} p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  // Render Restaurant Profile section
  const renderProfile = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Restaurant Profile</h2>
        <div className="text-sm text-gray-500">
          Complete your profile to attract more customers
        </div>
      </div>

      <form onSubmit={handleProfileUpdate} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name *
              </label>
              <input
                type="text"
                value={profileForm.businessName}
                onChange={(e) => setProfileForm(prev => ({ ...prev, businessName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
              </label>
              <select
                value={profileForm.businessType}
                onChange={(e) => setProfileForm(prev => ({ ...prev, businessType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="Restaurant">Restaurant</option>
                <option value="Cafe">Cafe</option>
                <option value="Fast Food">Fast Food</option>
                <option value="Food Truck">Food Truck</option>
                <option value="Cloud Kitchen">Cloud Kitchen</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Owner Name *
              </label>
              <input
                type="text"
                value={profileForm.ownerName}
                onChange={(e) => setProfileForm(prev => ({ ...prev, ownerName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
          </div>
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Restaurant Description
            </label>
            <textarea
              value={profileForm.description}
              onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Tell customers about your restaurant..."
            />
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address *
              </label>
              <input
                type="text"
                value={profileForm.street}
                onChange={(e) => setProfileForm(prev => ({ ...prev, street: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <input
                type="text"
                value={profileForm.city}
                onChange={(e) => setProfileForm(prev => ({ ...prev, city: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State *
              </label>
              <input
                type="text"
                value={profileForm.state}
                onChange={(e) => setProfileForm(prev => ({ ...prev, state: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
          </div>
        </div>

        {/* FIXED: Restaurant Branding - Updated image handling */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Branding</h3>
          
          {/* Logo Upload */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant Logo
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Upload your restaurant logo (max 10MB)
              </p>
              
              <div className="flex items-start space-x-4">
                {/* Logo Preview - FIXED */}
                <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  {profileImagePreviews.logo || sellerData?.businessDetails?.documents?.logo ? (
                    <img
                      src={profileImagePreviews.logo || getImageUrl(sellerData?.businessDetails?.documents?.logo)}
                      alt="Restaurant Logo"
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        console.error('Logo image failed to load:', e.target.src);
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-center">
                      <Building className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                      <span className="text-xs text-gray-400">Logo</span>
                    </div>
                  )}
                </div>
                
                {/* Logo Upload Button */}
                <div className="flex-1">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e, 'logo')}
                    className="hidden"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Logo
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Any image format (max 10MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Banner Image Upload - FIXED */}
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banner Image
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Upload a banner image for your restaurant (max 10MB)
              </p>
              
              <div className="space-y-4">
                {/* Banner Preview - FIXED */}
                <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                  {profileImagePreviews.bannerImage || sellerData?.businessDetails?.documents?.bannerImage ? (
                    <img
                      src={profileImagePreviews.bannerImage || getImageUrl(sellerData?.businessDetails?.documents?.bannerImage)}
                      alt="Restaurant Banner"
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        console.error('Banner image failed to load:', e.target.src);
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-center">
                      <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-400">Upload banner image</span>
                      <p className="text-xs text-gray-400 mt-1">Showcase your restaurant</p>
                    </div>
                  )}
                </div>
                
                {/* Banner Upload Button */}
                <div>
                  <input
                    type="file"
                    id="banner-upload"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e, 'bannerImage')}
                    className="hidden"
                  />
                  <label
                    htmlFor="banner-upload"
                    className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Banner Image
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{loading ? 'Updating...' : 'Update Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );

  // Render Menu Management section
  const renderMenu = () => (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Menu Management</h2>
        <button
          onClick={() => {
            resetDishForm();
            setModalType('add');
            setShowModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Dish</span>
        </button>
      </div>

      {/* Dishes Grid - FIXED */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dishes.map((dish) => (
          <div key={dish._id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="relative h-48 bg-gray-100">
              {dish.image ? (
                <img
                  src={getImageUrl(dish.image)}
                  alt={dish.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Dish image failed to load:', e.target.src);
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  dish.availability ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {dish.availability ? 'Available' : 'Unavailable'}
                </span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 truncate">{dish.name}</h3>
                <span className={`w-3 h-3 rounded-full ${
                  dish.type === 'veg' ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{dish.description}</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-orange-600">₹{dish.price}</span>
                <span className="text-sm text-gray-500">{dish.category}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setEditingDish(dish);
                    setDishForm({
                      name: dish.name,
                      price: dish.price,
                      category: dish.category,
                      type: dish.type,
                      description: dish.description,
                      availability: dish.availability,
                      preparationTime: dish.preparationTime || 30
                    });
                    setModalType('edit');
                    setShowModal(true);
                  }}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteDish(dish._id)}
                  className="flex items-center justify-center px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {dishes.length === 0 && (
        <div className="text-center py-12">
          <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No dishes yet</h3>
          <p className="text-gray-400 mb-4">Start building your menu by adding your first dish</p>
          <button
            onClick={() => {
              resetDishForm();
              setModalType('add');
              setShowModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 mx-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Dish</span>
          </button>
        </div>
      )}
    </div>
  );

  // Render Overview section
  const renderOverview = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Today's Revenue" 
          value={`₹${stats?.todayRevenue || 0}`} 
          icon={DollarSign} 
          color="bg-green-500" 
          bgColor="bg-white"
        />
        <StatsCard 
          title="Active Orders" 
          value={stats?.activeOrders || 0} 
          icon={ShoppingBag} 
          color="bg-blue-500" 
          bgColor="bg-white"
        />
        <StatsCard 
          title="Total Dishes" 
          value={stats?.totalDishes || dishes.length || 0} 
          icon={ChefHat} 
          color="bg-purple-500" 
          bgColor="bg-white"
        />
        <StatsCard 
          title="Rating" 
          value={reviewStats?.averageRating?.toFixed(1) || '0.0'} 
          icon={Star} 
          color="bg-yellow-500" 
          bgColor="bg-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Reviews</h3>
          </div>
          <div className="p-6">
            {reviews.slice(0, 3).map((review) => (
              <div key={review._id} className="flex items-start space-x-3 mb-4 last:mb-0">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1 mb-1">
                    <StarRating rating={review.rating} size="sm" />
                    <span className="text-sm text-gray-500">{review.dishName}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{review.title}</p>
                </div>
              </div>
            ))}
            {reviews.length === 0 && (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No reviews yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6 space-y-4">
            <button 
              onClick={() => setActiveSection('menu')}
              className="w-full flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-all group"
            >
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-medium text-gray-700 group-hover:text-blue-700">Manage Menu</span>
            </button>

            <button 
              onClick={() => setActiveSection('reviews')}
              className="w-full flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:bg-yellow-50 hover:border-yellow-200 transition-all group"
            >
              <div className="p-2 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="font-medium text-gray-700 group-hover:text-yellow-700">Manage Reviews</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Reviews section
  const renderReviews = () => (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Reviews & Ratings</h2>
      </div>

      {/* Review Statistics */}
      {reviewStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500 mb-2">
                {reviewStats.averageRating || '0.0'}
              </div>
              <StarRating rating={Math.round(reviewStats.averageRating || 0)} size="md" />
              <p className="text-sm text-gray-500 mt-2">Average Rating</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500 mb-2">
                {reviewStats.totalReviews || 0}
              </div>
              <p className="text-sm text-gray-500">Total Reviews</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500 mb-2">
                {reviewStats.distribution ? reviewStats.distribution[5] + reviewStats.distribution[4] : 0}
              </div>
              <p className="text-sm text-gray-500">Positive Reviews</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-500 mb-2">
                {reviewStats.distribution ? Math.round(((reviewStats.distribution[5] + reviewStats.distribution[4]) / reviewStats.totalReviews) * 100) || 0 : 0}%
              </div>
              <p className="text-sm text-gray-500">Satisfaction Rate</p>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviewsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          <span className="ml-2 text-gray-500">Loading reviews...</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No reviews yet</h3>
          <p className="text-gray-400">Reviews from customers will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review._id} className="border-b border-gray-200 pb-6 last:border-b-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {review.anonymous ? 'Anonymous User' : (review.displayName || review.userName)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <StarRating rating={review.rating} size="sm" />
                        <span className="text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
                  <p className="text-gray-600 leading-relaxed">{review.comment}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Placeholder functions for other sections
  const renderPlaceholder = (title, IconComponent) => (
    <div className="text-center py-20">
      <IconComponent className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500">{title} section will be implemented</p>
    </div>
  );

  // Main content renderer
  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'profile':
        return renderProfile();
      case 'menu':
        return renderMenu();
      case 'reviews':
        return renderReviews();
      case 'orders':
        return renderPlaceholder('Orders', ShoppingBag);
      case 'reservations':
        return renderPlaceholder('Reservations', Calendar);
      case 'payments':
        return renderPlaceholder('Payments', CreditCard);
      case 'analytics':
        return renderPlaceholder('Analytics', BarChart3);
      case 'offers':
        return renderPlaceholder('Offers', Tag);
      case 'settings':
        return renderPlaceholder('Settings', Settings);
      default:
        return renderOverview();
    }
  };

  // Get seller display information
  const getSellerEmail = () => {
    return sellerData?.email || 'Loading...';
  };

  const getSellerDisplayName = () => {
    return sellerData?.businessDetails?.ownerName || 
           sellerData?.businessName || 
           sellerData?.email || 
           'Restaurant Owner';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Global Messages */}
      {success && (
        <div className="fixed top-4 right-4 z-50 flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-lg shadow-lg border border-green-200">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {error && (
        <div className="fixed top-4 right-4 z-50 flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg shadow-lg border border-red-200">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 
        transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        transition-transform duration-300 ease-in-out lg:translate-x-0 lg:transition-none
      `}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-orange-600">Seller Dashboard</h1>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {sidebarItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200
                    ${activeSection === item.id 
                      ? 'bg-orange-100 text-orange-700 border-orange-200 shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Fixed seller profile section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {getSellerDisplayName()}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {getSellerEmail()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Bell className="w-6 h-6 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer" />
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">0</span>
              </div>

              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-orange-600" />
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {getSellerDisplayName()}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          {renderContent()}
        </main>
      </div>

      {/* Add/Edit Dish Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {modalType === 'edit' ? 'Edit Dish' : 'Add New Dish'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleDishSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dish Name *
                  </label>
                  <input
                    type="text"
                    value={dishForm.name}
                    onChange={(e) => setDishForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={dishForm.price}
                    onChange={(e) => setDishForm(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={dishForm.category}
                    onChange={(e) => setDishForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  >
                    <option value="Starters">Starters</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Indian">Indian</option>
                    <option value="Continental">Continental</option>
                    <option value="South Indian">South Indian</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    value={dishForm.type}
                    onChange={(e) => setDishForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  >
                    <option value="veg">Vegetarian</option>
                    <option value="non-veg">Non-Vegetarian</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={dishForm.description}
                  onChange={(e) => setDishForm(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dish Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageSelect(e, 'dish')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-md"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="availability"
                  checked={dishForm.availability}
                  onChange={(e) => setDishForm(prev => ({ ...prev, availability: e.target.checked }))}
                  className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="availability" className="text-sm font-medium text-gray-700">
                  Available for orders
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{loading ? 'Saving...' : (modalType === 'edit' ? 'Update Dish' : 'Add Dish')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;