// hooks/useDishFeed.js - Fetches a list of dishes from the discovery API.
// Shared by the home-page sections so they render real backend data instead of
// hardcoded placeholders.
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api.js';

export const useDishFeed = (path, { limit = 6, city = '' } = {}) => {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const params = new URLSearchParams({ limit: String(limit) });
        if (city) params.append('city', city);

        const response = await fetch(`${API_BASE_URL}/discovery${path}?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load dishes');
        }

        if (!cancelled) {
          setDishes(data.dishes || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load dishes');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [path, limit, city]);

  return { dishes, loading, error };
};

export default useDishFeed;
