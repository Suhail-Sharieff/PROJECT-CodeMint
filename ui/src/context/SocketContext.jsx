// src/context/SocketContext.jsx

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080';

export const SocketProvider = ({ children }) => {
  const { user, accessToken } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Only connect if user is logged in and we have an access token
    if (!user || !accessToken) {
      console.log('🔌 Socket: Waiting for user or token...', { 
        user: !!user, 
        token: !!accessToken,
        userId: user?.user_id 
      });
      if (socketRef.current) {
        console.log('🔌 Disconnecting socket (no user or token)...');
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Don't reconnect if already connected
    if (socketRef.current && socketRef.current.connected) {
      console.log('🔌 Socket already connected');
      setIsConnected(true);
      return;
    }

    // Clean up existing socket if any
    if (socketRef.current) {
      console.log('🔌 Cleaning up existing socket before reconnecting...');
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    console.log('🔌 Connecting to socket server...', { 
      url: SOCKET_URL, 
      hasToken: !!accessToken,
      tokenLength: accessToken?.length,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'No token'
    });
    
    if (!accessToken) {
      console.error('❌ Cannot connect: No access token available');
      return;
    }
    
    const newSocket = io(SOCKET_URL, {
      auth: {
        token: accessToken
      },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      forceNew: true, // Force a new connection
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      console.error('Error details:', error);
      setIsConnected(false);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Socket reconnection attempt ${attemptNumber}`);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Socket reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed');
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount or when user/token changes
    return () => {
      console.log('🔌 Cleaning up socket connection...');
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
    };
  }, [user, accessToken]); // Reconnect when user or token changes

  const value = {
    socket,
    isConnected,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

