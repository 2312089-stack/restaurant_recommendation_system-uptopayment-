import React, { useState, useEffect } from 'react';
import {
  Tag, X, Plus, Edit3, Trash2, Calendar, Percent, 
  Save, Loader2, AlertCircle, CheckCircle, TrendingUp,
  Clock, DollarSign, Target, Filter, Search, ArrowLeft
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const OfferManagementModal = ({ onBack }) => {
  const [offers, setOffers] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [offerForm, setOfferForm] = useState({
    dishId: '',
    hasOffer: true,
    discountPercentage: 0,
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const getAuthToken = () => localStorage.getItem('sellerToken') || localStorage.getItem('token');

  useEffect(() => {
    loadDishes();
  }, []);

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

  const loadDishes = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      const response = await fetch(`${API_BASE}/seller/menu/dishes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setDishes(data.dishes || []);
        
        // Extract offers from dishes
        const dishOffers = data.dishes
          .filter(dish => dish.offer?.hasOffer)
          .map(dish => ({
            ...dish.offer,
            dishId: dish._id,
            dishName: dish.name,
            dishPrice: dish.price,
            dishImage: dish.image,
            dishCategory: dish.category
          }));
        
        setOffers(dishOffers);
      } else {
        setError(data.error || 'Failed to load dishes');
      }
    } catch (err) {
      console.error('Load dishes error:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = getAuthToken();
      
      if (!offerForm.dishId) {
        setError('Please select a dish');
        setLoading(false);
        return;
      }

      if (offerForm.discountPercentage < 5 || offerForm.discountPercentage > 70) {
        setError('Discount must be between 5% and 70%');
        setLoading(false);
        return;
      }

      const requestBody = {
        hasOffer: true,
        discountPercentage: parseInt(offerForm.discountPercentage),
        validUntil: new Date(offerForm.validUntil).toISOString()
      };

      const response = await fetch(
        `${API_BASE}/seller/menu/dish/${offerForm.dishId}/offer`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(editingOffer ? 'Offer updated successfully!' : 'Offer created successfully!');
        setShowModal(false);
        resetForm();
        await loadDishes();
      } else {
        setError(data.error || 'Failed to save offer');
      }
    } catch (err) {
      console.error('Create offer error:', err);
      setError('Failed to create offer: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOffer = async (dishId) => {
    if (!window.confirm('Are you sure you want to remove this offer?')) return;

    try {
      setLoading(true);
      const token = getAuthToken();

      const response = await fetch(
        `${API_BASE}/seller/menu/dish/${dishId}/offer`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            hasOffer: false,
            discountPercentage: 0,
            validUntil: null
          })
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Offer removed successfully!');
        await loadDishes();
      } else {
        setError(data.error || 'Failed to remove offer');
      }
    } catch (err) {
      console.error('Delete offer error:', err);
      setError('Failed to remove offer');
    } finally {
      setLoading(false);
    }
  };

  const handleEditOffer = (offer) => {
    setEditingOffer(offer);
    setOfferForm({
      dishId: offer.dishId,
      hasOffer: true,
      discountPercentage: offer.discountPercentage,
      validUntil: new Date(offer.validUntil).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setOfferForm({
      dishId: '',
      hasOffer: true,
      discountPercentage: 0,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setEditingOffer(null);
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    return `http://localhost:5000/${cleanPath}`;
  };

  const calculateDiscountedPrice = (price, percentage) => {
    return Math.round(price - (price * percentage / 100));
  };

  const isOfferExpiringSoon = (validUntil) => {
    const daysLeft = Math.floor((new Date(validUntil) - new Date()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 2;
  };

  const getTimeLeft = (validUntil) => {
    const timeLeft = new Date(validUntil) - new Date();
    const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (daysLeft > 0) return `${daysLeft} day${daysLeft > 1 ? 's' : ''} left`;
    if (hoursLeft > 0) return `${hoursLeft} hour${hoursLeft > 1 ? 's' : ''} left`;
    return 'Expiring soon';
  };

  // Filter and search offers
  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.dishName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'active') {
      return matchesSearch && new Date(offer.validUntil) > new Date();
    } else if (filterStatus === 'expiring') {
      return matchesSearch && isOfferExpiringSoon(offer.validUntil);
    } else if (filterStatus === 'expired') {
      return matchesSearch && new Date(offer.validUntil) <= new Date();
    }
    
    return matchesSearch;
  });

  // Calculate statistics
  const stats = {
    total: offers.length,
    active: offers.filter(o => new Date(o.validUntil) > new Date()).length,
    expiring: offers.filter(o => isOfferExpiringSoon(o.validUntil)).length,
    avgDiscount: offers.length > 0 
      ? Math.round(offers.reduce((sum, o) => sum + o.discountPercentage, 0) / offers.length)
      : 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Offer Management</h2>
            <p className="text-sm text-gray-500 mt-1">Create and manage special offers for your dishes</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          Create New Offer
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800 font-medium">{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800 font-medium">{error}</span>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Offers</span>
            <Tag className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Active Offers</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Expiring Soon</span>
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.expiring}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Avg. Discount</span>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.avgDiscount}%</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search offers by dish name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Offers</option>
              <option value="active">Active</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Offers List */}
      {loading && offers.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500 mr-2" />
          <span className="text-gray-500">Loading offers...</span>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">
            {offers.length === 0 ? 'No offers created yet' : 'No offers match your search'}
          </h3>
          <p className="text-gray-400 mb-6">
            {offers.length === 0 
              ? 'Create your first offer to attract more customers'
              : 'Try adjusting your search or filter criteria'}
          </p>
          {offers.length === 0 && (
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              Create First Offer
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map((offer) => {
            const isExpired = new Date(offer.validUntil) <= new Date();
            const isExpiring = isOfferExpiringSoon(offer.validUntil);
            const discountedPrice = calculateDiscountedPrice(offer.dishPrice, offer.discountPercentage);

            return (
              <div
                key={offer.dishId}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                  isExpired ? 'opacity-60 border-gray-300' : 'border-gray-100'
                }`}
              >
                {/* Dish Image with Discount Badge */}
                <div className="relative h-48 bg-gray-100">
                  {offer.dishImage ? (
                    <img
                      src={getImageUrl(offer.dishImage)}
                      alt={offer.dishName}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tag className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg">
                      {offer.discountPercentage}% OFF
                    </div>
                  </div>
                  {isExpiring && !isExpired && (
                    <div className="absolute top-2 left-2">
                      <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expiring Soon
                      </div>
                    </div>
                  )}
                  {isExpired && (
                    <div className="absolute top-2 left-2">
                      <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Expired
                      </div>
                    </div>
                  )}
                </div>

                {/* Offer Details */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{offer.dishName}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {offer.dishCategory}
                    </span>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-green-600">
                        ₹{discountedPrice}
                      </span>
                      <span className="text-sm text-gray-400 line-through">
                        ₹{offer.dishPrice}
                      </span>
                    </div>
                    <div className="text-sm text-orange-600 font-medium">
                      Save ₹{offer.dishPrice - discountedPrice}
                    </div>
                  </div>

                  {/* Time Left */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{getTimeLeft(offer.validUntil)}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleEditOffer(offer)}
                      disabled={loading || isExpired}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteOffer(offer.dishId)}
                      disabled={loading}
                      className="flex items-center justify-center px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Offer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-t-xl">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {editingOffer ? 'Edit Offer' : 'Create New Offer'}
                    </h3>
                    <p className="text-sm text-white text-opacity-90">
                      {editingOffer ? 'Update offer details' : 'Set up a special discount'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateOffer} className="p-6 space-y-5">
              {/* Dish Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Dish *
                </label>
                <select
                  value={offerForm.dishId}
                  onChange={(e) => setOfferForm(prev => ({ ...prev, dishId: e.target.value }))}
                  disabled={editingOffer}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
                  required
                >
                  <option value="">Choose a dish...</option>
                  {dishes.filter(d => d.availability && d.isActive).map(dish => (
                    <option key={dish._id} value={dish._id}>
                      {dish.name} - ₹{dish.price}
                    </option>
                  ))}
                </select>
              </div>

              {/* Discount Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Percent className="w-4 h-4 inline mr-1" />
                  Discount Percentage *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="5"
                    max="70"
                    step="5"
                    value={offerForm.discountPercentage}
                    onChange={(e) => setOfferForm(prev => ({
                      ...prev,
                      discountPercentage: Math.min(70, Math.max(0, parseInt(e.target.value) || 0))
                    }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-12"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 5%, Maximum 70%</p>

                <div className="flex gap-2 mt-2">
                  {[10, 20, 30, 50].map(percentage => (
                    <button
                      key={percentage}
                      type="button"
                      onClick={() => setOfferForm(prev => ({ ...prev, discountPercentage: percentage }))}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        offerForm.discountPercentage === percentage
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {percentage}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Valid Until */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Valid Until *
                </label>
                <input
                  type="date"
                  value={offerForm.validUntil}
                  onChange={(e) => setOfferForm(prev => ({ ...prev, validUntil: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />

                <div className="flex gap-2 mt-2">
                  {[
                    { label: '1 Week', days: 7 },
                    { label: '2 Weeks', days: 14 },
                    { label: '1 Month', days: 30 }
                  ].map(preset => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => {
                        const date = new Date();
                        date.setDate(date.getDate() + preset.days);
                        setOfferForm(prev => ({
                          ...prev,
                          validUntil: date.toISOString().split('T')[0]
                        }));
                      }}
                      className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expected Impact */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs font-medium text-green-800 mb-1">✨ Expected Impact</p>
                <p className="text-xs text-green-700">
                  Dishes with offers get <span className="font-semibold">2-3x more visibility</span> and
                  appear in special offer sections!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingOffer ? 'Update Offer' : 'Create Offer'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferManagementModal;