import express from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { VaultManagerService } from '../services/vault-manager';
import { AIStrategyEngine } from '../services/ai-strategy-engine';
import { RiskAnalyticsService } from '../services/risk-analytics';
import { NotificationService } from '../services/notification';

const router = express.Router();

// Mock services - in production, these would be injected
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const vaultManager = new VaultManagerService(prisma, redis, {}, {});
const aiEngine = new AIStrategyEngine(prisma, redis, {}, {}, {} as any);
const riskAnalytics = new RiskAnalyticsService(prisma, redis, {});
const notificationService = new NotificationService({} as any, prisma, redis);

/**
 * GET /api/vaults
 * Get all vaults with TVL data
 */
router.get('/', async (req, res) => {
  try {
    const vaults = await prisma.vault.findMany({
      include: {
        riskMetrics: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    const vaultsWithTVL = await Promise.all(
      vaults.map(async (vault) => {
        const tvl = await vaultManager.getVaultTVL(vault.address);
        return {
          ...vault,
          tvl
        };
      })
    );

    res.json({
      success: true,
      data: vaultsWithTVL
    });
  } catch (error) {
    console.error('Error fetching vaults:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vaults'
    });
  }
});

/**
 * GET /api/vaults/:vaultId
 * Get specific vault details
 */
router.get('/:vaultId', async (req, res) => {
  try {
    const { vaultId } = req.params;
    
    const vault = await prisma.vault.findUnique({
      where: { address: vaultId },
      include: {
        riskMetrics: {
          orderBy: { timestamp: 'desc' },
          take: 10
        }
      }
    });

    if (!vault) {
      return res.status(404).json({
        success: false,
        error: 'Vault not found'
      });
    }

    const tvl = await vaultManager.getVaultTVL(vaultId);
    const multiChainTVL = await vaultManager.getMultiChainTVL();

    res.json({
      success: true,
      data: {
        ...vault,
        tvl,
        multiChainTVL
      }
    });
  } catch (error) {
    console.error('Error fetching vault:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vault'
    });
  }
});

/**
 * GET /api/vaults/:vaultId/tvl
 * Get vault TVL data
 */
router.get('/:vaultId/tvl', async (req, res) => {
  try {
    const { vaultId } = req.params;
    const tvl = await vaultManager.getVaultTVL(vaultId);
    
    res.json({
      success: true,
      data: tvl
    });
  } catch (error) {
    console.error('Error fetching vault TVL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vault TVL'
    });
  }
});

/**
 * GET /api/vaults/:vaultId/risk-metrics
 * Get vault risk metrics
 */
router.get('/:vaultId/risk-metrics', async (req, res) => {
  try {
    const { vaultId } = req.params;
    const { chainId } = req.query;
    
    const riskMetrics = await riskAnalytics.getVaultRiskMetrics(
      vaultId, 
      chainId as string || '1'
    );
    
    res.json({
      success: true,
      data: riskMetrics
    });
  } catch (error) {
    console.error('Error fetching risk metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch risk metrics'
    });
  }
});

/**
 * POST /api/vaults/:vaultId/calculate-risk
 * Trigger risk metrics calculation
 */
router.post('/:vaultId/calculate-risk', async (req, res) => {
  try {
    const { vaultId } = req.params;
    const { chainId } = req.body;
    
    const riskMetrics = await riskAnalytics.calculateRiskMetrics(vaultId, chainId);
    
    res.json({
      success: true,
      data: riskMetrics
    });
  } catch (error) {
    console.error('Error calculating risk metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate risk metrics'
    });
  }
});

/**
 * GET /api/vaults/multi-chain/tvl
 * Get multi-chain TVL summary
 */
router.get('/multi-chain/tvl', async (req, res) => {
  try {
    const multiChainTVL = await vaultManager.getMultiChainTVL();
    
    res.json({
      success: true,
      data: multiChainTVL
    });
  } catch (error) {
    console.error('Error fetching multi-chain TVL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch multi-chain TVL'
    });
  }
});

/**
 * GET /api/vaults/:vaultId/transactions
 * Get vault transactions
 */
router.get('/:vaultId/transactions', async (req, res) => {
  try {
    const { vaultId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const transactions = await prisma.transaction.findMany({
      where: { vaultId },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching vault transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vault transactions'
    });
  }
});

export default router;
