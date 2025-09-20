
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
  MapPin,
  Clock,
  Upload,
  Plus,
  Edit3,
  Trash2,
  Filter,
  Search,
  Bell,
  TrendingUp,
  Users,
  DollarSign,
  MessageCircle,
  Shield,
  UserPlus,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

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
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    businessName: '',
    businessType: 'Restaurant',
    phone: '',
    ownerName: '',
    description: '',
    cuisine: [],
    priceRange: 'mid-range',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    openingHours: {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '22:00', closed: false },
      saturday: { open: '09:00', close: '23:00', closed: false },
      sunday: { open: '10:00', close: '22:00', closed: false }
    }
  });
  
  const [dishForm, setDishForm] = useState({
    name: '',
    price: '',
    category: 'Main Course',
    type: 'veg',
    description: '',
    availability: true
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

  // API helper function
  const apiCall = async (endpoint, options = {}) => {
    const token = getAuthToken();
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...options
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  };

  // Load seller data on component mount
  useEffect(() => {
    loadSellerData();
    loadStats();
    loadDishes();
  }, []);

  const loadSellerData = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/seller/profile');
      setSellerData(response.seller);
      
      // Populate form with existing data
      if (response.seller) {
        setProfileForm({
          businessName: response.seller.businessName || '',
          businessType: response.seller.businessType || 'Restaurant',
          phone: response.seller.phone || '',
          ownerName: response.seller.businessDetails?.ownerName || '',
          description: response.seller.businessDetails?.description || '',
          cuisine: response.seller.businessDetails?.cuisine || [],
          priceRange: response.seller.businessDetails?.priceRange || 'mid-range',
          street: response.seller.address?.street || '',
          city: response.seller.address?.city || '',
          state: response.seller.address?.state || '',
          zipCode: response.seller.address?.zipCode || '',
          openingHours: response.seller.businessDetails?.openingHours || profileForm.openingHours
        });
      }
    } catch (err) {
      setError('Failed to load profile data');
      console.error('Load seller data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiCall('/seller/stats');
      setStats(response.stats);
    } catch (err) {
      console.error('Load stats error:', err);
    }
  };

  const loadDishes = async () => {
    try {
      const response = await apiCall('/seller/menu/dishes');
      setDishes(response.dishes);
    } catch (err) {
      console.error('Load dishes error:', err);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      
      const formData = new FormData();
      
      // Add text fields
      Object.keys(profileForm).forEach(key => {
        if (key === 'cuisine' && Array.isArray(profileForm[key])) {
          formData.append(key, profileForm[key].join(','));
        } else if (key === 'openingHours') {
          formData.append(key, JSON.stringify(profileForm[key]));
        } else {
          formData.append(key, profileForm[key]);
        }
      });

      // Add files if any
      const logoInput = document.querySelector('input[name="logo"]');
      const bannerInput = document.querySelector('input[name="bannerImage"]');
      
      if (logoInput?.files?.[0]) {
        formData.append('logo', logoInput.files[0]);
      }
      if (bannerInput?.files?.[0]) {
        formData.append('bannerImage', bannerInput.files[0]);
      }

      const response = await fetch(`${API_BASE}/seller/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Update failed');
      }

      setSuccess('Profile updated successfully!');
      setSellerData(data.seller);
      closeModal();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDish = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      
      const formData = new FormData();
      
      // Add dish data
      Object.keys(dishForm).forEach(key => {
        formData.append(key, dishForm[key]);
      });

      // Add dish image if any
      const imageInput = document.querySelector('input[name="dishImage"]');
      if (imageInput?.files?.[0]) {
        formData.append('dishImages', imageInput.files[0]);
      }

      const response = await fetch(`${API_BASE}/seller/menu/dish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add dish');
      }

      setSuccess('Dish added successfully!');
      setDishForm({
        name: '',
        price: '',
        category: 'Main Course',
        type: 'veg',
        description: '',
        availability: true
      });
      loadDishes();
      closeModal();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type) => {
    setModalType(type);
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setError('');
    setSuccess('');
  };

  const Modal = ({ children }) => (
    showModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">
              {modalType === 'dish' && 'Add New Dish'}
              {modalType === 'restaurant' && 'Edit Restaurant Details'}
              {modalType === 'offer' && 'Create New Offer'}
            </h3>
            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6">
            {error && (
              <div className="mb-4 flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-4 flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span>{success}</span>
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    )
  );

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

  const renderOverview = () => (
    <div className="space-y-8">
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <span className="ml-2 text-gray-600">Loading dashboard...</span>
        </div>
      )}
      
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
          value={stats?.totalDishes || 0} 
          icon={ChefHat} 
          color="bg-purple-500" 
          bgColor="bg-white"
        />
        <StatsCard 
          title="Rating" 
          value={stats?.averageRating || '0.0'} 
          icon={Star} 
          color="bg-yellow-500" 
          bgColor="bg-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No recent orders</p>
              <p className="text-sm text-gray-400 mt-1">Orders will appear here when customers place them</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6 space-y-4">
            <button 
              onClick={() => openModal('dish')}
              className="w-full flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:bg-orange-50 hover:border-orange-200 transition-all group"
            >
              <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                <Plus className="w-5 h-5 text-orange-600" />
              </div>
              <span className="font-medium text-gray-700 group-hover:text-purple-700">Update Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Restaurant Profile</h2>
        <button 
          onClick={() => openModal('restaurant')}
          className="inline-flex items-center px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Edit3 className="w-4 h-4 mr-2" />
          )}
          Edit Profile
        </button>
      </div>

      {sellerData && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Restaurant Name</label>
                  <p className="text-lg text-gray-900">{sellerData.businessName || 'Not set'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Business Type</label>
                  <p className="text-gray-900">{sellerData.businessType || 'Not set'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cuisine Types</label>
                  <div className="flex flex-wrap gap-2">
                    {sellerData.businessDetails?.cuisine?.map((cuisine, index) => (
                      <span key={index} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                        {cuisine}
                      </span>
                    )) || <span className="text-gray-500">Not set</span>}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                  <p className="text-gray-900">{sellerData.fullAddress || 'Address not complete'}</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Restaurant Logo</label>
                  {sellerData.businessDetails?.documents?.logo ? (
                    <img 
                      src={`http://localhost:5000${sellerData.businessDetails.documents.logo}`}
                      alt="Restaurant Logo"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">No logo</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Banner Image</label>
                  {sellerData.businessDetails?.documents?.bannerImage ? (
                    <img 
                      src={`http://localhost:5000${sellerData.businessDetails.documents.bannerImage}`}
                      alt="Restaurant Banner"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">No banner image</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderMenu = () => (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Menu Management</h2>
        <button 
          onClick={() => openModal('dish')}
          className="inline-flex items-center px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Dish
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search dishes..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              />
            </div>
            <select className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors">
              <option value="">All Categories</option>
              <option value="starters">Starters</option>
              <option value="main">Main Course</option>
              <option value="beverages">Beverages</option>
              <option value="desserts">Desserts</option>
            </select>
          </div>
        </div>

        <div className="p-8">
          {dishes.length === 0 ? (
            <div className="text-center py-16">
              <ChefHat className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-lg font-semibold text-gray-500 mb-2">No dishes added yet</h3>
              <p className="text-gray-400 mb-6">Start building your menu by adding your first dish</p>
              <button 
                onClick={() => openModal('dish')}
                className="inline-flex items-center px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Dish
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dishes.map((dish) => (
                <div key={dish._id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  {dish.image && (
                    <img 
                      src={`http://localhost:5000${dish.image}`}
                      alt={dish.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{dish.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${
                        dish.type === 'veg' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {dish.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{dish.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-orange-600">₹{dish.price}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        dish.availability ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {dish.availability ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDishModal = () => (
    <form onSubmit={handleAddDish} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Dish Name *</label>
            <input
              type="text"
              value={dishForm.name}
              onChange={(e) => setDishForm({...dishForm, name: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              placeholder="Enter dish name"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Price (₹) *</label>
              <input
                type="number"
                value={dishForm.price}
                onChange={(e) => setDishForm({...dishForm, price: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Category *</label>
              <select 
                value={dishForm.category}
                onChange={(e) => setDishForm({...dishForm, category: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                required
              >
                <option value="Starters">Starters</option>
                <option value="Main Course">Main Course</option>
                <option value="Beverages">Beverages</option>
                <option value="Desserts">Desserts</option>
                <option value="Chinese">Chinese</option>
                <option value="Indian">Indian</option>
                <option value="Continental">Continental</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Type</label>
            <select 
              value={dishForm.type}
              onChange={(e) => setDishForm({...dishForm, type: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            >
              <option value="veg">Vegetarian</option>
              <option value="non-veg">Non-Vegetarian</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Description</label>
            <textarea
              value={dishForm.description}
              onChange={(e) => setDishForm({...dishForm, description: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors resize-none"
              rows="4"
              placeholder="Enter dish description"
            ></textarea>
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Dish Image</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Upload dish image</p>
              <p className="text-sm text-gray-400 mt-1">PNG, JPG up to 5MB</p>
              <input
                type="file"
                name="dishImage"
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-700">Availability</h4>
                <p className="text-sm text-gray-500">Make dish available for orders</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={dishForm.availability}
                  onChange={(e) => setDishForm({...dishForm, availability: e.target.checked})}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={closeModal}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
          disabled={loading}
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
              Adding...
            </>
          ) : (
            'Add Dish'
          )}
        </button>
      </div>
    </form>
  );

  const renderProfileModal = () => (
    <form onSubmit={handleProfileUpdate} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Restaurant Name *</label>
            <input
              type="text"
              value={profileForm.businessName}
              onChange={(e) => setProfileForm({...profileForm, businessName: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              placeholder="Enter restaurant name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Business Type</label>
            <select 
              value={profileForm.businessType}
              onChange={(e) => setProfileForm({...profileForm, businessType: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            >
              <option value="Restaurant">Restaurant</option>
              <option value="Café">Café</option>
              <option value="Fast Food">Fast Food</option>
              <option value="Cloud Kitchen">Cloud Kitchen</option>
              <option value="Bakery">Bakery</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Owner Name</label>
            <input
              type="text"
              value={profileForm.ownerName}
              onChange={(e) => setProfileForm({...profileForm, ownerName: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              placeholder="Enter owner name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Phone Number</label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              placeholder="Enter phone number"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Description</label>
            <textarea
              value={profileForm.description}
              onChange={(e) => setProfileForm({...profileForm, description: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors resize-none"
              rows="4"
              placeholder="Describe your restaurant"
            ></textarea>
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Logo Upload</label>
            <input type="file" name="logo" accept="image/*" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Banner Image</label>
            <input type="file" name="bannerImage" accept="image/*" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Address</label>
            <input
              type="text"
              value={profileForm.street}
              onChange={(e) => setProfileForm({...profileForm, street: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors mb-3"
              placeholder="Street address"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={profileForm.city}
                onChange={(e) => setProfileForm({...profileForm, city: e.target.value})}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                placeholder="City"
              />
              <input
                type="text"
                value={profileForm.zipCode}
                onChange={(e) => setProfileForm({...profileForm, zipCode: e.target.value})}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                placeholder="ZIP Code"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={closeModal}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
          disabled={loading}
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview': return renderOverview();
      case 'profile': return renderProfile();
      case 'menu': return renderMenu();
      case 'orders': return <div className="text-center py-20"><ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">Orders section will be implemented</p></div>;
      case 'reservations': return <div className="text-center py-20"><Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">Reservations section will be implemented</p></div>;
      case 'payments': return <div className="text-center py-20"><CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">Payments section will be implemented</p></div>;
      case 'analytics': return <div className="text-center py-20"><BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">Analytics section will be implemented</p></div>;
      case 'reviews': return <div className="text-center py-20"><Star className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">Reviews section will be implemented</p></div>;
      case 'offers': return <div className="text-center py-20"><Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">Offers section will be implemented</p></div>;
      case 'settings': return <div className="text-center py-20"><Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">Settings section will be implemented</p></div>;
      default: return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
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

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {sellerData?.businessDetails?.ownerName || 'Restaurant Owner'}
                </p>
                <p className="text-xs text-gray-500 truncate">{sellerData?.email || 'owner@restaurant.com'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  {sellerData?.businessDetails?.ownerName || 'Restaurant Owner'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          {renderContent()}
        </main>
      </div>

      <Modal>
        {modalType === 'dish' && renderDishModal()}
        {modalType === 'restaurant' && renderProfileModal()}
      </Modal>
    </div>
  );
};

export default SellerDashboard;