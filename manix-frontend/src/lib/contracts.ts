import { DeploymentConfig, ChainId } from '../types';

// Contract addresses and configuration from deployments/config.json
export const DEPLOYMENT_CONFIG: Record<string, DeploymentConfig> = {
  "123456789": {
    network: {
      name: "monad",
      chainId: 123456789
    },
    deployer: "0x0000000000000000000000000000000000000000",
    timestamp: "2024-01-01T00:00:00.000Z",
    contracts: {
      vaultImplementation: "0x0000000000000000000000000000000000000000",
      proxyAdmin: "0x0000000000000000000000000000000000000000",
      vault: "0x0000000000000000000000000000000000000000",
      composer: "0x0000000000000000000000000000000000000000",
      assetOFT: "0x0000000000000000000000000000000000000000",
      shareOFT: "0x0000000000000000000000000000000000000000",
      dvnValidator: "0x0000000000000000000000000000000000000000"
    },
    config: {
      name: "MANI X AI Cross-Chain Vault Hub",
      symbol: "MANIXHUB",
      asset: "0x0000000000000000000000000000000000000000",
      admin: "0x0000000000000000000000000000000000000000",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
      dvnValidator: "0x0000000000000000000000000000000000000000",
      isHubVault: true,
      performanceFee: 200,
      managementFee: 50
    },
    layerZero: {
      chainId: 123456789,
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
      eid: 10143,
      trustedRemotePaths: {
        "1": "0x0000000000000000000000000000000000000000",
        "137": "0x0000000000000000000000000000000000000000",
        "42161": "0x0000000000000000000000000000000000000000",
        "56": "0x0000000000000000000000000000000000000000"
      }
    }
  },
  "1": {
    network: {
      name: "ethereum",
      chainId: 1
    },
    deployer: "0x0000000000000000000000000000000000000000",
    timestamp: "2024-01-01T00:00:00.000Z",
    contracts: {
      vaultImplementation: "0x0000000000000000000000000000000000000000",
      proxyAdmin: "0x0000000000000000000000000000000000000000",
      vault: "0x0000000000000000000000000000000000000000",
      composer: "0x0000000000000000000000000000000000000000",
      assetOFT: "0x0000000000000000000000000000000000000000",
      shareOFT: "0x0000000000000000000000000000000000000000",
      dvnValidator: "0x0000000000000000000000000000000000000000"
    },
    config: {
      name: "MANI X AI Cross-Chain Vault Spoke",
      symbol: "MANIXSPOKE",
      asset: "0x0000000000000000000000000000000000000000",
      admin: "0x0000000000000000000000000000000000000000",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
      dvnValidator: "0x0000000000000000000000000000000000000000",
      isHubVault: false,
      performanceFee: 200,
      managementFee: 50
    },
    layerZero: {
      chainId: 1,
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
      eid: 30101,
      trustedRemotePaths: {
        "123456789": "0x0000000000000000000000000000000000000000",
        "137": "0x0000000000000000000000000000000000000000",
        "42161": "0x0000000000000000000000000000000000000000",
        "56": "0x0000000000000000000000000000000000000000"
      }
    }
  },
  "137": {
    network: {
      name: "polygon",
      chainId: 137
    },
    deployer: "0x0000000000000000000000000000000000000000",
    timestamp: "2024-01-01T00:00:00.000Z",
    contracts: {
      vaultImplementation: "0x0000000000000000000000000000000000000000",
      proxyAdmin: "0x0000000000000000000000000000000000000000",
      vault: "0x0000000000000000000000000000000000000000",
      composer: "0x0000000000000000000000000000000000000000",
      assetOFT: "0x0000000000000000000000000000000000000000",
      shareOFT: "0x0000000000000000000000000000000000000000",
      dvnValidator: "0x0000000000000000000000000000000000000000"
    },
    config: {
      name: "MANI X AI Cross-Chain Vault Spoke",
      symbol: "MANIXSPOKE",
      asset: "0x0000000000000000000000000000000000000000",
      admin: "0x0000000000000000000000000000000000000000",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
      dvnValidator: "0x0000000000000000000000000000000000000000",
      isHubVault: false,
      performanceFee: 200,
      managementFee: 50
    },
    layerZero: {
      chainId: 137,
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
      eid: 30109,
      trustedRemotePaths: {
        "1": "0x0000000000000000000000000000000000000000",
        "42161": "0x0000000000000000000000000000000000000000",
        "56": "0x0000000000000000000000000000000000000000"
      }
    }
  },
  "42161": {
    network: {
      name: "arbitrum",
      chainId: 42161
    },
    deployer: "0x0000000000000000000000000000000000000000",
    timestamp: "2024-01-01T00:00:00.000Z",
    contracts: {
      vaultImplementation: "0x0000000000000000000000000000000000000000",
      proxyAdmin: "0x0000000000000000000000000000000000000000",
      vault: "0x0000000000000000000000000000000000000000",
      composer: "0x0000000000000000000000000000000000000000",
      assetOFT: "0x0000000000000000000000000000000000000000",
      shareOFT: "0x0000000000000000000000000000000000000000",
      dvnValidator: "0x0000000000000000000000000000000000000000"
    },
    config: {
      name: "MANI X AI Cross-Chain Vault Spoke",
      symbol: "MANIXSPOKE",
      asset: "0x0000000000000000000000000000000000000000",
      admin: "0x0000000000000000000000000000000000000000",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
      dvnValidator: "0x0000000000000000000000000000000000000000",
      isHubVault: false,
      performanceFee: 200,
      managementFee: 50
    },
    layerZero: {
      chainId: 42161,
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
      eid: 30110,
      trustedRemotePaths: {
        "1": "0x0000000000000000000000000000000000000000",
        "137": "0x0000000000000000000000000000000000000000",
        "56": "0x0000000000000000000000000000000000000000"
      }
    }
  },
  "56": {
    network: {
      name: "bsc",
      chainId: 56
    },
    deployer: "0x0000000000000000000000000000000000000000",
    timestamp: "2024-01-01T00:00:00.000Z",
    contracts: {
      vaultImplementation: "0x0000000000000000000000000000000000000000",
      proxyAdmin: "0x0000000000000000000000000000000000000000",
      vault: "0x0000000000000000000000000000000000000000",
      composer: "0x0000000000000000000000000000000000000000",
      assetOFT: "0x0000000000000000000000000000000000000000",
      shareOFT: "0x0000000000000000000000000000000000000000",
      dvnValidator: "0x0000000000000000000000000000000000000000"
    },
    config: {
      name: "MANI X AI Cross-Chain Vault Spoke",
      symbol: "MANIXSPOKE",
      asset: "0x0000000000000000000000000000000000000000",
      admin: "0x0000000000000000000000000000000000000000",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
      dvnValidator: "0x0000000000000000000000000000000000000000",
      isHubVault: false,
      performanceFee: 200,
      managementFee: 50
    },
    layerZero: {
      chainId: 56,
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
      eid: 30102,
      trustedRemotePaths: {
        "1": "0x0000000000000000000000000000000000000000",
        "137": "0x0000000000000000000000000000000000000000",
        "42161": "0x0000000000000000000000000000000000000000"
      }
    }
  }
};

// Helper functions
export const getChainConfig = (chainId: ChainId): DeploymentConfig | null => {
  return DEPLOYMENT_CONFIG[chainId.toString()] || null;
};

export const getVaultAddress = (chainId: ChainId): string | null => {
  const config = getChainConfig(chainId);
  return config?.contracts.vault || null;
};

export const getComposerAddress = (chainId: ChainId): string | null => {
  const config = getChainConfig(chainId);
  return config?.contracts.composer || null;
};

export const getAssetOFTAddress = (chainId: ChainId): string | null => {
  const config = getChainConfig(chainId);
  return config?.contracts.assetOFT || null;
};

export const getShareOFTAddress = (chainId: ChainId): string | null => {
  const config = getChainConfig(chainId);
  return config?.contracts.shareOFT || null;
};

export const getLayerZeroEndpoint = (chainId: ChainId): string | null => {
  const config = getChainConfig(chainId);
  return config?.layerZero.layerZeroEndpoint || null;
};

export const getLayerZeroEID = (chainId: ChainId): number | null => {
  const config = getChainConfig(chainId);
  return config?.layerZero.eid || null;
};

export const isHubChain = (chainId: ChainId): boolean => {
  const config = getChainConfig(chainId);
  return config?.config.isHubVault || false;
};

export const getSupportedChains = (): ChainId[] => {
  return Object.keys(DEPLOYMENT_CONFIG).map(Number) as ChainId[];
};

export const getChainName = (chainId: ChainId): string => {
  const config = getChainConfig(chainId);
  return config?.network.name || 'Unknown';
};
