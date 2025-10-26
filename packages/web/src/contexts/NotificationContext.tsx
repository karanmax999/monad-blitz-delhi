'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useWebSocket } from './WebSocketContext';

interface Notification {
  id: string;
  type: string;
  message: string;
  data: any;
  timestamp: Date;
  read?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  showNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { notifications: wsNotifications, unreadCount: wsUnreadCount } = useWebSocket();
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);

  const allNotifications = [...wsNotifications, ...localNotifications];

  const markAsRead = useCallback(async (id: string) => {
    try {
      // Mark notification as read in backend
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
      });

      // Update local state
      setLocalNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      // Mark all notifications as read in backend
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });

      // Update local state
      setLocalNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setLocalNotifications([]);
  }, []);

  const showNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    setLocalNotifications(prev => [newNotification, ...prev.slice(0, 49)]);

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new window.Notification(notification.message, {
        body: notification.data?.description || '',
        icon: '/favicon.ico',
      });
    }
  }, []);

  const value: NotificationContextType = {
    notifications: allNotifications,
    unreadCount: wsUnreadCount + localNotifications.filter(n => !n.read).length,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    showNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
