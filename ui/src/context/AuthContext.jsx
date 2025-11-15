// src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);

  // Check if user is authenticated on mount (restore session from cookies)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to get current user from backend using httpOnly cookies
        const res = await api.get('/auth/me');
        if (res.data && res.data.data && res.data.data.user) {
          setUser(res.data.data.user);
          // Try to restore access token from sessionStorage for socket connection
          const storedToken = sessionStorage.getItem('accessToken');
          if (storedToken) {
            setAccessToken(storedToken);
          }
        }
      } catch (error) {
        // If request fails, user is not authenticated (token expired or missing)
        // This is expected if user is not logged in, so we don't show an error
        console.log('Not authenticated');
        setUser(null);
        setAccessToken(null);
        sessionStorage.removeItem('accessToken');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []); // Run only once on mount

  // Login function - expects user data from LoginPage
  const login = (userData) => {
    setUser(userData.user);
    // Store access token for socket connection
    // Note: Storing in sessionStorage for socket auth (less secure than httpOnly cookies)
    // but needed since socket.io requires token in auth object
    if (userData.accessToken) {
      setAccessToken(userData.accessToken);
      sessionStorage.setItem('accessToken', userData.accessToken);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setAccessToken(null);
    sessionStorage.removeItem('accessToken');
    // Optionally call a logout endpoint to clear cookies on server
    api.post('/auth/logout').catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, accessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);