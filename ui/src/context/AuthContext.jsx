// src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated on mount (restore session from cookies)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to get current user from backend using httpOnly cookies
        const res = await api.get('/auth/me');
        if (res.data && res.data.data && res.data.data.user) {
          setUser(res.data.data.user);
        }
      } catch (error) {
        // If request fails, user is not authenticated (token expired or missing)
        // This is expected if user is not logged in, so we don't show an error
        console.log('Not authenticated');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []); // Run only once on mount

  // Login function - expects user data from LoginPage
  const login = (userData) => {
    setUser(userData.user);
  };

  // Logout function
  const logout = () => {
    setUser(null);
    // Optionally call a logout endpoint to clear cookies on server
    api.post('/auth/logout').catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);