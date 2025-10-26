import { HardhatUserConfig } from 'hardhat/config';

// LayerZero OApp Configuration for MANI X AI Vault
const layerzeroConfig: HardhatUserConfig = {
  networks: {
    // Monad Hub Network
    monad: {
      url: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      layerZero: {
        eid: 10143, // Monad testnet EID
        endpoint: "0x1a44076050125825900e736c501f859c50fE728c"
      }
    },
    // Ethereum Spoke Network
    ethereum: {
      url: process.env.ETHEREUM_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      layerZero: {
        eid: 30101, // Ethereum mainnet EID
        endpoint: "0x1a44076050125825900e736c501f859c50fE728c"
      }
    },
    // Polygon Spoke Network
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      layerZero: {
        eid: 30109, // Polygon mainnet EID
        endpoint: "0x1a44076050125825900e736c501f859c50fE728c"
      }
    },
    // Arbitrum Spoke Network
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      layerZero: {
        eid: 30110, // Arbitrum mainnet EID
        endpoint: "0x1a44076050125825900e736c501f859c50fE728c"
      }
    },
    // BSC Spoke Network
    bsc: {
      url: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      layerZero: {
        eid: 30102, // BSC mainnet EID
        endpoint: "0x1a44076050125825900e736c501f859c50fE728c"
      }
    }
  },
  
  // OApp Configuration
  oapp: {
    // Contract addresses will be populated after deployment
    contracts: {
      // Hub contracts (Monad)
      hub: {
        vault: "", // Will be set after deployment
        composer: "", // Will be set after deployment
        assetOFT: "", // Will be set after deployment
        shareOFT: "", // Will be set after deployment
        dvnValidator: "" // Will be set after deployment
      },
      // Spoke contracts (Ethereum, Polygon, Arbitrum, BSC)
      spokes: {
        ethereum: {
          vault: "",
          composer: "",
          assetOFT: "",
          shareOFT: "",
          dvnValidator: ""
        },
        polygon: {
          vault: "",
          composer: "",
          assetOFT: "",
          shareOFT: "",
          dvnValidator: ""
        },
        arbitrum: {
          vault: "",
          composer: "",
          assetOFT: "",
          shareOFT: "",
          dvnValidator: ""
        },
        bsc: {
          vault: "",
          composer: "",
          assetOFT: "",
          shareOFT: "",
          dvnValidator: ""
        }
      }
    },
    
    // DVN Configuration
    dvn: {
      // Default DVN options per chain
      options: {
        10143: { // Monad
          gas: 200000,
          multiplier: 120,
          pricePerGas: 1000000000
        },
        30101: { // Ethereum
          gas: 180000,
          multiplier: 115,
          pricePerGas: 2000000000
        },
        30109: { // Polygon
          gas: 150000,
          multiplier: 110,
          pricePerGas: 500000000
        },
        30110: { // Arbitrum
          gas: 160000,
          multiplier: 112,
          pricePerGas: 100000000
        },
        30102: { // BSC
          gas: 140000,
          multiplier: 108,
          pricePerGas: 3000000000
        }
      }
    },
    
    // Peer Configuration
    peers: {
      // Hub to Spoke peers
      "10143": { // Monad Hub
        "30101": "", // Ethereum Spoke
        "30109": "", // Polygon Spoke
        "30110": "", // Arbitrum Spoke
        "30102": ""  // BSC Spoke
      },
      // Spoke to Hub peers
      "30101": { // Ethereum Spoke
        "10143": "" // Monad Hub
      },
      "30109": { // Polygon Spoke
        "10143": "" // Monad Hub
      },
      "30110": { // Arbitrum Spoke
        "10143": "" // Monad Hub
      },
      "30102": { // BSC Spoke
        "10143": "" // Monad Hub
      }
    }
  }
};

export default layerzeroConfig;
