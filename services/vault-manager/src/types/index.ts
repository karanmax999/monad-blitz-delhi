// Configuration types
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
    trustedRemotePaths: {
      [chainId: string]: string;
    };
  };
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  contracts: {
    vault: string;
    composer: string;
    assetOFT: string;
    shareOFT: string;
  };
}

// Event types
export interface VaultEvent {
  type: string;
  chainId: string;
  blockNumber: number;
  transactionHash: string;
  data: any;
}

export interface CrossChainDeposit {
  transactionId: string;
  user: string;
  amount: ethers.BigNumber;
  sourceChain?: string;
  targetChain: string;
  targetVault: string;
}

export interface CrossChainWithdraw {
  transactionId: string;
  user: string;
  amount: ethers.BigNumber;
  sourceChain?: string;
  targetChain: string;
  targetVault: string;
}

export interface AIRecommendation {
  userId: string;
  action: AIAction;
  confidence: number;
  expectedReturn: number;
  reasoning: string;
  timestamp: Date;
  status: 'GENERATED' | 'PENDING' | 'EXECUTED' | 'FAILED';
}

export type AIAction = 'REBALANCE' | 'INCREASE_RISK' | 'DECREASE_RISK' | 'HOLD' | 'DIVERSIFY';

export interface RiskMetrics {
  vaultId: string;
  chainId: string;
  apy: number;
  volatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
  var95: number;
  var99: number;
  marketCorrelation: number;
  riskScore: number;
  timestamp: Date;
}

export interface NotificationData {
  type: 'AI_RECOMMENDATION' | 'VAULT_ALERT' | 'RISK_ALERT' | 'CROSS_CHAIN_UPDATE';
  userId: string;
  message: string;
  data: any;
  timestamp: Date;
}

// Database types (Prisma schema would generate these)
export interface User {
  id: string;
  walletAddress: string;
  totalValue: string;
  riskTolerance: 'LOW' | 'MODERATE' | 'HIGH';
  investmentGoals: string[];
  investmentHorizon: 'SHORT' | 'MEDIUM' | 'LONG';
  maxDrawdown: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vault {
  id: string;
  address: string;
  name: string;
  symbol: string;
  totalValueLocked: bigint;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  vaultId: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: string;
  chainId: string;
  transactionHash: string;
  timestamp: Date;
}

export interface PendingTransaction {
  id: string;
  transactionId: string;
  userId: string;
  amount: string;
  sourceChain: string;
  targetChain: string;
  targetVault: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  timestamp: Date;
}

export interface AIRec {
  id: string;
  userId: string;
  vaultId: string;
  action: string;
  confidence: number;
  expectedReturn: number;
  reasoning: string;
  status: 'GENERATED' | 'PENDING' | 'EXECUTED' | 'FAILED';
  executedAt?: Date;
  errorMessage?: string;
  timestamp: Date;
}

export interface RiskMetric {
  id: string;
  vaultId: string;
  chainId: string;
  apy: number;
  volatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
  var95: number;
  var99: number;
  marketCorrelation: number;
  riskScore: number;
  timestamp: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  data: string;
  read: boolean;
  readAt?: Date;
  timestamp: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface VaultTVLData {
  totalValueLocked: string;
  totalDeposits: string;
  totalWithdrawals: string;
  activeUsers: number;
  lastUpdated: Date;
}

export interface MultiChainTVL {
  totalTVL: string;
  chainTVL: { [chainId: string]: string };
  vaultTVL: { [vaultId: string]: string };
}

export interface UserPortfolio {
  totalBalance: string;
  chainBalances: { [chainId: string]: string };
  pendingTransactions: PendingTransaction[];
  crossChainActivity: any;
}

// WebSocket event types
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface NotificationEvent extends WebSocketEvent {
  type: 'notification';
  data: {
    id: string;
    type: string;
    message: string;
    data: any;
    timestamp: Date;
  };
}

export interface VaultUpdateEvent extends WebSocketEvent {
  type: 'vault-update';
  data: {
    vaultId: string;
    tvl: VaultTVLData;
    riskMetrics?: RiskMetrics;
  };
}

export interface AIRecommendationEvent extends WebSocketEvent {
  type: 'ai-recommendation';
  data: {
    userId: string;
    action: AIAction;
    confidence: number;
    expectedReturn: number;
    reasoning: string;
  };
}

export interface CrossChainUpdateEvent extends WebSocketEvent {
  type: 'crosschain-update';
  data: {
    transactionId: string;
    userId: string;
    amount: string;
    sourceChain: string;
    targetChain: string;
    type: 'DEPOSIT' | 'WITHDRAW';
  };
}
