// contexts/WishlistContext.jsx - Dynamic Wishlist Context
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';

const WishlistContext = createContext();

// Wishlist action types
const WISHLIST_ACTIONS = {
  LOAD_WISHLIST: 'LOAD_WISHLIST',
  ADD_TO_WISHLIST: 'ADD_TO_WISHLIST',
  REMOVE_FROM_WISHLIST: 'REMOVE_FROM_WISHLIST',
  CLEAR_WISHLIST: 'CLEAR_WISHLIST',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Initial wishlist state
const initialState = {
  items: [],
  itemCount: 0,
  loading: false,
  error: null,
  initialized: false
};

// Wishlist reducer
const wishlistReducer = (state, action) => {
  switch (action.type) {
    case WISHLIST_ACTIONS.LOAD_WISHLIST:
      return {
        ...state,
        items: action.payload.items || [],
        itemCount: action.payload.items?.length || 0,
        loading: false,
        error: null,
        initialized: true
      };

    case WISHLIST_ACTIONS.ADD_TO_WISHLIST:
      const newItem = action.payload.item;
      const existingItems = state.items.filter(item => 
        (item._id || item.id) !== (newItem._id || newItem.id)
      );
      const updatedItems = [...existingItems, newItem];
      
      return {
        ...state,
        items: updatedItems,
        itemCount: updatedItems.length,
        loading: false,
        error: null
      };

    case WISHLIST_ACTIONS.REMOVE_FROM_WISHLIST:
      const filteredItems = state.items.filter(item => 
        (item._id || item.id) !== action.payload.dishId
      );
      
      return {
        ...state,
        items: filteredItems,
        itemCount: filteredItems.length,
        loading: false,
        error: null
      };

    case WISHLIST_ACTIONS.CLEAR_WISHLIST:
      return {
        ...state,
        items: [],
        itemCount: 0,
        loading: false,
        error: null
      };

    case WISHLIST_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: Boolean(action.payload)
      };

    case WISHLIST_ACTIONS.SET_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    case WISHLIST_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

// Wishlist provider component
export const WishlistProvider = ({ children }) => {
  const [state, dispatch] = useReducer(wishlistReducer, initialState);
  const loadWishlistCalled = useRef(false);
  const requestInProgress = useRef(false);

  const API_BASE = 'http://localhost:5000/api';

  // Get auth token
  const getAuthToken = () => {
    try {
      const possibleKeys = ['token', 'userToken', 'authToken', 'accessToken'];
      
      for (const key of possibleKeys) {
        const token = localStorage.getItem(key);
        if (token && token.trim()) {
          return token.trim();
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Error accessing localStorage:', error);
      return null;
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    const token = getAuthToken();
    return Boolean(token);
  };

  // Make authenticated request
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Authentication required. Please log in to continue.');
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(options.headers || {})
        }
      });

      if (response.status === 401) {
        // Clear tokens on authentication failure
        ['token', 'userToken', 'authToken', 'accessToken'].forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (error) {
            console.warn('Error clearing localStorage:', error);
          }
        });
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        let errorData = {};
        try {
          const text = await response.text();
          errorData = text ? JSON.parse(text) : {};
        } catch (parseError) {
          errorData = { error: `Request failed with status ${response.status}` };
        }
        throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
      }

      return response;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      throw error;
    }
  };

  // Load wishlist from server
  const loadWishlist = async (force = false) => {
    if (requestInProgress.current && !force) {
      return { success: false, error: 'Request in progress' };
    }

    if (state.initialized && !force) {
      return { success: true };
    }

    if (!isAuthenticated()) {
      // Load from localStorage for unauthenticated users
      try {
        const savedWishlist = localStorage.getItem('wishlist');
        if (savedWishlist) {
          const items = JSON.parse(savedWishlist);
          dispatch({ 
            type: WISHLIST_ACTIONS.LOAD_WISHLIST, 
            payload: { items }
          });
        }
      } catch (error) {
        console.warn('Error loading wishlist from localStorage:', error);
      }
      return { success: true };
    }

    try {
      requestInProgress.current = true;
      dispatch({ type: WISHLIST_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: WISHLIST_ACTIONS.CLEAR_ERROR });
      
      const response = await makeAuthenticatedRequest(`${API_BASE}/wishlist`);
      const data = await response.json();

      if (data.success) {
        dispatch({ 
          type: WISHLIST_ACTIONS.LOAD_WISHLIST, 
          payload: { items: data.items || [] }
        });
        return { success: true };
      } else {
        throw new Error(data.error || 'Failed to load wishlist');
      }
    } catch (error) {
      console.error('Load wishlist error:', error);
      dispatch({ 
        type: WISHLIST_ACTIONS.SET_ERROR, 
        payload: error.message 
      });
      return { success: false, error: error.message };
    } finally {
      requestInProgress.current = false;
    }
  };

  // Add item to wishlist
  const addToWishlist = async (dish) => {
    if (!dish) {
      return { success: false, error: 'Invalid dish data' };
    }

    const dishId = dish._id || dish.id;
    
    if (!dishId) {
      return { success: false, error: 'Invalid dish ID' };
    }

    // Check if item is already in wishlist
    const isAlreadyInWishlist = state.items.some(item => 
      (item._id || item.id) === dishId
    );

    if (isAlreadyInWishlist) {
      return { success: false, error: 'Item already in wishlist' };
    }

    try {
      dispatch({ type: WISHLIST_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: WISHLIST_ACTIONS.CLEAR_ERROR });

      if (!isAuthenticated()) {
        // Handle unauthenticated users with localStorage
        const wishlistItem = {
          ...dish,
          id: dishId,
          addedAt: new Date().toISOString()
        };
        
        dispatch({ 
          type: WISHLIST_ACTIONS.ADD_TO_WISHLIST, 
          payload: { item: wishlistItem }
        });

        // Save to localStorage
        const updatedItems = [...state.items, wishlistItem];
        localStorage.setItem('wishlist', JSON.stringify(updatedItems));

        // Trigger global wishlist update event
        window.dispatchEvent(new CustomEvent('wishlistUpdated', { 
          detail: { 
            action: 'add',
            item: wishlistItem,
            count: updatedItems.length
          } 
        }));

        return { success: true, message: `${dish.name} added to wishlist` };
      }

      // Handle authenticated users with API
      const response = await makeAuthenticatedRequest(`${API_BASE}/wishlist/add`, {
        method: 'POST',
        body: JSON.stringify({ dishId: String(dishId).trim() })
      });

      const data = await response.json();

      if (data.success) {
        dispatch({ 
          type: WISHLIST_ACTIONS.ADD_TO_WISHLIST, 
          payload: { item: data.item || dish }
        });
        
        // Trigger global wishlist update event
        window.dispatchEvent(new CustomEvent('wishlistUpdated', { 
          detail: { 
            action: 'add',
            item: data.item || dish,
            count: state.itemCount + 1
          } 
        }));
        
        return { success: true, message: data.message || `${dish.name} added to wishlist` };
      } else {
        throw new Error(data.error || 'Failed to add item to wishlist');
      }
    } catch (error) {
      console.error('Add to wishlist error:', error);
      const errorMessage = String(error.message || 'Failed to add item to wishlist');
      dispatch({ 
        type: WISHLIST_ACTIONS.SET_ERROR, 
        payload: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  };

  // Remove item from wishlist
  const removeFromWishlist = async (dishId) => {
    if (!dishId) {
      return { success: false, error: 'Invalid dish ID' };
    }

    try {
      dispatch({ type: WISHLIST_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: WISHLIST_ACTIONS.CLEAR_ERROR });

      if (!isAuthenticated()) {
        // Handle unauthenticated users with localStorage
        dispatch({ 
          type: WISHLIST_ACTIONS.REMOVE_FROM_WISHLIST, 
          payload: { dishId }
        });

        const updatedItems = state.items.filter(item => 
          (item._id || item.id) !== dishId
        );
        localStorage.setItem('wishlist', JSON.stringify(updatedItems));

        // Trigger global wishlist update event
        window.dispatchEvent(new CustomEvent('wishlistUpdated', { 
          detail: { 
            action: 'remove',
            dishId,
            count: updatedItems.length
          } 
        }));

        return { success: true, message: 'Item removed from wishlist' };
      }

      // Handle authenticated users with API
      const response = await makeAuthenticatedRequest(`${API_BASE}/wishlist/remove/${String(dishId)}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        dispatch({ 
          type: WISHLIST_ACTIONS.REMOVE_FROM_WISHLIST, 
          payload: { dishId }
        });
        
        // Trigger global wishlist update event
        window.dispatchEvent(new CustomEvent('wishlistUpdated', { 
          detail: { 
            action: 'remove',
            dishId,
            count: state.itemCount - 1
          } 
        }));
        
        return { success: true, message: data.message || 'Item removed from wishlist' };
      } else {
        throw new Error(data.error || 'Failed to remove item from wishlist');
      }
    } catch (error) {
      console.error('Remove from wishlist error:', error);
      const errorMessage = String(error.message || 'Failed to remove item from wishlist');
      dispatch({ 
        type: WISHLIST_ACTIONS.SET_ERROR, 
        payload: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  };

  // Clear entire wishlist
  const clearWishlist = async () => {
    try {
      dispatch({ type: WISHLIST_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: WISHLIST_ACTIONS.CLEAR_ERROR });

      if (!isAuthenticated()) {
        // Handle unauthenticated users with localStorage
        dispatch({ type: WISHLIST_ACTIONS.CLEAR_WISHLIST });
        localStorage.removeItem('wishlist');

        // Trigger global wishlist update event
        window.dispatchEvent(new CustomEvent('wishlistUpdated', { 
          detail: { 
            action: 'clear',
            count: 0
          } 
        }));

        return { success: true, message: 'Wishlist cleared successfully' };
      }

      // Handle authenticated users with API
      const response = await makeAuthenticatedRequest(`${API_BASE}/wishlist/clear`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        dispatch({ type: WISHLIST_ACTIONS.CLEAR_WISHLIST });
        
        // Trigger global wishlist update event
        window.dispatchEvent(new CustomEvent('wishlistUpdated', { 
          detail: { 
            action: 'clear',
            count: 0
          } 
        }));
        
        return { success: true, message: data.message || 'Wishlist cleared successfully' };
      } else {
        throw new Error(data.error || 'Failed to clear wishlist');
      }
    } catch (error) {
      console.error('Clear wishlist error:', error);
      const errorMessage = String(error.message || 'Failed to clear wishlist');
      dispatch({ 
        type: WISHLIST_ACTIONS.SET_ERROR, 
        payload: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  };

  // Check if item is in wishlist
  const isInWishlist = (dishId) => {
    return state.items.some(item => (item._id || item.id) === dishId);
  };

  // Toggle wishlist item
  const toggleWishlist = async (dish) => {
    const dishId = dish._id || dish.id;
    
    if (isInWishlist(dishId)) {
      return await removeFromWishlist(dishId);
    } else {
      return await addToWishlist(dish);
    }
  };

  // Clear error manually
  const clearError = () => {
    dispatch({ type: WISHLIST_ACTIONS.CLEAR_ERROR });
  };

  // Load wishlist on component mount
  useEffect(() => {
    if (!loadWishlistCalled.current) {
      loadWishlistCalled.current = true;
      loadWishlist();
    }
  }, []);

  // Listen for login/logout events
  useEffect(() => {
    const handleStorageChange = () => {
      const wasAuthenticated = loadWishlistCalled.current;
      const nowAuthenticated = isAuthenticated();
      
      if (!wasAuthenticated && nowAuthenticated) {
        loadWishlistCalled.current = true;
        loadWishlist(true);
      } else if (wasAuthenticated && !nowAuthenticated) {
        loadWishlistCalled.current = false;
        loadWishlist(); // Load from localStorage
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Context value
  const contextValue = {
    // State
    items: state.items || [],
    itemCount: Number(state.itemCount) || 0,
    loading: Boolean(state.loading),
    error: state.error ? String(state.error) : null,
    isAuthenticated: Boolean(isAuthenticated()),
    initialized: Boolean(state.initialized),
    
    // Actions
    loadWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    toggleWishlist,
    isInWishlist,
    clearError
  };

  return (
    <WishlistContext.Provider value={contextValue}>
      {children}
    </WishlistContext.Provider>
  );
};

// Custom hook to use wishlist context
export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};