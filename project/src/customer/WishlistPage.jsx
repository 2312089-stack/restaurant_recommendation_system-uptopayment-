import React, { useState, useEffect } from "react";
import {
  Heart,
  Star,
  Clock,
  MapPin,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  Filter,
  Grid,
  List,
  ArrowLeft,
  Eye,
  Share2,
  BookmarkPlus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';

const WishlistPage = ({ onBack, onNavigateBack, onOpenCart, onAddToCart, onShareWishlist }) => {
  
  // Handle both prop names for flexibility
  const handleBack = onBack || onNavigateBack;
  
  // Wishlist and Cart contexts
  const { 
    items: wishlistItems, 
    loading: wishlistLoading, 
    error: wishlistError,
    removeFromWishlist, 
    clearWishlist,
    loadWishlist,
    itemCount 
  } = useWishlist();
  
  const { 
    addToCart, 
    loading: cartLoading, 
    clearCart 
  } = useCart();

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [processingItems, setProcessingItems] = useState(new Set());

  // Load wishlist on component mount
  useEffect(() => {
    loadWishlist();
  }, []);

  // Listen for wishlist updates from other parts of the app
  useEffect(() => {
    const handleWishlistUpdate = (event) => {
      console.log('Wishlist update event received:', event.detail);
      // Reload wishlist to get latest data
      loadWishlist(true);
    };

    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    return () => window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
  }, []);

  // Filter and search functionality
  const filteredItems = wishlistItems.filter(item => {
    if (!item) return false;
    
    const matchesSearch = 
      (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.restaurantName || item.restaurant || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterType === "all" || 
      (filterType === "veg" && item.type === 'veg') ||
      (filterType === "non-veg" && item.type === 'non-veg') ||
      (filterType === "available" && item.availability !== false) ||
      (filterType === "discounted" && item.offer?.hasOffer);
    
    return matchesSearch && matchesFilter;
  });

  // Show success message
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Show error message
  const showErrorMessage = (message) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 3000);
  };

  // Remove item from wishlist
  const handleRemoveFromWishlist = async (item) => {
    if (!item || (!item._id && !item.id)) return;
    
    const itemId = item._id || item.id;
    setProcessingItems(prev => new Set([...prev, itemId]));
    
    try {
      const result = await removeFromWishlist(itemId);
      
      if (result.success) {
        showSuccessMessage(`${item.name} removed from wishlist`);
        
        // Remove from selected items if it was selected
        setSelectedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      } else {
        showErrorMessage(result.error || 'Failed to remove item from wishlist');
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      showErrorMessage('Failed to remove item from wishlist');
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  // Add item to cart
  const handleAddToCart = async (item) => {
    if (!item || (!item._id && !item.id)) return;
    if (item.availability === false) return;
    
    const itemId = item._id || item.id;
    setProcessingItems(prev => new Set([...prev, `cart-${itemId}`]));
    
    try {
      const result = await addToCart(itemId, 1);
      
      if (result.success) {
        showSuccessMessage(`${item.name} added to cart!`);
        
        // Trigger cart update event
        window.dispatchEvent(new CustomEvent('cartUpdated', { 
          detail: { 
            action: 'add',
            dishId: itemId,
            dishName: item.name
          } 
        }));
        
      } else {
        if (result.action === 'clear_cart_required') {
          const shouldClear = window.confirm(
            `${result.error}\n\nWould you like to clear your current cart and add this item instead?`
          );
          
          if (shouldClear) {
            try {
              const clearResult = await clearCart();
              if (clearResult.success) {
                const addResult = await addToCart(itemId, 1);
                if (addResult.success) {
                  showSuccessMessage(`Cart cleared and ${item.name} added!`);
                } else {
                  throw new Error(addResult.error || 'Failed to add item after clearing cart');
                }
              } else {
                throw new Error(clearResult.error || 'Failed to clear cart');
              }
            } catch (clearError) {
              console.error('Error during cart clear and add:', clearError);
              showErrorMessage(`Failed to clear cart and add item: ${clearError.message}`);
            }
          }
        } else {
          showErrorMessage(result.error || 'Failed to add to cart');
        }
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      showErrorMessage(`Failed to add to cart: ${error.message || 'Unknown error'}`);
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(`cart-${itemId}`);
        return newSet;
      });
    }
  };

  // Toggle item selection
  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Remove selected items
  const handleRemoveSelectedItems = async () => {
    if (selectedItems.size === 0) return;
    
    const shouldRemove = window.confirm(
      `Are you sure you want to remove ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''} from your wishlist?`
    );
    
    if (!shouldRemove) return;
    
    const itemsToRemove = filteredItems.filter(item => 
      selectedItems.has(item._id || item.id)
    );
    
    for (const item of itemsToRemove) {
      await handleRemoveFromWishlist(item);
    }
    
    setSelectedItems(new Set());
  };

  // Add all selected items to cart
  const handleAddAllToCart = async () => {
    if (selectedItems.size === 0) return;
    
    const availableSelectedItems = filteredItems.filter(
      item => selectedItems.has(item._id || item.id) && item.availability !== false
    );
    
    if (availableSelectedItems.length === 0) {
      showErrorMessage('No available items selected');
      return;
    }
    
    for (const item of availableSelectedItems) {
      await handleAddToCart(item);
    }
    
    setSelectedItems(new Set());
  };

  // Clear entire wishlist
  const handleClearWishlist = async () => {
    const shouldClear = window.confirm(
      'Are you sure you want to clear your entire wishlist? This action cannot be undone.'
    );
    
    if (!shouldClear) return;
    
    try {
      const result = await clearWishlist();
      
      if (result.success) {
        showSuccessMessage('Wishlist cleared successfully');
        setSelectedItems(new Set());
      } else {
        showErrorMessage(result.error || 'Failed to clear wishlist');
      }
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      showErrorMessage('Failed to clear wishlist');
    }
  };

  // Loading state
  if (wishlistLoading && wishlistItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button onClick={handleBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Wishlist</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="animate-spin rounded-full h-12 w-12 text-orange-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading your wishlist...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-down">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-down">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleBack} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Wishlist</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                  {filteredItems.length !== itemCount && ` (${itemCount} total)`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {selectedItems.size > 0 && (
                <div className="flex items-center space-x-2 mr-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedItems.size} selected
                  </span>
                  <button
                    onClick={handleAddAllToCart}
                    disabled={cartLoading}
                    className="px-3 py-1 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:bg-orange-300 transition-colors"
                  >
                    Add to Cart
                  </button>
                  <button
                    onClick={handleRemoveSelectedItems}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}
              
              {itemCount > 0 && (
                <button
                  onClick={handleClearWishlist}
                  className="px-3 py-1 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Clear All
                </button>
              )}
              
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {viewMode === 'grid' ? 
                  <List className="w-5 h-5 text-gray-600 dark:text-gray-400" /> :
                  <Grid className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                }
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search wishlist items, restaurants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          {/* Filter Tabs */}
          {showFilters && (
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'available', label: 'Available' },
                { id: 'discounted', label: 'On Sale' },
                { id: 'veg', label: 'Vegetarian' },
                { id: 'non-veg', label: 'Non-Veg' }
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterType(filter.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    filterType === filter.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error State */}
        {wishlistError && (
          <div className="text-center py-16">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Failed to load wishlist
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {wishlistError}
            </p>
            <button
              onClick={() => loadWishlist(true)}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!wishlistError && filteredItems.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery || filterType !== 'all' ? 'No items found' : 'Your wishlist is empty'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchQuery || filterType !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Start adding your favorite dishes to see them here'}
            </p>
            {(!searchQuery && filterType === 'all') && (
              <button
                onClick={handleBack}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Discover Dishes
              </button>
            )}
          </div>
        )}

        {/* Items Grid/List */}
        {!wishlistError && filteredItems.length > 0 && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredItems.map((item) => {
              const itemId = item._id || item.id;
              const isProcessingRemove = processingItems.has(itemId);
              const isProcessingCart = processingItems.has(`cart-${itemId}`);
              
              return (
                <div
                  key={itemId}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow relative ${
                    item.availability === false ? 'opacity-75' : ''
                  } ${viewMode === 'list' ? 'flex' : ''}`}
                >
                  {/* Processing Overlay */}
                  {(isProcessingRemove || isProcessingCart) && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 dark:bg-gray-800 dark:bg-opacity-75 z-10 flex items-center justify-center rounded-lg">
                      <div className="text-center">
                        <Loader2 className="animate-spin rounded-full h-6 w-6 text-orange-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {isProcessingRemove ? 'Removing...' : 'Adding to cart...'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Selection Checkbox */}
                  <div className="absolute top-3 left-3 z-10">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(itemId)}
                      onChange={() => toggleItemSelection(itemId)}
                      className="w-4 h-4 text-orange-600 bg-white border-gray-300 rounded focus:ring-orange-500"
                    />
                  </div>

                  {/* Item Image */}
                  <div className={`relative ${viewMode === 'list' ? 'w-32 h-32' : 'h-48'} overflow-hidden ${viewMode === 'grid' ? 'rounded-t-lg' : 'rounded-l-lg'}`}>
                    <img
                      src={item.image ? `http://localhost:5000${item.image}` : 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1';
                      }}
                    />
                    
                    {/* Availability Overlay */}
                    {item.availability === false && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">Currently Unavailable</span>
                      </div>
                    )}
                    
                    {/* Discount Badge */}
                    {item.offer?.hasOffer && (
                      <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                        {item.offer.discountPercentage}% OFF
                      </div>
                    )}

                    {/* Veg/Non-Veg Indicator */}
                    <div className={`absolute bottom-3 left-3 w-4 h-4 border-2 flex items-center justify-center ${
                      item.type === 'veg' 
                        ? 'border-green-500 bg-white' 
                        : 'border-red-500 bg-white'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        item.type === 'veg' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                    </div>
                  </div>

                  {/* Item Details */}
                  <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {item.restaurantName || item.restaurant} • {item.category}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-2 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleRemoveFromWishlist(item)}
                        disabled={isProcessingRemove}
                        className="p-1 text-red-500 hover:text-red-600 transition-colors ml-2 disabled:opacity-50"
                      >
                        <Heart className="w-5 h-5 fill-current" />
                      </button>
                    </div>

                    {/* Rating and Delivery Info */}
                    <div className="flex items-center space-x-4 mb-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-current text-yellow-400" />
                        <span className="font-medium">
                          {item.rating?.average ? item.rating.average.toFixed(1) : item.ratingDisplay || '4.2'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{item.deliveryTime || '25-30 min'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{item.distance || '1.2 km'}</span>
                      </div>
                    </div>

                    {/* Price and Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {item.currentPrice || `₹${item.price}`}
                        </span>
                        {item.offer?.hasOffer && (
                          <span className="text-sm text-gray-500 line-through">
                            ₹{item.price}
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleAddToCart(item)}
                        disabled={item.availability === false || isProcessingCart}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                          item.availability !== false
                            ? 'bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>
                          {item.availability === false 
                            ? 'Unavailable' 
                            : isProcessingCart 
                            ? 'Adding...' 
                            : 'Add to Cart'
                          }
                        </span>
                      </button>
                    </div>

                    {/* Added Date */}
                    <div className="mt-2 text-xs text-gray-400">
                      Added on {new Date(item.addedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes slide-down {
          from {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default WishlistPage;