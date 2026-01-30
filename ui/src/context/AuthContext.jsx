
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);

  // chk if user is authenticated on mount to (restore session from cookies)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data && res.data.data && res.data.data.user) {
          setUser(res.data.data.user);
          const storedToken = sessionStorage.getItem('accessToken');
          if (storedToken) {
            setAccessToken(storedToken);
          }
        }
      } catch (error) {
        console.log('Not authenticated');
        setUser(null);
        setAccessToken(null);
        sessionStorage.removeItem('accessToken');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []); 

  const login = (userData) => {
    setUser(userData.user);
    if (userData.accessToken) {
      setAccessToken(userData.accessToken);
      sessionStorage.setItem('accessToken', userData.accessToken);
    }
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    sessionStorage.removeItem('accessToken');
    api.post('/auth/logout').catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, accessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);