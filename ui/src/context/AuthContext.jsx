// src/context/AuthContext.jsx - FINAL VERSION

import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // This useEffect now has a crucial job: check for a logged-in user on initial load.
  useEffect(() => {
    const checkUser = async () => {
      try {
        // Make a request to our new "showMe" endpoint.
        // Axios will automatically send the httpOnly cookie.
        const { data } = await api.get('/auth/showMe');
        
        // If the request is successful, the backend sends back the user.
        // We set the user in our state.
        setUser(data.user);
      } catch (error) {
        // If the request fails (e.g., 401 Unauthorized), it means no valid cookie was found.
        // In this case, the user is not logged in, so we do nothing.
        // The `user` state remains null.
        console.log('Not logged in');
      } finally {
        // CRITICAL: No matter what happens, we are done loading.
        // This prevents the "blank screen" bug.
        setIsLoading(false);
      }
    };

    checkUser();
  }, []); // The empty array [] means this effect runs only ONCE when the app first mounts.

  const login = async (role, credentials) => {
    const response = await api.post(`/auth/${role}/login`, credentials);
    setUser(response.data.user);
    return response.data.user;
  };

  const register = async (role, details) => {
    const response = await api.post(`/auth/${role}/register`, details);
    setUser(response.data.user);
    return response.data.user;
  };

  const logout = async () => {
    await api.get('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);