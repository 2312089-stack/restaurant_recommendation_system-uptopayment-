import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const API_BASE_URL = "http://localhost:5000/api";

  // Verify session on mount
  useEffect(() => {
    verifySession();
  }, []);

  // ✅ FIXED: Added async keyword
  const verifySession = async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Basic token format validation
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.log('Invalid token format');
        clearSession();
        setLoading(false);
        return;
      }

      // Decode the token to check expiration
      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        const now = Date.now() / 1000;
        
        if (payload.exp && payload.exp < now) {
          console.log('Token expired');
          clearSession();
          setLoading(false);
          return;
        }
      } catch (e) {
        console.log('Could not decode token');
        clearSession();
        setLoading(false);
        return;
      }

      // Token is valid, restore session
      if (userData) {
        setAuthToken(token);
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
        console.log('Session restored from localStorage');
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  const login = (token, userData) => {
    setAuthToken(token);
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      if (authToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearSession();
    }
  };

  const clearSession = () => {
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ 
      authToken, 
      user, 
      isAuthenticated,
      loading,
      login, 
      logout,
      verifySession
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};