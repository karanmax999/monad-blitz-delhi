// Shared types from packages/types
export enum ChainId {
  MONAD = 123456789,
  ETHEREUM = 1,
  POLYGON = 137,
  ARBITRUM = 42161,
  BSC = 56,
}

export enum VaultType {
  SINGLE_ASSET = 'single_asset',
  LP_TOKEN = 'lp_token',
  YIELD_FARMING = 'yield_farming',
  ARBITRAGE = 'arbitrage',
  LIQUIDITY_PROVISION = 'liquidity_provision',
}

export enum VaultStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  MAINTENANCE = 'maintenance',
}

export interface Vault {
  id: string;
  name: string;
  description: string;
  type: VaultType;
  status: VaultStatus;
  chainId: ChainId;
  address: string;
  tokenAddress: string;
  apy: number;
  tvl: string;
  riskScore: number;
  createdAt: number;
  updatedAt: number;
  strategies: string[];
  fees: VaultFees;
}

export interface VaultFees {
  managementFee: number;
  performanceFee: number;
  withdrawalFee: number;
}

export interface VaultPosition {
  vaultId: string;
  userAddress: string;
  shares: string;
  underlyingAmount: string;
  valueUSD: string;
  pnl: string;
  apy: number;
  depositedAt: number;
  lastUpdatedAt: number;
}

export interface VaultTransaction {
  id: string;
  vaultId: string;
  userAddress: string;
  type: 'deposit' | 'withdraw' | 'reinvest';
  amount: string;
  shares: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  chainId: ChainId;
}

export enum AIModel {
  GEMINI_PRO = 'gemini_pro',
  GEMINI_PRO_VISION = 'gemini_pro_vision',
  LOCAL_MODEL = 'local_model',
}

export interface AIRequest {
  id: string;
  model: AIModel;
  prompt: string;
  context?: Record<string, any>;
  userId: string;
  timestamp: number;
}

export interface AIResponse {
  requestId: string;
  content: string;
  confidence: number;
  reasoning?: string;
  metadata: {
    model: AIModel;
    tokensUsed: number;
    processingTime: number;
    timestamp: number;
  };
}

export interface MarketAnalysis {
  id: string;
  timestamp: number;
  chainId: string;
  analysis: {
    marketTrend: 'bullish' | 'bearish' | 'neutral';
    volatilityIndex: number;
    liquidityScore: number;
    riskFactors: string[];
    opportunities: string[];
  };
  recommendations: AIStrategyRecommendation[];
}

export interface AIStrategyRecommendation {
  strategyId: string;
  action: 'enter' | 'exit' | 'hold' | 'rebalance';
  confidence: number;
  reasoning: string;
  expectedOutcome: {
    return: number;
    timeframe: string;
    risk: number;
  };
}

// Contract deployment configuration
export interface DeploymentConfig {
  network: {
    name: string;
    chainId: number;
  };
  deployer: string;
  timestamp: string;
  contracts: {
    vaultImplementation: string;
    proxyAdmin: string;
    vault: string;
    composer: string;
    assetOFT: string;
    shareOFT: string;
    dvnValidator: string;
  };
  config: {
    name: string;
    symbol: string;
    asset: string;
    admin: string;
    layerZeroEndpoint: string;
    dvnValidator: string;
    isHubVault: boolean;
    performanceFee: number;
    managementFee: number;
  };
  layerZero: {
    chainId: number;
    layerZeroEndpoint: string;
    eid: number;
    trustedRemotePaths: Record<string, string>;
  };
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: number;
}

export interface PortfolioData {
  totalValueUSD: string;
  chainBalances: ChainBalance[];
  vaultPositions: VaultPosition[];
  pendingTransactions: VaultTransaction[];
}

export interface ChainBalance {
  chainId: ChainId;
  chainName: string;
  balance: string;
  balanceUSD: string;
  vaultCount: number;
}

export interface RiskMetrics {
  apy: number;
  volatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
  var: number;
  marketCorrelation: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
}

// WebSocket event types
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: number;
}

export interface NotificationEvent {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}
