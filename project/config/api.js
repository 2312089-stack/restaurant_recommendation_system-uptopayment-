// config/api.js - Centralized API Configuration
// Create this file in your frontend src/config/ directory

/**
 * Get API base URL from environment variables
 * Falls back to localhost if not defined
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
                            import.meta.env.VITE_API_BASE_URL || 
                            'http://localhost:5000/api';

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
                           'http://localhost:5000';

/**
 * API Endpoints Configuration
 */
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    SIGNUP: `${API_BASE_URL}/auth/signup`,
    SIGNIN: `${API_BASE_URL}/auth/signin`,
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
    RESET_PASSWORD: (token) => `${API_BASE_URL}/auth/reset-password/${token}`,
    VERIFY_RESET_TOKEN: (token) => `${API_BASE_URL}/auth/verify-reset-token/${token}`,
    GOOGLE: `${API_BASE_URL}/auth/google`,
    GOOGLE_CALLBACK: `${API_BASE_URL}/auth/google/callback`,
    PROFILE: `${API_BASE_URL}/auth/profile`,
    UPDATE_PROFILE: `${API_BASE_URL}/auth/profile`,
    CHANGE_PASSWORD: `${API_BASE_URL}/auth/change-password`,
  },
  
  // User endpoints
  USER: {
    ONBOARDING: (userId) => `${API_BASE_URL}/users/${userId}/onboarding`,
    GET_USER: (userId) => `${API_BASE_URL}/users/${userId}`,
  },
  
  // Dishes endpoints
  DISHES: {
    LIST: `${API_BASE_URL}/dishes`,
    DETAILS: (dishId) => `${API_BASE_URL}/dishes/${dishId}`,
    SEARCH: `${API_BASE_URL}/dishes/search`,
  },
  
  // Cart endpoints
  CART: {
    GET: `${API_BASE_URL}/cart`,
    ADD: `${API_BASE_URL}/cart/add`,
    UPDATE: (itemId) => `${API_BASE_URL}/cart/update/${itemId}`,
    REMOVE: (itemId) => `${API_BASE_URL}/cart/remove/${itemId}`,
    CLEAR: `${API_BASE_URL}/cart/clear`,
  },
  
  // Orders endpoints
  ORDERS: {
    CREATE: `${API_BASE_URL}/orders`,
    LIST: `${API_BASE_URL}/orders`,
    DETAILS: (orderId) => `${API_BASE_URL}/orders/${orderId}`,
    TRACK: (orderId) => `${API_BASE_URL}/orders/${orderId}/track`,
  },
  
  // Wishlist endpoints
  WISHLIST: {
    GET: `${API_BASE_URL}/wishlist`,
    ADD: `${API_BASE_URL}/wishlist/add`,
    REMOVE: (dishId) => `${API_BASE_URL}/wishlist/remove/${dishId}`,
    CLEAR: `${API_BASE_URL}/wishlist/clear`,
  },
};

/**
 * Helper function to make authenticated API calls
 */
export const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
  
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    // Handle token expiration
    if (response.status === 401 && data.error?.includes('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
    
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Call Error:', error);
    throw error;
  }
};

/**
 * Check if we're in development mode
 */
export const isDevelopment = import.meta.env.DEV || 
                            import.meta.env.VITE_DEBUG_MODE === 'true';

/**
 * Log API configuration (development only)
 */
if (isDevelopment) {
  console.log('🌐 API Configuration:');
  console.log('   API_BASE_URL:', API_BASE_URL);
  console.log('   BACKEND_URL:', BACKEND_URL);
  console.log('   Environment:', import.meta.env.MODE);
}

export default {
  API_BASE_URL,
  BACKEND_URL,
  API_ENDPOINTS,
  apiCall,
  isDevelopment,
};