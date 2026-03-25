
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://backend:8080';

export const SocketProvider = ({ children }) => {
  const { user, accessToken } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // v will connect if user is logged in and we have an access token
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

    // v don't want to reconnect if already connected
    if (socketRef.current && socketRef.current.connected) {
      console.log('🔌 Socket already connected');
      setIsConnected(true);
      return;
    }

    // resource clenup
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
      forceNew: true, // ====TODO, idk whether to establish a new conn or  not
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

    newSocket.on('error', (e) => {
      alert(e.message);
    });


    setSocket(newSocket);

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
  }, [user, accessToken]); //dependcy on user,accessToken, coz if that changes we need to build conn again

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

