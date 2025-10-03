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
      console.log('No token found, skipping socket connection');
      return;
    }

    // Prevent duplicate connections
    if (socketRef.current?.connected) {
      console.log('Socket already connected, reusing existing connection');
      return;
    }

    console.log('🔌 Initializing socket connection...');
    
    // Use environment variable or fallback to localhost
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
      auth: {
        token: sellerToken || customerToken,
        type: sellerToken ? 'seller' : 'customer'
      }
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setConnected(true);

      // Clear any pending reconnection timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Authenticate based on user type
      if (sellerToken) {
        console.log('🏪 Authenticating seller');
        newSocket.emit('authenticate-seller', sellerToken);
      } else if (customerToken) {
        console.log('👤 Authenticating customer');
        newSocket.emit('authenticate-user', customerToken);
      }
    });

    newSocket.on('authenticated', (data) => {
      console.log('✅ Authentication successful:', data);
      
      // Join user-specific room if customer
      if (data.userEmail && data.userType === 'customer') {
        const userRoom = `user-${data.userEmail}`;
        console.log('📥 Joining user room:', userRoom);
        newSocket.emit('join', userRoom);
      }
    });

    newSocket.on('auth-error', (error) => {
      console.error('❌ Authentication failed:', error);
      setConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setConnected(false);
      
      // Auto-reconnect after delay if disconnection wasn't intentional
      if (reason === 'io server disconnect') {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting manual reconnection...');
          newSocket.connect();
        }, 2000);
      }
    });

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

    // Listen for new orders (sellers)
    newSocket.on('new-order', (data) => {
      console.log('🔔 New order received:', data);
      
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

      // Play notification sound
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
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

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('new-order', { detail: data.order }));
    });

    // Listen for order confirmations (customers)
    newSocket.on('order-confirmed', (data) => {
      console.log('✅ Order confirmed:', data);
      
      const notification = {
        id: Date.now(),
        type: 'order-confirmed',
        title: 'Order Confirmed',
        message: data.message || 'Your order has been confirmed',
        timestamp: new Date(),
        read: false,
        orderId: data.orderId
      };
      
      setNotifications(prev => [notification, ...prev]);
      
      window.dispatchEvent(new CustomEvent('order-confirmed', { detail: data }));
    });

    // Listen for order status updates (customers)
    newSocket.on('order-status-updated', (data) => {
      console.log('📦 Order status updated:', data);
      
      const notification = {
        id: Date.now(),
        type: 'status-update',
        title: 'Order Status Updated',
        message: data.message || `Order ${data.status}`,
        timestamp: new Date(),
        read: false,
        orderId: data.orderId,
        status: data.status
      };
      
      setNotifications(prev => [notification, ...prev]);
      
      // Show browser notification for important updates
      if ('Notification' in window && Notification.permission === 'granted') {
        if (['confirmed', 'ready', 'out_for_delivery', 'delivered'].includes(data.status)) {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/logo192.png'
          });
        }
      }
      
      window.dispatchEvent(new CustomEvent('order-status-updated', { detail: data }));
    });

    setSocket(newSocket);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }

    return () => {
      console.log('Cleaning up socket connection');
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
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    },
    markAllAsRead: () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    },
    clearNotifications: () => setNotifications([]),
    removeNotification: (id) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};