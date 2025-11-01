'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebSocketEvent, NotificationEvent } from '../types';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: NotificationEvent[];
  emitEvent: (event: string, data: any) => void;
  clearNotifications: () => void;
  markNotificationAsRead: (id: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);

  useEffect(() => {
    // Initialize Socket.IO connection
    const socketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Event handlers for vault events
    newSocket.on('CrossChainDepositInitiated', (data) => {
      console.log('Cross-chain deposit initiated:', data);
      addNotification({
        id: `deposit-init-${Date.now()}`,
        type: 'info',
        title: 'Cross-Chain Deposit Initiated',
        message: `Deposit of ${data.amount} ETH from ${data.sourceChain} to ${data.targetChain}`,
        timestamp: Date.now(),
        read: false,
      });
    });

    newSocket.on('HubDepositHandled', (data) => {
      console.log('Hub deposit handled:', data);
      addNotification({
        id: `hub-deposit-${Date.now()}`,
        type: 'success',
        title: 'Hub Deposit Processed',
        message: `Deposit processed successfully. Shares minted: ${data.shares}`,
        timestamp: Date.now(),
        read: false,
      });
    });

    newSocket.on('DVNValidationCompleted', (data) => {
      console.log('DVN validation completed:', data);
      addNotification({
        id: `dvn-validation-${Date.now()}`,
        type: 'success',
        title: 'DVN Validation Complete',
        message: `Cross-chain message validated successfully`,
        timestamp: Date.now(),
        read: false,
      });
    });

    newSocket.on('AIRecommendationGenerated', (data) => {
      console.log('AI recommendation generated:', data);
      addNotification({
        id: `ai-recommendation-${Date.now()}`,
        type: 'info',
        title: 'AI Recommendation Available',
        message: `New strategy recommendation with ${data.confidence}% confidence`,
        timestamp: Date.now(),
        read: false,
      });
    });

    newSocket.on('RiskAlert', (data) => {
      console.log('Risk alert:', data);
      addNotification({
        id: `risk-alert-${Date.now()}`,
        type: 'warning',
        title: 'Risk Alert',
        message: data.message,
        timestamp: Date.now(),
        read: false,
      });
    });

    newSocket.on('Error', (data) => {
      console.error('WebSocket error:', data);
      addNotification({
        id: `error-${Date.now()}`,
        type: 'error',
        title: 'System Error',
        message: data.message || 'An unexpected error occurred',
        timestamp: Date.now(),
        read: false,
      });
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  const addNotification = (notification: NotificationEvent) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50 notifications
  };

  const emitEvent = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot emit event:', event);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const value: WebSocketContextType = {
    socket,
    isConnected,
    notifications,
    emitEvent,
    clearNotifications,
    markNotificationAsRead,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
