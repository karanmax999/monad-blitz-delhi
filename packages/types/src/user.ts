export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  VAULT_MANAGER = 'vault_manager',
  STRATEGY_DEVELOPER = 'strategy_developer',
}

export enum NotificationType {
  VAULT_UPDATE = 'vault_update',
  STRATEGY_ALERT = 'strategy_alert',
  RISK_WARNING = 'risk_warning',
  EARNINGS_UPDATE = 'earnings_update',
  SYSTEM_MAINTENANCE = 'system_maintenance',
}

export interface User {
  id: string;
  address: string;
  email?: string;
  role: UserRole;
  preferences: UserPreferences;
  createdAt: number;
  lastActiveAt: number;
  isVerified: boolean;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    discord: boolean;
    telegram: boolean;
    types: NotificationType[];
  };
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  defaultChain: string;
  language: string;
  theme: 'light' | 'dark' | 'auto';
}

export interface UserPortfolio {
  userId: string;
  totalValueUSD: string;
  totalPnlUSD: string;
  totalPnlPercent: number;
  vaults: UserVaultPosition[];
  chains: ChainBalance[];
  lastUpdated: number;
}

export interface UserVaultPosition {
  vaultId: string;
  shares: string;
  valueUSD: string;
  pnlUSD: string;
  pnlPercent: number;
  depositedAt: number;
}

export interface ChainBalance {
  chainId: string;
  nativeBalance: string;
  tokenBalances: TokenBalance[];
}

export interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
  valueUSD: string;
}
