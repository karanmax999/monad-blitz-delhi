import { ChainId } from './chain';

export enum StrategyType {
  YIELD_FARMING = 'yield_farming',
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_MINING = 'liquidity_mining',
  DEFI_PROTOCOL = 'defi_protocol',
  AI_OPTIMIZED = 'ai_optimized',
}

export enum StrategyRisk {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  type: StrategyType;
  riskLevel: StrategyRisk;
  chainId: ChainId;
  address: string;
  apy: number;
  tvl: string;
  minDeposit: string;
  maxDeposit: string;
  isActive: boolean;
  parameters: StrategyParameters;
  performance: StrategyPerformance;
  createdAt: number;
  updatedAt: number;
}

export interface StrategyParameters {
  slippageTolerance: number;
  maxGasPrice: string;
  rebalanceThreshold: number;
  autoCompound: boolean;
  riskThresholds: {
    maxDrawdown: number;
    maxVolatility: number;
  };
}

export interface StrategyPerformance {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  winRate: number;
  avgReturnPerTrade: number;
  totalTrades: number;
  lastUpdate: number;
}

export interface AIRecommendation {
  strategyId: string;
  confidence: number;
  reasoning: string;
  expectedReturn: number;
  riskAssessment: StrategyRisk;
  marketConditions: string[];
  timestamp: number;
}
