import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { ethers } from 'ethers';
import { Queue } from 'bullmq';
import { DeploymentConfig } from '../types/config';
import { AIRecommendation, AIAction } from '../types/events';

// Mock Gemini/MCP API integration
class GeminiAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateRecommendation(
    userPortfolio: any,
    marketData: any,
    riskProfile: any
  ): Promise<{
    action: string;
    confidence: number;
    expectedReturn: number;
    reasoning: string;
  }> {
    // Mock AI recommendation logic
    // In production, this would call Gemini API with proper prompts
    
    const actions = ['REBALANCE', 'INCREASE_RISK', 'DECREASE_RISK', 'HOLD', 'DIVERSIFY'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    const confidence = Math.floor(Math.random() * 30) + 70; // 70-100%
    const expectedReturn = Math.floor(Math.random() * 20) + 5; // 5-25%
    
    const reasoning = `Based on current market conditions and your portfolio composition, 
                      I recommend ${action.toLowerCase()} with ${confidence}% confidence. 
                      Expected return: ${expectedReturn}%`;

    return {
      action,
      confidence,
      expectedReturn,
      reasoning
    };
  }
}

export class AIStrategyEngine {
  private prisma: PrismaClient;
  private redis: Redis;
  private config: { [chainId: string]: DeploymentConfig };
  private providers: { [chainId: string]: ethers.providers.JsonRpcProvider };
  private queue: Queue;
  private geminiAPI: GeminiAPI;
  
  // Rate limiting
  private rateLimiter: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly RATE_LIMIT = 10; // requests per minute
  private readonly RATE_WINDOW = 60 * 1000; // 1 minute

  constructor(
    prisma: PrismaClient,
    redis: Redis,
    config: { [chainId: string]: DeploymentConfig },
    providers: { [chainId: string]: ethers.providers.JsonRpcProvider },
    queue: Queue
  ) {
    this.prisma = prisma;
    this.redis = redis;
    this.config = config;
    this.providers = providers;
    this.queue = queue;
    this.geminiAPI = new GeminiAPI(process.env.GEMINI_API_KEY || 'mock-key');
  }

  /**
   * Process AI recommendation with rate limiting and confidence threshold
   */
  async processAIRecommendation(data: {
    userId: string;
    vaultId: string;
    action: string;
    confidence: number;
    expectedReturn: number;
    timestamp: Date;
  }): Promise<void> {
    const { userId, vaultId, action, confidence, expectedReturn } = data;

    // Rate limiting check
    if (!this.checkRateLimit(userId)) {
      console.log(`Rate limit exceeded for user ${userId}`);
      return;
    }

    // Confidence threshold check
    if (confidence < 70) {
      console.log(`Confidence too low: ${confidence}% for user ${userId}`);
      return;
    }

    try {
      // Store recommendation in database
      const recommendation = await this.prisma.aiRecommendation.create({
        data: {
          userId,
          vaultId,
          action,
          confidence,
          expectedReturn,
          status: 'PENDING',
          timestamp: new Date()
        }
      });

      // Execute recommendation if confidence is high enough
      if (confidence >= 85) {
        await this.executeRecommendation(recommendation);
      } else {
        // Queue for manual review
        await this.queueRecommendationForReview(recommendation);
      }

      // Update user's AI interaction stats
      await this.updateAIStats(userId, action, confidence);

      console.log(`🤖 AI recommendation processed: ${action} (${confidence}%) for user ${userId}`);

    } catch (error) {
      console.error('Error processing AI recommendation:', error);
      throw error;
    }
  }

  /**
   * Generate AI recommendation based on user portfolio and market data
   */
  async generateRecommendation(userId: string): Promise<AIRecommendation> {
    try {
      // Get user portfolio data
      const portfolio = await this.getUserPortfolioData(userId);
      
      // Get market data
      const marketData = await this.getMarketData();
      
      // Get user risk profile
      const riskProfile = await this.getUserRiskProfile(userId);

      // Generate recommendation using Gemini API
      const recommendation = await this.geminiAPI.generateRecommendation(
        portfolio,
        marketData,
        riskProfile
      );

      // Create recommendation record
      const aiRecommendation: AIRecommendation = {
        userId,
        action: recommendation.action as AIAction,
        confidence: recommendation.confidence,
        expectedReturn: recommendation.expectedReturn,
        reasoning: recommendation.reasoning,
        timestamp: new Date(),
        status: 'GENERATED'
      };

      // Store in database
      await this.prisma.aiRecommendation.create({
        data: {
          userId,
          vaultId: 'global', // Global recommendation
          action: recommendation.action,
          confidence: recommendation.confidence,
          expectedReturn: recommendation.expectedReturn,
          reasoning: recommendation.reasoning,
          status: 'GENERATED',
          timestamp: new Date()
        }
      });

      return aiRecommendation;

    } catch (error) {
      console.error('Error generating AI recommendation:', error);
      throw error;
    }
  }

  /**
   * Execute AI recommendation on-chain
   */
  private async executeRecommendation(recommendation: any): Promise<void> {
    const { userId, vaultId, action, confidence, expectedReturn } = recommendation;

    try {
      // Get user's wallet address
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.walletAddress) {
        throw new Error(`User ${userId} not found or no wallet address`);
      }

      // Execute action based on recommendation
      switch (action) {
        case 'REBALANCE':
          await this.executeRebalance(user.walletAddress, vaultId);
          break;
        case 'INCREASE_RISK':
          await this.executeIncreaseRisk(user.walletAddress, vaultId);
          break;
        case 'DECREASE_RISK':
          await this.executeDecreaseRisk(user.walletAddress, vaultId);
          break;
        case 'DIVERSIFY':
          await this.executeDiversify(user.walletAddress, vaultId);
          break;
        case 'HOLD':
          // No action needed
          break;
        default:
          console.log(`Unknown action: ${action}`);
      }

      // Update recommendation status
      await this.prisma.aiRecommendation.update({
        where: { id: recommendation.id },
        data: { 
          status: 'EXECUTED',
          executedAt: new Date()
        }
      });

      console.log(`✅ AI recommendation executed: ${action} for user ${userId}`);

    } catch (error) {
      console.error('Error executing AI recommendation:', error);
      
      // Update recommendation status to failed
      await this.prisma.aiRecommendation.update({
        where: { id: recommendation.id },
        data: { 
          status: 'FAILED',
          errorMessage: error.message
        }
      });
    }
  }

  /**
   * Execute rebalance action
   */
  private async executeRebalance(walletAddress: string, vaultId: string): Promise<void> {
    // Get vault contract
    const vaultConfig = Object.values(this.config).find(c => c.contracts.vault === vaultId);
    if (!vaultConfig) {
      throw new Error(`Vault ${vaultId} not found in config`);
    }

    const provider = this.providers[vaultConfig.network.chainId.toString()];
    const vaultContract = new ethers.Contract(
      vaultId,
      ['function rebalance() external'],
      provider
    );

    // Execute rebalance (this would need proper wallet signing in production)
    console.log(`🔄 Executing rebalance for ${walletAddress} on vault ${vaultId}`);
  }

  /**
   * Execute increase risk action
   */
  private async executeIncreaseRisk(walletAddress: string, vaultId: string): Promise<void> {
    console.log(`📈 Executing increase risk for ${walletAddress} on vault ${vaultId}`);
    // Implementation would depend on specific vault strategy
  }

  /**
   * Execute decrease risk action
   */
  private async executeDecreaseRisk(walletAddress: string, vaultId: string): Promise<void> {
    console.log(`📉 Executing decrease risk for ${walletAddress} on vault ${vaultId}`);
    // Implementation would depend on specific vault strategy
  }

  /**
   * Execute diversify action
   */
  private async executeDiversify(walletAddress: string, vaultId: string): Promise<void> {
    console.log(`🎯 Executing diversify for ${walletAddress} on vault ${vaultId}`);
    // Implementation would depend on specific vault strategy
  }

  /**
   * Queue recommendation for manual review
   */
  private async queueRecommendationForReview(recommendation: any): Promise<void> {
    await this.queue.add('ai-review-task', {
      recommendationId: recommendation.id,
      userId: recommendation.userId,
      action: recommendation.action,
      confidence: recommendation.confidence
    });

    console.log(`📋 Recommendation queued for review: ${recommendation.id}`);
  }

  /**
   * Check rate limit for user
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.rateLimiter.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimiter.set(userId, {
        count: 1,
        resetTime: now + this.RATE_WINDOW
      });
      return true;
    }

    if (userLimit.count >= this.RATE_LIMIT) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  /**
   * Update AI interaction stats
   */
  private async updateAIStats(userId: string, action: string, confidence: number): Promise<void> {
    await this.redis.hincrby(`user:${userId}:ai`, 'recommendations', 1);
    await this.redis.hincrby(`user:${userId}:ai`, `${action.toLowerCase()}s`, 1);
    
    // Update confidence stats
    const confidenceKey = `confidence:${Math.floor(confidence / 10) * 10}`;
    await this.redis.hincrby(`user:${userId}:ai`, confidenceKey, 1);
  }

  /**
   * Get user portfolio data for AI analysis
   */
  private async getUserPortfolioData(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        transactions: true,
        vaultPositions: true
      }
    });

    return {
      totalValue: user?.totalValue || '0',
      riskTolerance: user?.riskTolerance || 'MODERATE',
      investmentGoals: user?.investmentGoals || [],
      positions: user?.vaultPositions || []
    };
  }

  /**
   * Get market data for AI analysis
   */
  private async getMarketData(): Promise<any> {
    // Mock market data - in production, this would fetch from Chainlink or other sources
    return {
      btcPrice: 45000,
      ethPrice: 3000,
      marketVolatility: 0.25,
      yieldRates: {
        ethereum: 0.05,
        polygon: 0.08,
        arbitrum: 0.06
      }
    };
  }

  /**
   * Get user risk profile
   */
  private async getUserRiskProfile(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    return {
      riskTolerance: user?.riskTolerance || 'MODERATE',
      investmentHorizon: user?.investmentHorizon || 'MEDIUM',
      maxDrawdown: user?.maxDrawdown || 0.15
    };
  }

  /**
   * Get AI recommendations for user
   */
  async getUserRecommendations(userId: string, limit: number = 10): Promise<any[]> {
    return await this.prisma.aiRecommendation.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  /**
   * Get AI performance metrics
   */
  async getAIPerformanceMetrics(): Promise<{
    totalRecommendations: number;
    executedRecommendations: number;
    averageConfidence: number;
    successRate: number;
  }> {
    const total = await this.prisma.aiRecommendation.count();
    const executed = await this.prisma.aiRecommendation.count({
      where: { status: 'EXECUTED' }
    });
    
    const avgConfidence = await this.prisma.aiRecommendation.aggregate({
      _avg: { confidence: true }
    });

    const successRate = total > 0 ? (executed / total) * 100 : 0;

    return {
      totalRecommendations: total,
      executedRecommendations: executed,
      averageConfidence: avgConfidence._avg.confidence || 0,
      successRate
    };
  }
}
