// contexts/ViewHistoryContext.jsx - FIXED with better error handling
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ViewHistoryContext = createContext();

export const useViewHistory = () => {
  const context = useContext(ViewHistoryContext);
  if (!context) {
    throw new Error('useViewHistory must be used within ViewHistoryProvider');
  }
  return context;
};

const API_BASE = 'http://localhost:5000/api';
const STORAGE_KEY = 'recentlyViewed';
const MAX_LOCAL_ITEMS = 20;

export const ViewHistoryProvider = ({ children }) => {
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [mostViewed, setMostViewed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate session ID for guest users
  const getSessionId = () => {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sessionId', sessionId);
      console.log('🔑 Generated new session ID:', sessionId);
    }
    return sessionId;
  };

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('userToken');
  };

  // Load recently viewed from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentlyViewed(Array.isArray(parsed) ? parsed : []);
        console.log('📦 Loaded', parsed.length, 'items from localStorage');
      }
    } catch (error) {
      console.error('❌ Error loading recently viewed:', error);
    }
  }, []);

  // Save to localStorage whenever recentlyViewed changes
  useEffect(() => {
    if (recentlyViewed.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recentlyViewed));
        console.log('💾 Saved', recentlyViewed.length, 'items to localStorage');
      } catch (error) {
        console.error('❌ Error saving recently viewed:', error);
      }
    }
  }, [recentlyViewed]);

  // Track view (hybrid: localStorage + API)
  const trackView = useCallback(async (dish) => {
    if (!dish || !dish._id) {
      console.error('❌ Invalid dish object for tracking');
      return;
    }

    console.log('📊 Tracking view for:', dish.name);

    try {
      // 1. Update localStorage immediately (instant feedback)
      setRecentlyViewed(prev => {
        const filtered = prev.filter(item => item._id !== dish._id);
        const newItem = {
          _id: dish._id,
          name: dish.name,
          price: dish.price,
          image: dish.image,
          restaurantName: dish.restaurantName || dish.restaurant,
          rating: dish.rating,
          viewedAt: new Date().toISOString()
        };
        const newViewed = [newItem, ...filtered].slice(0, MAX_LOCAL_ITEMS);
        console.log('✅ Updated localStorage, total items:', newViewed.length);
        return newViewed;
      });

      // 2. Send to API (background, for persistence)
      const token = getAuthToken();
      const sessionId = getSessionId();

      console.log('🌐 Sending to API...', {
        hasToken: !!token,
        sessionId: sessionId.substring(0, 20) + '...'
      });

      const response = await fetch(`${API_BASE}/view-history/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          dishId: dish._id,
          sessionId: !token ? sessionId : undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('⚠️ Failed to track view on server:', errorText);
      } else {
        const result = await response.json();
        console.log('✅ View tracked on server:', result);
      }

    } catch (error) {
      console.error('❌ Error tracking view:', error);
      // Still works offline with localStorage
    }
  }, []);

  // Load recently viewed from API (for logged-in users)
  const loadRecentlyViewed = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      console.log('👤 Guest user - using localStorage only');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Loading recently viewed from API...');
      
      const response = await fetch(`${API_BASE}/view-history/recently-viewed?limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.dishes) {
          console.log('✅ Loaded', data.dishes.length, 'dishes from API');
          
          // Merge with localStorage and deduplicate
          setRecentlyViewed(prev => {
            const serverDishes = data.dishes.map(d => ({
              _id: d._id,
              name: d.name,
              price: d.price,
              image: d.image,
              restaurantName: d.restaurantName || d.restaurant,
              rating: d.rating,
              viewedAt: d.lastViewed
            }));
            
            // Deduplicate by _id, preferring server data
            const merged = [...serverDishes];
            prev.forEach(item => {
              if (!merged.find(d => d._id === item._id)) {
                merged.push(item);
              }
            });
            
            return merged.slice(0, MAX_LOCAL_ITEMS);
          });
        }
      } else {
        console.warn('⚠️ Failed to load from API:', response.status);
      }
    } catch (error) {
      console.error('❌ Error loading recently viewed:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load most viewed dishes
  const loadMostViewed = useCallback(async (options = {}) => {
    const { limit = 10, days = 7, city = '' } = options;

    try {
      setLoading(true);
      console.log('🔄 Loading most viewed dishes...', { limit, days, city });
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        days: days.toString(),
        ...(city && { city })
      });

      const response = await fetch(`${API_BASE}/view-history/most-viewed?${params}`);
      const data = await response.json();

      if (data.success && data.dishes) {
        console.log('✅ Loaded', data.dishes.length, 'most viewed dishes');
        setMostViewed(data.dishes);
      } else {
        console.warn('⚠️ No most viewed dishes found');
        setMostViewed([]);
      }
    } catch (error) {
      console.error('❌ Error loading most viewed:', error);
      setError(error.message);
      setMostViewed([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear recently viewed
  const clearRecentlyViewed = useCallback(async () => {
    const token = getAuthToken();

    // Clear localStorage
    setRecentlyViewed([]);
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Cleared localStorage');

    // Clear on server if logged in
    if (token) {
      try {
        await fetch(`${API_BASE}/view-history/recently-viewed`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('✅ Cleared on server');
      } catch (error) {
        console.error('❌ Error clearing on server:', error);
      }
    }
  }, []);

  // Get dish view stats
  const getDishStats = useCallback(async (dishId, days = 7) => {
    try {
      const response = await fetch(
        `${API_BASE}/view-history/dish/${dishId}/stats?days=${days}`
      );
      const data = await response.json();
      
      if (data.success) {
        return data.stats;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting dish stats:', error);
      return null;
    }
  }, []);

  const value = {
    recentlyViewed,
    mostViewed,
    loading,
    error,
    trackView,
    loadRecentlyViewed,
    loadMostViewed,
    clearRecentlyViewed,
    getDishStats
  };

  return (
    <ViewHistoryContext.Provider value={value}>
      {children}
    </ViewHistoryContext.Provider>
  );
};

export default ViewHistoryContext;