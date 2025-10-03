import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Initialize from localStorage on mount only
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token) setAuthToken(token);
    if (userData) setUser(JSON.parse(userData));
  }, []);

  const login = (token, userData) => {
    setAuthToken(token);
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ authToken, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);