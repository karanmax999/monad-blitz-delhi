import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { ethers } from 'ethers';
import { DeploymentConfig } from '../types/config';
import { RiskMetrics } from '../types/events';

// Mock Chainlink price feed integration
class ChainlinkPriceFeed {
  private provider: ethers.providers.JsonRpcProvider;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this.provider = provider;
  }

  async getPrice(tokenAddress: string): Promise<number> {
    // Mock price feed - in production, this would call Chainlink contracts
    const mockPrices: { [key: string]: number } = {
      '0xA0b86a33E6441b8c4C8C0e4B8c4C8C0e4B8c4C8C0': 1.0, // USDC
      '0xB0b86a33E6441b8c4C8C0e4B8c4C8C0e4B8c4C8C0': 3000, // ETH
      '0xC0b86a33E6441b8c4C8C0e4B8c4C8C0e4B8c4C8C0': 45000, // BTC
    };
    
    return mockPrices[tokenAddress] || 1.0;
  }

  async getHistoricalPrices(tokenAddress: string, days: number): Promise<number[]> {
    // Mock historical data - in production, this would fetch from Chainlink or other sources
    const basePrice = await this.getPrice(tokenAddress);
    const prices: number[] = [];
    
    for (let i = 0; i < days; i++) {
      const volatility = 0.02; // 2% daily volatility
      const change = (Math.random() - 0.5) * volatility;
      prices.push(basePrice * (1 + change));
    }
    
    return prices;
  }
}

export class RiskAnalyticsService {
  private prisma: PrismaClient;
  private redis: Redis;
  private config: { [chainId: string]: DeploymentConfig };
  private chainlinkFeeds: { [chainId: string]: ChainlinkPriceFeed };

  constructor(
    prisma: PrismaClient,
    redis: Redis,
    config: { [chainId: string]: DeploymentConfig }
  ) {
    this.prisma = prisma;
    this.redis = redis;
    this.config = config;
    
    // Initialize Chainlink feeds for each chain
    this.chainlinkFeeds = {};
    for (const chainId of Object.keys(config)) {
      // Mock provider - in production, use actual RPC URLs
      const provider = new ethers.providers.JsonRpcProvider('https://mock-rpc.com');
      this.chainlinkFeeds[chainId] = new ChainlinkPriceFeed(provider);
    }
  }

  /**
   * Calculate comprehensive risk metrics for a vault
   */
  async calculateRiskMetrics(vaultId: string, chainId: string): Promise<RiskMetrics> {
    try {
      // Get vault data
      const vault = await this.prisma.vault.findUnique({
        where: { address: vaultId }
      });

      if (!vault) {
        throw new Error(`Vault ${vaultId} not found`);
      }

      // Get historical performance data
      const performanceData = await this.getHistoricalPerformance(vaultId, 30); // 30 days

      // Calculate APY
      const apy = await this.calculateAPY(vaultId, performanceData);

      // Calculate volatility
      const volatility = this.calculateVolatility(performanceData);

      // Calculate max drawdown
      const maxDrawdown = this.calculateMaxDrawdown(performanceData);

      // Calculate Sharpe ratio
      const sharpeRatio = this.calculateSharpeRatio(performanceData);

      // Calculate VaR (Value at Risk)
      const var95 = this.calculateVaR(performanceData, 0.95);
      const var99 = this.calculateVaR(performanceData, 0.99);

      // Calculate correlation with market
      const marketCorrelation = await this.calculateMarketCorrelation(vaultId, chainId);

      // Calculate risk score (0-100)
      const riskScore = this.calculateRiskScore({
        volatility,
        maxDrawdown,
        sharpeRatio,
        var95,
        marketCorrelation
      });

      const riskMetrics: RiskMetrics = {
        vaultId,
        chainId,
        apy,
        volatility,
        maxDrawdown,
        sharpeRatio,
        var95,
        var99,
        marketCorrelation,
        riskScore,
        timestamp: new Date()
      };

      // Store metrics in database
      await this.storeRiskMetrics(riskMetrics);

      // Cache metrics in Redis
      await this.cacheRiskMetrics(riskMetrics);

      console.log(`📊 Risk metrics calculated for vault ${vaultId}: APY ${apy}%, Risk Score ${riskScore}`);

      return riskMetrics;

    } catch (error) {
      console.error('Error calculating risk metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate APY (Annual Percentage Yield)
   */
  private async calculateAPY(vaultId: string, performanceData: number[]): Promise<number> {
    if (performanceData.length < 2) return 0;

    const startValue = performanceData[0];
    const endValue = performanceData[performanceData.length - 1];
    
    const totalReturn = (endValue - startValue) / startValue;
    const days = performanceData.length;
    const apy = Math.pow(1 + totalReturn, 365 / days) - 1;

    return apy * 100; // Convert to percentage
  }

  /**
   * Calculate volatility (standard deviation of returns)
   */
  private calculateVolatility(performanceData: number[]): number {
    if (performanceData.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < performanceData.length; i++) {
      const returnRate = (performanceData[i] - performanceData[i - 1]) / performanceData[i - 1];
      returns.push(returnRate);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * 100; // Convert to percentage
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(performanceData: number[]): number {
    if (performanceData.length < 2) return 0;

    let maxValue = performanceData[0];
    let maxDrawdown = 0;

    for (let i = 1; i < performanceData.length; i++) {
      if (performanceData[i] > maxValue) {
        maxValue = performanceData[i];
      }
      
      const drawdown = (maxValue - performanceData[i]) / maxValue;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown * 100; // Convert to percentage
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(performanceData: number[]): number {
    if (performanceData.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < performanceData.length; i++) {
      const returnRate = (performanceData[i] - performanceData[i - 1]) / performanceData[i - 1];
      returns.push(returnRate);
    }

    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Risk-free rate (assume 2% annually)
    const riskFreeRate = 0.02 / 365; // Daily risk-free rate
    
    return stdDev > 0 ? (meanReturn - riskFreeRate) / stdDev : 0;
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  private calculateVaR(performanceData: number[], confidence: number): number {
    if (performanceData.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < performanceData.length; i++) {
      const returnRate = (performanceData[i] - performanceData[i - 1]) / performanceData[i - 1];
      returns.push(returnRate);
    }

    // Sort returns in ascending order
    returns.sort((a, b) => a - b);
    
    // Find the percentile
    const index = Math.floor((1 - confidence) * returns.length);
    const varValue = Math.abs(returns[index]);

    return varValue * 100; // Convert to percentage
  }

  /**
   * Calculate correlation with market
   */
  private async calculateMarketCorrelation(vaultId: string, chainId: string): Promise<number> {
    // Get vault performance data
    const vaultData = await this.getHistoricalPerformance(vaultId, 30);
    
    // Get market performance data (mock - in production, use actual market data)
    const marketData = await this.getMarketPerformanceData(chainId, 30);

    if (vaultData.length !== marketData.length || vaultData.length < 2) {
      return 0;
    }

    // Calculate correlation coefficient
    const vaultReturns = this.calculateReturns(vaultData);
    const marketReturns = this.calculateReturns(marketData);

    const correlation = this.calculateCorrelationCoefficient(vaultReturns, marketReturns);
    
    return correlation;
  }

  /**
   * Calculate risk score (0-100)
   */
  private calculateRiskScore(metrics: {
    volatility: number;
    maxDrawdown: number;
    sharpeRatio: number;
    var95: number;
    marketCorrelation: number;
  }): number {
    const { volatility, maxDrawdown, sharpeRatio, var95, marketCorrelation } = metrics;

    // Weighted risk factors
    const volatilityScore = Math.min(volatility * 2, 100); // 2x weight
    const drawdownScore = Math.min(maxDrawdown * 1.5, 100); // 1.5x weight
    const varScore = Math.min(var95 * 3, 100); // 3x weight
    const correlationScore = Math.abs(marketCorrelation) * 20; // Market correlation risk

    // Sharpe ratio adjustment (negative Sharpe increases risk)
    const sharpeAdjustment = sharpeRatio < 0 ? 20 : Math.max(0, 10 - sharpeRatio * 5);

    // Calculate weighted risk score
    const riskScore = (
      volatilityScore * 0.3 +
      drawdownScore * 0.25 +
      varScore * 0.25 +
      correlationScore * 0.1 +
      sharpeAdjustment * 0.1
    );

    return Math.min(Math.max(riskScore, 0), 100);
  }

  /**
   * Get historical performance data
   */
  private async getHistoricalPerformance(vaultId: string, days: number): Promise<number[]> {
    // Mock implementation - in production, fetch from TimescaleDB or other time-series database
    const baseValue = 1000000; // $1M base value
    const performanceData: number[] = [];
    
    for (let i = 0; i < days; i++) {
      const dailyReturn = (Math.random() - 0.5) * 0.05; // ±2.5% daily return
      const value = baseValue * Math.pow(1 + dailyReturn, i);
      performanceData.push(value);
    }
    
    return performanceData;
  }

  /**
   * Get market performance data
   */
  private async getMarketPerformanceData(chainId: string, days: number): Promise<number[]> {
    // Mock market data - in production, fetch from Chainlink or other sources
    const baseValue = 1000; // Market index base value
    const marketData: number[] = [];
    
    for (let i = 0; i < days; i++) {
      const dailyReturn = (Math.random() - 0.5) * 0.03; // ±1.5% daily return
      const value = baseValue * Math.pow(1 + dailyReturn, i);
      marketData.push(value);
    }
    
    return marketData;
  }

  /**
   * Calculate returns from price data
   */
  private calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  /**
   * Calculate correlation coefficient
   */
  private calculateCorrelationCoefficient(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Store risk metrics in database
   */
  private async storeRiskMetrics(metrics: RiskMetrics): Promise<void> {
    await this.prisma.riskMetrics.create({
      data: {
        vaultId: metrics.vaultId,
        chainId: metrics.chainId,
        apy: metrics.apy,
        volatility: metrics.volatility,
        maxDrawdown: metrics.maxDrawdown,
        sharpeRatio: metrics.sharpeRatio,
        var95: metrics.var95,
        var99: metrics.var99,
        marketCorrelation: metrics.marketCorrelation,
        riskScore: metrics.riskScore,
        timestamp: metrics.timestamp
      }
    });
  }

  /**
   * Cache risk metrics in Redis
   */
  private async cacheRiskMetrics(metrics: RiskMetrics): Promise<void> {
    const key = `risk:${metrics.vaultId}:${metrics.chainId}`;
    await this.redis.hset(key, {
      apy: metrics.apy.toString(),
      volatility: metrics.volatility.toString(),
      maxDrawdown: metrics.maxDrawdown.toString(),
      sharpeRatio: metrics.sharpeRatio.toString(),
      var95: metrics.var95.toString(),
      var99: metrics.var99.toString(),
      marketCorrelation: metrics.marketCorrelation.toString(),
      riskScore: metrics.riskScore.toString(),
      timestamp: metrics.timestamp.toISOString()
    });

    // Set expiration (1 hour)
    await this.redis.expire(key, 3600);
  }

  /**
   * Get risk metrics for vault
   */
  async getVaultRiskMetrics(vaultId: string, chainId: string): Promise<RiskMetrics | null> {
    // Try cache first
    const cacheKey = `risk:${vaultId}:${chainId}`;
    const cached = await this.redis.hgetall(cacheKey);
    
    if (Object.keys(cached).length > 0) {
      return {
        vaultId,
        chainId,
        apy: parseFloat(cached.apy),
        volatility: parseFloat(cached.volatility),
        maxDrawdown: parseFloat(cached.maxDrawdown),
        sharpeRatio: parseFloat(cached.sharpeRatio),
        var95: parseFloat(cached.var95),
        var99: parseFloat(cached.var99),
        marketCorrelation: parseFloat(cached.marketCorrelation),
        riskScore: parseFloat(cached.riskScore),
        timestamp: new Date(cached.timestamp)
      };
    }

    // Fallback to database
    const metrics = await this.prisma.riskMetrics.findFirst({
      where: {
        vaultId,
        chainId
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    if (metrics) {
      return {
        vaultId: metrics.vaultId,
        chainId: metrics.chainId,
        apy: metrics.apy,
        volatility: metrics.volatility,
        maxDrawdown: metrics.maxDrawdown,
        sharpeRatio: metrics.sharpeRatio,
        var95: metrics.var95,
        var99: metrics.var99,
        marketCorrelation: metrics.marketCorrelation,
        riskScore: metrics.riskScore,
        timestamp: metrics.timestamp
      };
    }

    return null;
  }

  /**
   * Get risk metrics for all vaults
   */
  async getAllVaultRiskMetrics(): Promise<RiskMetrics[]> {
    const metrics = await this.prisma.riskMetrics.findMany({
      orderBy: {
        timestamp: 'desc'
      }
    });

    return metrics.map(m => ({
      vaultId: m.vaultId,
      chainId: m.chainId,
      apy: m.apy,
      volatility: m.volatility,
      maxDrawdown: m.maxDrawdown,
      sharpeRatio: m.sharpeRatio,
      var95: m.var95,
      var99: m.var99,
      marketCorrelation: m.marketCorrelation,
      riskScore: m.riskScore,
      timestamp: m.timestamp
    }));
  }
}
