import express from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { AIStrategyEngine } from '../services/ai-strategy-engine';

const router = express.Router();

// Mock services - in production, these would be injected
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const aiEngine = new AIStrategyEngine(prisma, redis, {}, {}, {} as any);

/**
 * POST /api/ai/recommendation
 * Generate AI recommendation for user
 */
router.post('/recommendation', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const recommendation = await aiEngine.generateRecommendation(userId);
    
    res.json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    console.error('Error generating AI recommendation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI recommendation'
    });
  }
});

/**
 * POST /api/ai/action
 * Execute AI action
 */
router.post('/action', async (req, res) => {
  try {
    const { userId, vaultId, action, confidence, expectedReturn } = req.body;
    
    if (!userId || !action) {
      return res.status(400).json({
        success: false,
        error: 'User ID and action are required'
      });
    }

    await aiEngine.processAIRecommendation({
      userId,
      vaultId: vaultId || 'global',
      action,
      confidence: confidence || 85,
      expectedReturn: expectedReturn || 10,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      message: 'AI action processed successfully'
    });
  } catch (error) {
    console.error('Error processing AI action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process AI action'
    });
  }
});

/**
 * GET /api/ai/recommendations/:userId
 * Get user's AI recommendations
 */
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    
    const recommendations = await aiEngine.getUserRecommendations(
      userId, 
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error fetching AI recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI recommendations'
    });
  }
});

/**
 * GET /api/ai/performance
 * Get AI performance metrics
 */
router.get('/performance', async (req, res) => {
  try {
    const metrics = await aiEngine.getAIPerformanceMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching AI performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI performance metrics'
    });
  }
});

/**
 * POST /api/ai/sync
 * Trigger AI sync across chains
 */
router.post('/sync', async (req, res) => {
  try {
    const { userId, action, confidence } = req.body;
    
    if (!userId || !action) {
      return res.status(400).json({
        success: false,
        error: 'User ID and action are required'
      });
    }

    // Mock AI sync - in production, this would trigger cross-chain AI sync
    console.log(`🤖 AI sync triggered for user ${userId}: ${action}`);
    
    res.json({
      success: true,
      message: 'AI sync initiated successfully'
    });
  } catch (error) {
    console.error('Error triggering AI sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger AI sync'
    });
  }
});

export default router;
