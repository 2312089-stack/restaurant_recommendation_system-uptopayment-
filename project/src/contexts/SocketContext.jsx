// src/contexts/SocketContext.jsx - LIGHTWEIGHT NO-OP VERSION
// The backend for this app has no Socket.IO server, so this provider never
// opens a socket. It still exposes the same shape the pages expect so they
// can safely subscribe (a null socket short-circuits all handlers).
import React, { createContext, useContext } from 'react';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    console.warn('useSocket called outside SocketProvider, returning defaults');
    return {
      socket: null,
      connected: false,
      notifications: [],
      unreadCount: 0,
      markAsRead: () => {},
      markAllAsRead: () => {},
      clearNotifications: () => {},
      removeNotification: () => {}
    };
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const value = {
    socket: null,
    connected: false,
    notifications: [],
    unreadCount: 0,
    markAsRead: () => {},
    markAllAsRead: () => {},
    clearNotifications: () => {},
    removeNotification: () => {}
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};