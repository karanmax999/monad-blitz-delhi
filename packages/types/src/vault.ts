import { ChainId } from './chain';

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
  managementFee: number; // Basis points (e.g., 200 = 2%)
  performanceFee: number; // Basis points
  withdrawalFee: number; // Basis points
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
