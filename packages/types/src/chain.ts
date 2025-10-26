export enum ChainId {
  ETHEREUM = 1,
  POLYGON = 137,
  ARBITRUM = 42161,
  BSC = 56,
  MONAD = 123456789, // Placeholder - update with actual Monad chain ID
}

export type ChainConfig = {
  id: ChainId;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  isTestnet?: boolean;
  supportsParallelExecution?: boolean;
};

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  chainId: ChainId;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface BlockInfo {
  number: number;
  hash: string;
  timestamp: number;
  chainId: ChainId;
}
