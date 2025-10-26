import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Import services
import { VaultManagerService } from './services/vault-manager';
import { AIStrategyEngine } from './services/ai-strategy-engine';
import { RiskAnalyticsService } from './services/risk-analytics';
import { NotificationService } from './services/notification';
import { EventListener } from './services/event-listener';

// Import routes
import vaultRoutes from './routes/vaults';
import aiRoutes from './routes/ai';
import analyticsRoutes from './routes/analytics';
import notificationRoutes from './routes/notifications';

// Import types
import { DeploymentConfig, ChainConfig } from './types/config';
import { VaultEvent, AIRecommendation, RiskMetrics } from './types/events';

class MANIXAIBackend {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private prisma: PrismaClient;
  private redis: Redis;
  private queue: Queue;
  
  // Services
  private vaultManager: VaultManagerService;
  private aiEngine: AIStrategyEngine;
  private riskAnalytics: RiskAnalyticsService;
  private notificationService: NotificationService;
  private eventListener: EventListener;
  
  // Configuration
  private config: { [chainId: string]: DeploymentConfig };
  private providers: { [chainId: string]: ethers.providers.JsonRpcProvider };

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.queue = new Queue('manix-ai-tasks', {
      connection: this.redis
    });
    
    this.config = this.loadDeploymentConfig();
    this.providers = this.initializeProviders();
    
    this.initializeServices();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupWorkers();
  }

  private loadDeploymentConfig(): { [chainId: string]: DeploymentConfig } {
    const configPath = path.join(__dirname, '../packages/contracts/deployments/config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  }

  private initializeProviders(): { [chainId: string]: ethers.providers.JsonRpcProvider } {
    const providers: { [chainId: string]: ethers.providers.JsonRpcProvider } = {};
    
    const rpcUrls = {
      '123456789': process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz',
      '1': process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
      '137': process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
      '42161': process.env.ARBITRUM_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
      '56': process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/'
    };

    for (const [chainId, rpcUrl] of Object.entries(rpcUrls)) {
      providers[chainId] = new ethers.providers.JsonRpcProvider(rpcUrl);
    }

    return providers;
  }

  private initializeServices(): void {
    this.vaultManager = new VaultManagerService(
      this.prisma,
      this.redis,
      this.config,
      this.providers
    );

    this.aiEngine = new AIStrategyEngine(
      this.prisma,
      this.redis,
      this.config,
      this.providers,
      this.queue
    );

    this.riskAnalytics = new RiskAnalyticsService(
      this.prisma,
      this.redis,
      this.config
    );

    this.notificationService = new NotificationService(
      this.io,
      this.prisma,
      this.redis
    );

    this.eventListener = new EventListener(
      this.config,
      this.providers,
      this.vaultManager,
      this.aiEngine,
      this.riskAnalytics,
      this.notificationService
    );
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          redis: 'connected',
          queue: 'active'
        }
      });
    });
  }

  private setupRoutes(): void {
    this.app.use('/api/vaults', vaultRoutes);
    this.app.use('/api/ai', aiRoutes);
    this.app.use('/api/analytics', analyticsRoutes);
    this.app.use('/api/notifications', notificationRoutes);

    // Error handling middleware
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });
  }

  private setupWebSocket(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Join user to their specific room for personalized updates
      socket.on('join-user-room', (userId: string) => {
        socket.join(`user-${userId}`);
      });

      // Join vault-specific room for vault updates
      socket.on('join-vault-room', (vaultId: string) => {
        socket.join(`vault-${vaultId}`);
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private setupWorkers(): void {
    // AI Strategy Worker
    const aiWorker = new Worker('ai-strategy-tasks', async (job) => {
      const { userId, vaultId, action, confidence, expectedReturn } = job.data;
      
      try {
        await this.aiEngine.processAIRecommendation({
          userId,
          vaultId,
          action,
          confidence,
          expectedReturn,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('AI Strategy Worker Error:', error);
        throw error;
      }
    }, {
      connection: this.redis,
      concurrency: 5
    });

    // Risk Analytics Worker
    const riskWorker = new Worker('risk-analytics-tasks', async (job) => {
      const { vaultId, chainId } = job.data;
      
      try {
        await this.riskAnalytics.calculateRiskMetrics(vaultId, chainId);
      } catch (error) {
        console.error('Risk Analytics Worker Error:', error);
        throw error;
      }
    }, {
      connection: this.redis,
      concurrency: 3
    });

    // Notification Worker
    const notificationWorker = new Worker('notification-tasks', async (job) => {
      const { type, userId, message, data } = job.data;
      
      try {
        await this.notificationService.sendNotification({
          type,
          userId,
          message,
          data,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Notification Worker Error:', error);
        throw error;
      }
    }, {
      connection: this.redis,
      concurrency: 10
    });
  }

  public async start(): Promise<void> {
    try {
      // Initialize database
      await this.prisma.$connect();
      console.log('✅ Database connected');

      // Test Redis connection
      await this.redis.ping();
      console.log('✅ Redis connected');

      // Start event listeners
      await this.eventListener.start();
      console.log('✅ Event listeners started');

      // Start server
      const port = process.env.PORT || 3001;
      this.server.listen(port, () => {
        console.log(`🚀 MANI X AI Backend running on port ${port}`);
        console.log(`📊 WebSocket server ready for real-time updates`);
        console.log(`🔗 Available chains: ${Object.keys(this.config).join(', ')}`);
      });

    } catch (error) {
      console.error('❌ Failed to start backend:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    console.log('🛑 Shutting down MANI X AI Backend...');
    
    await this.eventListener.stop();
    await this.prisma.$disconnect();
    await this.redis.quit();
    await this.queue.close();
    
    this.server.close(() => {
      console.log('✅ Backend stopped gracefully');
    });
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the backend
const backend = new MANIXAIBackend();
backend.start().catch(console.error);

export default MANIXAIBackend;
