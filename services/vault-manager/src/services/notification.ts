import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { NotificationData } from '../types/events';

export class NotificationService {
  private io: SocketIOServer;
  private prisma: PrismaClient;
  private redis: Redis;

  constructor(
    io: SocketIOServer,
    prisma: PrismaClient,
    redis: Redis
  ) {
    this.io = io;
    this.prisma = prisma;
    this.redis = redis;
  }

  /**
   * Send notification to user
   */
  async sendNotification(data: NotificationData): Promise<void> {
    const { type, userId, message, data: notificationData, timestamp } = data;

    try {
      // Store notification in database
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          message,
          data: JSON.stringify(notificationData),
          timestamp
        }
      });

      // Send real-time notification via WebSocket
      this.io.to(`user-${userId}`).emit('notification', {
        id: notification.id,
        type,
        message,
        data: notificationData,
        timestamp
      });

      // Send to specific channels based on type
      switch (type) {
        case 'AI_RECOMMENDATION':
          this.io.to('ai-channel').emit('ai-recommendation', {
            userId,
            message,
            data: notificationData
          });
          break;
        case 'VAULT_ALERT':
          this.io.to(`vault-${notificationData.vaultId}`).emit('vault-alert', {
            userId,
            message,
            data: notificationData
          });
          break;
        case 'RISK_ALERT':
          this.io.to('risk-channel').emit('risk-alert', {
            userId,
            message,
            data: notificationData
          });
          break;
        case 'CROSS_CHAIN_UPDATE':
          this.io.to('crosschain-channel').emit('crosschain-update', {
            userId,
            message,
            data: notificationData
          });
          break;
      }

      // Cache notification for quick access
      await this.redis.lpush(`notifications:${userId}`, JSON.stringify({
        id: notification.id,
        type,
        message,
        data: notificationData,
        timestamp
      }));

      // Keep only last 50 notifications in cache
      await this.redis.ltrim(`notifications:${userId}`, 0, 49);

      console.log(`📢 Notification sent: ${type} to user ${userId}`);

    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send Discord notification
   */
  async sendDiscordNotification(message: string, webhookUrl?: string): Promise<void> {
    const url = webhookUrl || process.env.DISCORD_WEBHOOK_URL;
    
    if (!url) {
      console.log('Discord webhook URL not configured');
      return;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          username: 'MANI X AI Bot',
          avatar_url: 'https://example.com/bot-avatar.png'
        })
      });

      if (!response.ok) {
        throw new Error(`Discord webhook failed: ${response.statusText}`);
      }

      console.log('📱 Discord notification sent');

    } catch (error) {
      console.error('Error sending Discord notification:', error);
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(
    to: string,
    subject: string,
    message: string,
    htmlContent?: string
  ): Promise<void> {
    // Mock email implementation - in production, use SendGrid, AWS SES, etc.
    console.log(`📧 Email notification sent to ${to}: ${subject}`);
    console.log(`Message: ${message}`);
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, limit: number = 20): Promise<any[]> {
    // Try cache first
    const cached = await this.redis.lrange(`notifications:${userId}`, 0, limit - 1);
    
    if (cached.length > 0) {
      return cached.map(n => JSON.parse(n));
    }

    // Fallback to database
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    return notifications.map(n => ({
      id: n.id,
      type: n.type,
      message: n.message,
      data: JSON.parse(n.data),
      timestamp: n.timestamp
    }));
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });

    console.log(`✅ Notification ${notificationId} marked as read`);
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.prisma.notification.count({
      where: {
        userId,
        read: false
      }
    });
  }
}
