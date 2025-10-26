import { ChainId, Transaction, BlockInfo } from '@manix-ai/types';

export interface ChainAdapterConfig {
  chainId: ChainId;
  rpcUrl: string;
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export abstract class BaseChainAdapter {
  protected config: ChainAdapterConfig;

  constructor(config: ChainAdapterConfig) {
    this.config = config;
  }

  abstract getChainId(): ChainId;
  abstract getBalance(address: string): Promise<string>;
  abstract getTransaction(txHash: string): Promise<Transaction>;
  abstract getBlockInfo(blockNumber?: number): Promise<BlockInfo>;
  abstract sendTransaction(txData: any): Promise<string>;
  abstract estimateGas(txData: any): Promise<string>;
  abstract getGasPrice(): Promise<string>;

  // Monad-specific parallel execution capability
  canParallelExecute(): boolean {
    return this.getChainId() === ChainId.MONAD;
  }

  // Get chain-specific optimizations
  getOptimizations() {
    return {
      parallelExecution: this.canParallelExecute(),
      fastFinality: this.getChainId() === ChainId.ARBITRUM || this.getChainId() === ChainId.OPTIMISM,
      lowCost: this.getChainId() === ChainId.POLYGON || this.getChainId() === ChainId.BSC,
    };
  }
}
