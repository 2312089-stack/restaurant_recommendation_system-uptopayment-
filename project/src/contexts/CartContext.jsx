// CartContext.jsx - OPTIMIZED VERSION with reduced API calls
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';

const CartContext = createContext();

// Cart action types
const CART_ACTIONS = {
  LOAD_CART: 'LOAD_CART',
  ADD_TO_CART: 'ADD_TO_CART',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  REMOVE_FROM_CART: 'REMOVE_FROM_CART',
  CLEAR_CART: 'CLEAR_CART',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Initial cart state
const initialState = {
  items: [],
  totalAmount: 0,
  itemCount: 0,
  loading: false,
  error: null,
  initialized: false
};

// Cart reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case CART_ACTIONS.LOAD_CART:
      return {
        ...state,
        items: action.payload.items || [],
        totalAmount: Number(action.payload.totalAmount) || 0,
        itemCount: Number(action.payload.itemCount) || 0,
        loading: false,
        error: null,
        initialized: true
      };

    case CART_ACTIONS.ADD_TO_CART:
    case CART_ACTIONS.UPDATE_QUANTITY:
    case CART_ACTIONS.REMOVE_FROM_CART:
      return {
        ...state,
        items: action.payload.items || [],
        totalAmount: Number(action.payload.totalAmount) || 0,
        itemCount: Number(action.payload.itemCount) || 0,
        loading: false,
        error: null
      };

    case CART_ACTIONS.CLEAR_CART:
      return {
        ...state,
        items: [],
        totalAmount: 0,
        itemCount: 0,
        loading: false,
        error: null
      };

    case CART_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: Boolean(action.payload)
      };

    case CART_ACTIONS.SET_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    case CART_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

// Cart provider component
export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const loadCartCalled = useRef(false);
  const requestInProgress = useRef(false);

  // Use Vite environment variable
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Get auth token with multiple fallbacks and better error handling
  const getAuthToken = () => {
    try {
      // Try multiple token keys for backward compatibility
      const possibleKeys = ['token', 'userToken', 'authToken', 'accessToken'];
      
      for (const key of possibleKeys) {
        const token = localStorage.getItem(key);
        if (token && token.trim()) {
          console.log(`Found auth token with key: ${key}`);
          return token.trim();
        }
      }
      
      console.warn('No auth token found in localStorage');
      return null;
    } catch (error) {
      console.warn('Error accessing localStorage:', error);
      return null;
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    const token = getAuthToken();
    const isAuth = Boolean(token);
    console.log('Authentication check:', isAuth);
    return isAuth;
  };

  // Make authenticated request with comprehensive error handling
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Authentication required. Please log in to continue.');
    }

    console.log(`Making authenticated request to: ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(options.headers || {})
        }
      });

      console.log(`Response status: ${response.status} for ${url}`);

      // Handle different HTTP status codes
      if (response.status === 401) {
        console.error('Authentication failed - clearing tokens');
        // Clear all possible token keys
        try {
          ['token', 'userToken', 'authToken', 'accessToken'].forEach(key => {
            localStorage.removeItem(key);
          });
        } catch (error) {
          console.warn('Error clearing localStorage:', error);
        }
        throw new Error('Session expired. Please log in again.');
      }

      if (response.status === 403) {
        throw new Error('Access denied. Please check your permissions.');
      }

      if (!response.ok) {
        let errorData = {};
        try {
          const text = await response.text();
          errorData = text ? JSON.parse(text) : {};
        } catch (parseError) {
          console.warn('Error parsing response:', parseError);
          errorData = { error: `Request failed with status ${response.status}` };
        }
        throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
      }

      return response;
    } catch (error) {
      // Network or other errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      throw error;
    }
  };

  // Load cart from server - OPTIMIZED with request deduplication
  const loadCart = async (force = false) => {
    // Prevent multiple simultaneous requests
    if (requestInProgress.current && !force) {
      console.log('Cart load already in progress, skipping');
      return { success: false, error: 'Request in progress' };
    }

    // Prevent unnecessary calls if already loaded
    if (state.initialized && !force) {
      console.log('Cart already initialized, skipping load');
      return { success: true };
    }

    if (!isAuthenticated()) {
      console.log('User not authenticated, skipping cart load');
      return { success: false, error: 'Not authenticated' };
    }

    try {
      requestInProgress.current = true;
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: CART_ACTIONS.CLEAR_ERROR });
      
      console.log('Loading cart from server...');
      const response = await makeAuthenticatedRequest(`${API_BASE}/cart`);
      const data = await response.json();

      console.log('Cart data received:', data);

      if (data.success && data.cart) {
        dispatch({ 
          type: CART_ACTIONS.LOAD_CART, 
          payload: data.cart
        });
        return { success: true };
      } else {
        throw new Error(data.error || 'Failed to load cart');
      }
    } catch (error) {
      console.error('Load cart error:', error);
      dispatch({ 
        type: CART_ACTIONS.SET_ERROR, 
        payload: error.message 
      });
      return { success: false, error: error.message };
    } finally {
      requestInProgress.current = false;
    }
  };

  // Add item to cart
  const addToCart = async (dishId, quantity = 1, specialInstructions = '') => {
    if (!isAuthenticated()) {
      return { 
        success: false, 
        error: 'Please log in to add items to your cart',
        requiresAuth: true 
      };
    }

    if (!dishId) {
      return { success: false, error: 'Invalid dish ID' };
    }

    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: CART_ACTIONS.CLEAR_ERROR });

      console.log('Adding to cart:', { dishId, quantity, specialInstructions });

      const response = await makeAuthenticatedRequest(`${API_BASE}/cart/add`, {
        method: 'POST',
        body: JSON.stringify({
          dishId: String(dishId).trim(),
          quantity: Math.max(1, parseInt(quantity, 10) || 1),
          specialInstructions: String(specialInstructions || '').trim()
        })
      });

      const data = await response.json();
      console.log('Add to cart response:', data);

      if (data.success && data.cart) {
        dispatch({ 
          type: CART_ACTIONS.ADD_TO_CART, 
          payload: data.cart
        });
        
        // Trigger global cart update event
        window.dispatchEvent(new CustomEvent('cartUpdated', { 
          detail: { 
            action: 'add',
            cart: data.cart 
          } 
        }));
        
        return { success: true, message: data.message || 'Item added to cart' };
      } else {
        if (data.action === 'clear_cart_required') {
          return { 
            success: false, 
            error: data.error, 
            action: 'clear_cart_required' 
          };
        }
        throw new Error(data.error || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      const errorMessage = String(error.message || 'Failed to add item to cart');
      dispatch({ 
        type: CART_ACTIONS.SET_ERROR, 
        payload: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  };

  // Update item quantity
  const updateQuantity = async (dishId, quantity) => {
    if (!isAuthenticated()) {
      return { 
        success: false, 
        error: 'Please log in to update cart items',
        requiresAuth: true 
      };
    }

    if (!dishId) {
      return { success: false, error: 'Invalid dish ID' };
    }

    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: CART_ACTIONS.CLEAR_ERROR });

      console.log('Updating quantity:', { dishId, quantity });

      const response = await makeAuthenticatedRequest(`${API_BASE}/cart/item/${String(dishId)}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: Math.max(0, parseInt(quantity, 10) || 0) })
      });

      const data = await response.json();

      if (data.success && data.cart) {
        dispatch({ 
          type: CART_ACTIONS.UPDATE_QUANTITY, 
          payload: data.cart
        });
        
        // Trigger global cart update event
        window.dispatchEvent(new CustomEvent('cartUpdated', { 
          detail: { 
            action: 'update',
            cart: data.cart 
          } 
        }));
        
        return { success: true, message: data.message || 'Quantity updated' };
      } else {
        throw new Error(data.error || 'Failed to update quantity');
      }
    } catch (error) {
      console.error('Update quantity error:', error);
      const errorMessage = String(error.message || 'Failed to update quantity');
      dispatch({ 
        type: CART_ACTIONS.SET_ERROR, 
        payload: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  };

  // Remove item from cart
  const removeFromCart = async (dishId) => {
    if (!isAuthenticated()) {
      return { 
        success: false, 
        error: 'Please log in to remove items from cart',
        requiresAuth: true 
      };
    }

    if (!dishId) {
      return { success: false, error: 'Invalid dish ID' };
    }

    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: CART_ACTIONS.CLEAR_ERROR });

      const response = await makeAuthenticatedRequest(`${API_BASE}/cart/item/${String(dishId)}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success && data.cart) {
        dispatch({ 
          type: CART_ACTIONS.REMOVE_FROM_CART, 
          payload: data.cart
        });
        
        // Trigger global cart update event
        window.dispatchEvent(new CustomEvent('cartUpdated', { 
          detail: { 
            action: 'remove',
            cart: data.cart 
          } 
        }));
        
        return { success: true, message: data.message || 'Item removed from cart' };
      } else {
        throw new Error(data.error || 'Failed to remove item');
      }
    } catch (error) {
      console.error('Remove from cart error:', error);
      const errorMessage = String(error.message || 'Failed to remove item');
      dispatch({ 
        type: CART_ACTIONS.SET_ERROR, 
        payload: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    if (!isAuthenticated()) {
      return { 
        success: false, 
        error: 'Please log in to clear cart',
        requiresAuth: true 
      };
    }

    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: CART_ACTIONS.CLEAR_ERROR });

      const response = await makeAuthenticatedRequest(`${API_BASE}/cart/clear`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        dispatch({ type: CART_ACTIONS.CLEAR_CART });
        
        // Trigger global cart update event
        window.dispatchEvent(new CustomEvent('cartUpdated', { 
          detail: { 
            action: 'clear',
            cart: { items: [], totalAmount: 0, itemCount: 0 }
          } 
        }));
        
        return { success: true, message: data.message || 'Cart cleared successfully' };
      } else {
        throw new Error(data.error || 'Failed to clear cart');
      }
    } catch (error) {
      console.error('Clear cart error:', error);
      const errorMessage = String(error.message || 'Failed to clear cart');
      dispatch({ 
        type: CART_ACTIONS.SET_ERROR, 
        payload: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  };

  // Get cart summary for checkout
  const getCartSummary = async () => {
    if (!isAuthenticated()) {
      return { 
        success: false, 
        error: 'Please log in to view cart summary',
        requiresAuth: true 
      };
    }

    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/cart/summary`);
      const data = await response.json();

      if (data.success) {
        return { success: true, summary: data.summary };
      } else {
        throw new Error(data.error || 'Failed to get cart summary');
      }
    } catch (error) {
      console.error('Get cart summary error:', error);
      return { success: false, error: String(error.message || 'Failed to get cart summary') };
    }
  };

  // Clear error manually
  const clearError = () => {
    console.log('Clearing cart error');
    dispatch({ type: CART_ACTIONS.CLEAR_ERROR });
  };

  // OPTIMIZED: Load cart on component mount (only once)
  useEffect(() => {
    if (isAuthenticated() && !loadCartCalled.current) {
      console.log('User is authenticated, loading cart on mount (first time)');
      loadCartCalled.current = true;
      loadCart();
    } else if (!isAuthenticated()) {
      console.log('User not authenticated, skipping initial cart load');
    }
  }, []);

  // Listen for login/logout events to reload cart
  useEffect(() => {
    const handleStorageChange = () => {
      const wasAuthenticated = loadCartCalled.current;
      const nowAuthenticated = isAuthenticated();
      
      if (!wasAuthenticated && nowAuthenticated) {
        console.log('User logged in, loading cart');
        loadCartCalled.current = true;
        loadCart(true); // Force reload
      } else if (wasAuthenticated && !nowAuthenticated) {
        console.log('User logged out, clearing cart state');
        loadCartCalled.current = false;
        dispatch({ type: CART_ACTIONS.CLEAR_CART });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Context value with proper error handling
  const contextValue = {
    // State
    items: state.items || [],
    totalAmount: Number(state.totalAmount) || 0,
    itemCount: Number(state.itemCount) || 0,
    loading: Boolean(state.loading),
    error: state.error ? String(state.error) : null,
    isAuthenticated: Boolean(isAuthenticated()),
    initialized: Boolean(state.initialized),
    
    // Actions
    loadCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartSummary,
    clearError
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};