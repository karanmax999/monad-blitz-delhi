import express from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { ethers } from 'ethers';
import client from 'prom-client';
import { DeploymentConfig } from '../types/config';

// Prometheus metrics
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const vaultTVLMetric = new client.Gauge({
  name: 'manix_vault_tvl_total',
  help: 'Total Value Locked in MANI X AI vaults',
  labelNames: ['chain_id', 'vault_address', 'vault_name'],
  registers: [register]
});

const crossChainTransactionsMetric = new client.Counter({
  name: 'manix_crosschain_transactions_total',
  help: 'Total cross-chain transactions processed',
  labelNames: ['source_chain', 'target_chain', 'transaction_type', 'status'],
  registers: [register]
});

const aiRecommendationsMetric = new client.Counter({
  name: 'manix_ai_recommendations_total',
  help: 'Total AI recommendations generated',
  labelNames: ['action', 'confidence_level', 'status'],
  registers: [register]
});

const riskScoreMetric = new client.Gauge({
  name: 'manix_vault_risk_score',
  help: 'Risk score for vaults',
  labelNames: ['chain_id', 'vault_address'],
  registers: [register]
});

const gasUsageMetric = new client.Histogram({
  name: 'manix_transaction_gas_usage',
  help: 'Gas usage for transactions',
  labelNames: ['chain_id', 'transaction_type'],
  buckets: [100000, 200000, 500000, 1000000, 2000000],
  registers: [register]
});

const websocketConnectionsMetric = new client.Gauge({
  name: 'manix_websocket_connections',
  help: 'Number of active WebSocket connections',
  registers: [register]
});

const apiResponseTimeMetric = new client.Histogram({
  name: 'manix_api_response_time',
  help: 'API response time in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
  registers: [register]
});

const errorRateMetric = new client.Counter({
  name: 'manix_errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'component', 'severity'],
  registers: [register]
});

export class MonitoringService {
  private app: express.Application;
  private prisma: PrismaClient;
  private redis: Redis;
  private config: { [chainId: string]: DeploymentConfig };
  private providers: { [chainId: string]: ethers.providers.JsonRpcProvider };
  private isRunning: boolean = false;

  constructor(
    prisma: PrismaClient,
    redis: Redis,
    config: { [chainId: string]: DeploymentConfig },
    providers: { [chainId: string]: ethers.providers.JsonRpcProvider }
  ) {
    this.prisma = prisma;
    this.redis = redis;
    this.config = config;
    this.providers = providers;
    this.app = express();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Start monitoring service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Monitoring service already running');
      return;
    }

    try {
      // Start metrics collection
      await this.startMetricsCollection();
      
      // Start Prometheus metrics endpoint
      this.app.get('/metrics', async (req, res) => {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
      });

      // Start server
      const port = process.env.MONITORING_PORT || 9090;
      this.app.listen(port, () => {
        console.log(`📊 Monitoring service running on port ${port}`);
        console.log(`📈 Prometheus metrics available at http://localhost:${port}/metrics`);
        this.isRunning = true;
      });

    } catch (error) {
      console.error('❌ Failed to start monitoring service:', error);
      throw error;
    }
  }

  /**
   * Start metrics collection
   */
  private async startMetricsCollection(): Promise<void> {
    console.log('📊 Starting metrics collection...');

    // Collect vault TVL metrics every 30 seconds
    setInterval(async () => {
      await this.collectVaultTVLMetrics();
    }, 30000);

    // Collect risk metrics every minute
    setInterval(async () => {
      await this.collectRiskMetrics();
    }, 60000);

    // Collect system metrics every 10 seconds
    setInterval(async () => {
      await this.collectSystemMetrics();
    }, 10000);

    console.log('✅ Metrics collection started');
  }

  /**
   * Collect vault TVL metrics
   */
  private async collectVaultTVLMetrics(): Promise<void> {
    try {
      for (const [chainId, chainConfig] of Object.entries(this.config)) {
        const vaultAddress = chainConfig.contracts.vault;
        
        if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
          continue;
        }

        // Get TVL from Redis cache
        const tvlData = await this.redis.hgetall(`vault:${vaultAddress}:tvl`);
        const totalTVL = tvlData.total || '0';

        // Update Prometheus metric
        vaultTVLMetric.set(
          { 
            chain_id: chainId, 
            vault_address: vaultAddress,
            vault_name: chainConfig.config.name 
          },
          parseFloat(totalTVL)
        );
      }
    } catch (error) {
      console.error('Error collecting vault TVL metrics:', error);
      errorRateMetric.inc({ error_type: 'metrics_collection', component: 'vault_tvl', severity: 'warning' });
    }
  }

  /**
   * Collect risk metrics
   */
  private async collectRiskMetrics(): Promise<void> {
    try {
      const riskMetrics = await this.prisma.riskMetric.findMany({
        orderBy: { timestamp: 'desc' },
        distinct: ['vaultId', 'chainId']
      });

      for (const metric of riskMetrics) {
        riskScoreMetric.set(
          { 
            chain_id: metric.chainId, 
            vault_address: metric.vaultId 
          },
          metric.riskScore
        );
      }
    } catch (error) {
      console.error('Error collecting risk metrics:', error);
      errorRateMetric.inc({ error_type: 'metrics_collection', component: 'risk_metrics', severity: 'warning' });
    }
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      // WebSocket connections
      const wsConnections = await this.redis.scard('websocket:connections');
      websocketConnectionsMetric.set(wsConnections);

      // Database connections
      const dbConnections = await this.prisma.$queryRaw`SELECT count(*) as count FROM pg_stat_activity`;
      
      // Redis memory usage
      const redisInfo = await this.redis.info('memory');
      const usedMemory = redisInfo.match(/used_memory:(\d+)/)?.[1] || '0';

    } catch (error) {
      console.error('Error collecting system metrics:', error);
      errorRateMetric.inc({ error_type: 'metrics_collection', component: 'system_metrics', severity: 'warning' });
    }
  }

  /**
   * Record cross-chain transaction
   */
  recordCrossChainTransaction(
    sourceChain: string,
    targetChain: string,
    type: 'DEPOSIT' | 'WITHDRAW',
    status: 'SUCCESS' | 'FAILED' | 'PENDING',
    gasUsed?: string
  ): void {
    crossChainTransactionsMetric.inc({
      source_chain: sourceChain,
      target_chain: targetChain,
      transaction_type: type,
      status
    });

    if (gasUsed) {
      gasUsageMetric.observe(
        { chain_id: sourceChain, transaction_type: type },
        parseFloat(gasUsed)
      );
    }
  }

  /**
   * Record AI recommendation
   */
  recordAIRecommendation(
    action: string,
    confidence: number,
    status: 'GENERATED' | 'EXECUTED' | 'FAILED'
  ): void {
    const confidenceLevel = confidence >= 90 ? 'high' : confidence >= 70 ? 'medium' : 'low';
    
    aiRecommendationsMetric.inc({
      action,
      confidence_level: confidenceLevel,
      status
    });
  }

  /**
   * Record API response time
   */
  recordAPIResponseTime(
    method: string,
    route: string,
    statusCode: number,
    duration: number
  ): void {
    apiResponseTimeMetric.observe(
      { method, route, status_code: statusCode.toString() },
      duration
    );
  }

  /**
   * Record error
   */
  recordError(
    errorType: string,
    component: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    errorRateMetric.inc({
      error_type: errorType,
      component,
      severity
    });
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Request logging middleware
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.recordAPIResponseTime(req.method, req.route?.path || req.path, res.statusCode, duration);
      });
      
      next();
    });

    // Error handling middleware
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.recordError('api_error', 'monitoring_service', 'medium');
      console.error('Monitoring service error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics: {
          vaultTVL: vaultTVLMetric.hashMap,
          crossChainTransactions: crossChainTransactionsMetric.hashMap,
          aiRecommendations: aiRecommendationsMetric.hashMap,
          riskScores: riskScoreMetric.hashMap
        }
      });
    });

    // Metrics summary
    this.app.get('/metrics/summary', async (req, res) => {
      try {
        const metrics = await register.getMetricsAsJSON();
        res.json({
          timestamp: new Date().toISOString(),
          metrics: metrics.map(metric => ({
            name: metric.name,
            help: metric.help,
            type: metric.type,
            values: metric.values
          }))
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get metrics summary' });
      }
    });

    // Custom metrics endpoint
    this.app.post('/metrics/custom', (req, res) => {
      const { name, value, labels = {} } = req.body;
      
      if (!name || value === undefined) {
        return res.status(400).json({ error: 'Name and value are required' });
      }

      // Create custom metric if it doesn't exist
      if (!register.getSingleMetric(name)) {
        const customMetric = new client.Gauge({
          name,
          help: `Custom metric: ${name}`,
          labelNames: Object.keys(labels),
          registers: [register]
        });
      }

      const metric = register.getSingleMetric(name) as client.Gauge;
      if (metric) {
        metric.set(labels, value);
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Failed to create metric' });
      }
    });
  }

  /**
   * Get monitoring dashboard data
   */
  async getDashboardData(): Promise<any> {
    try {
      const metrics = await register.getMetricsAsJSON();
      
      // Get recent transactions
      const recentTransactions = await this.prisma.transaction.findMany({
        orderBy: { timestamp: 'desc' },
        take: 10
      });

      // Get AI recommendations
      const recentRecommendations = await this.prisma.aiRecommendation.findMany({
        orderBy: { timestamp: 'desc' },
        take: 10
      });

      // Get risk metrics
      const riskMetrics = await this.prisma.riskMetric.findMany({
        orderBy: { timestamp: 'desc' },
        take: 5
      });

      return {
        timestamp: new Date().toISOString(),
        metrics: metrics.reduce((acc, metric) => {
          acc[metric.name] = {
            help: metric.help,
            type: metric.type,
            values: metric.values
          };
          return acc;
        }, {} as any),
        recentTransactions,
        recentRecommendations,
        riskMetrics,
        systemHealth: {
          database: 'healthy',
          redis: 'healthy',
          websocket: 'healthy'
        }
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring service
   */
  async stop(): Promise<void> {
    if (this.isRunning) {
      console.log('🛑 Stopping monitoring service...');
      this.isRunning = false;
      // Additional cleanup if needed
    }
  }
}

// Export metrics for use in other services
export {
  vaultTVLMetric,
  crossChainTransactionsMetric,
  aiRecommendationsMetric,
  riskScoreMetric,
  gasUsageMetric,
  websocketConnectionsMetric,
  apiResponseTimeMetric,
  errorRateMetric,
  register
};
