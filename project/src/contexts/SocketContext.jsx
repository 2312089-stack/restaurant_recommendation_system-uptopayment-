// src/contexts/SocketContext.jsx - COMPLETE WORKING VERSION
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

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
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    const sellerToken = localStorage.getItem('sellerToken');
    const customerToken = localStorage.getItem('token');
    
    if (!sellerToken && !customerToken) {
      console.log('❌ No token found, skipping socket connection');
      return;
    }

    if (socketRef.current?.connected) {
      console.log('✅ Socket already connected, reusing existing connection');
      return;
    }

    console.log('🔌 Initializing socket connection...');
    
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 10000
    });

    socketRef.current = newSocket;

    // ==================== CONNECTION ====================
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setConnected(true);
      
      // ✅ CRITICAL FIX: Authenticate immediately on connect
      if (customerToken) {
        console.log('🔐 Authenticating as customer...');
        newSocket.emit('authenticate-user', customerToken);
      } else if (sellerToken) {
        console.log('🔐 Authenticating as seller...');
        newSocket.emit('authenticate-seller', sellerToken);
      }
    });

    newSocket.on('authenticated', (data) => {
      console.log('✅ AUTHENTICATED:', data);
      setConnected(true);
    });

    newSocket.on('auth-error', (error) => {
      console.error('❌ AUTH ERROR:', error);
      setConnected(false);
    });

    // ==================== CRITICAL FIX: NEW-NOTIFICATION LISTENER ====================
    newSocket.on('new-notification', (data) => {
      console.log('🔔 NEW NOTIFICATION EVENT RECEIVED:', data);
      
      const notification = data.notification;
      
      // Add to notifications state
      setNotifications(prev => [notification, ...prev]);
      
      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo192.png',
          badge: '/logo192.png',
          requireInteraction: true
        });
      }
      
      // Play audio
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('🔇 Audio disabled:', e.message));
      } catch (e) {
        console.log('Audio not available');
      }
      
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('new-notification', { 
        detail: notification,
        bubbles: true
      }));
    });

    // ==================== SELLER ACCEPTED ORDER ====================
    newSocket.on('seller-accepted-order', (data) => {
      console.log('🎉 SELLER ACCEPTED ORDER EVENT:', data);
      
      const notification = {
        id: Date.now(),
        type: 'seller-accepted',
        title: '🎉 Restaurant Accepted Your Order!',
        message: data.message || 'The restaurant has confirmed your order. You can now proceed with payment.',
        timestamp: new Date(),
        read: false,
        orderId: data.orderId,
        orderMongoId: data.orderMongoId || data._id,
        status: 'seller_accepted'
      };
      
      setNotifications(prev => [notification, ...prev]);
      
      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Order Accepted! 🎉', {
          body: notification.message,
          icon: '/logo192.png',
          requireInteraction: true
        });
      }
      
      // Dispatch events
      window.dispatchEvent(new CustomEvent('seller-accepted-order', { 
        detail: data,
        bubbles: true
      }));
      
      window.dispatchEvent(new CustomEvent('order-status-updated', { 
        detail: data,
        bubbles: true
      }));
    });

    // ==================== ORDER CONFIRMED ====================
    newSocket.on('order-confirmed', (data) => {
      console.log('✅ ORDER CONFIRMED EVENT:', data);
      
      const notification = {
        id: Date.now(),
        type: 'order-confirmed',
        title: '🎉 Restaurant Accepted Your Order!',
        message: 'The restaurant has confirmed your order. Proceed with payment.',
        timestamp: new Date(),
        read: false,
        orderId: data.orderId,
        orderMongoId: data.orderMongoId || data._id,
        status: data.status || 'seller_accepted'
      };
      
      setNotifications(prev => [notification, ...prev]);
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Order Accepted!', {
          body: notification.message,
          icon: '/logo192.png'
        });
      }
      
      window.dispatchEvent(new CustomEvent('order-confirmed', { 
        detail: data,
        bubbles: true
      }));
    });

    // ==================== ORDER STATUS UPDATED ====================
    newSocket.on('order-status-updated', (data) => {
      console.log('📦 ORDER STATUS UPDATED EVENT:', data);
      
      const statusMessages = {
        'seller_accepted': '✅ Restaurant accepted your order!',
        'seller_rejected': '❌ Restaurant declined your order',
        'confirmed': '✅ Order confirmed',
        'preparing': '👨‍🍳 Your food is being prepared',
        'ready': '✓ Your order is ready!',
        'out_for_delivery': '🚗 Your order is on the way',
        'delivered': '🎉 Order delivered!'
      };
      
      const notification = {
        id: Date.now(),
        type: 'status-update',
        title: 'Order Status Updated',
        message: statusMessages[data.status] || data.message || `Order ${data.status}`,
        timestamp: new Date(),
        read: false,
        orderId: data.orderId,
        orderMongoId: data.orderMongoId || data._id,
        status: data.status,
        cancellationReason: data.cancellationReason
      };
      
      setNotifications(prev => [notification, ...prev]);
      
      // Show browser notification for important statuses
      if ('Notification' in window && Notification.permission === 'granted') {
        if (['seller_accepted', 'seller_rejected', 'ready', 'out_for_delivery', 'delivered'].includes(data.status)) {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/logo192.png'
          });
        }
      }
      
      window.dispatchEvent(new CustomEvent('order-status-updated', { 
        detail: data,
        bubbles: true
      }));
    });

    // ==================== STATUS UPDATE (ALTERNATIVE) ====================
    newSocket.on('status-update', (data) => {
      console.log('📦 STATUS UPDATE EVENT:', data);
      window.dispatchEvent(new CustomEvent('status-update', { 
        detail: data,
        bubbles: true
      }));
    });

    // ==================== NEW ORDER (FOR SELLERS) ====================
    newSocket.on('new-order', (data) => {
      console.log('🔔 NEW ORDER RECEIVED:', data);

      const notification = {
        id: Date.now(),
        type: 'new-order',
        title: data.notification?.title || 'New Order',
        message: data.notification?.message || 'You have a new order',
        timestamp: new Date(),
        read: false,
        order: data.order
      };
      
      setNotifications(prev => [notification, ...prev]);

      // Play audio for new orders
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('🔇 Audio disabled:', e.message));
      } catch (e) {
        console.log('Audio not available');
      }

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo192.png',
          badge: '/logo192.png'
        });
      }

      window.dispatchEvent(new CustomEvent('new-order', { 
        detail: data.order,
        bubbles: true
      }));
    });

    // ==================== DISCONNECT ====================
    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setConnected(false);
      
      if (reason === 'io server disconnect') {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting manual reconnection...');
          newSocket.connect();
        }, 2000);
      }
    });

    // ==================== ERROR HANDLERS ====================
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    setSocket(newSocket);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('📢 Notification permission:', permission);
      });
    }

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up socket connection');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  const value = {
    socket,
    connected,
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    markAsRead: (id) => {
      setNotifications(prev => 
        prev.map(n => (n.id === id || n._id === id) ? { ...n, read: true } : n)
      );
    },
    markAllAsRead: () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    },
    clearNotifications: () => setNotifications([]),
    removeNotification: (id) => {
      setNotifications(prev => prev.filter(n => n.id !== id && n._id !== id));
    }
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};