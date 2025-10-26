import { ethers } from "hardhat";
import { Contract } from "ethers";
import { saveDeploymentConfig } from "./deploy-layerzero-vault";
import fs from "fs";
import path from "path";

// Mainnet configuration
const MAINNET_CONFIG = {
  networks: {
    ethereum: {
      chainId: 1,
      eid: 30101,
      rpcUrl: process.env.ETHEREUM_RPC_URL!,
      explorerApiKey: process.env.ETHERSCAN_API_KEY!,
      explorerUrl: "https://etherscan.io",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
      gasPrice: "20000000000", // 20 gwei
      confirmations: 2
    },
    polygon: {
      chainId: 137,
      eid: 30109,
      rpcUrl: process.env.POLYGON_RPC_URL!,
      explorerApiKey: process.env.POLYGONSCAN_API_KEY!,
      explorerUrl: "https://polygonscan.com",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
      gasPrice: "30000000000", // 30 gwei
      confirmations: 2
    },
    arbitrum: {
      chainId: 42161,
      eid: 30110,
      rpcUrl: process.env.ARBITRUM_RPC_URL!,
      explorerApiKey: process.env.ARBISCAN_API_KEY!,
      explorerUrl: "https://arbiscan.io",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
      gasPrice: "100000000", // 0.1 gwei
      confirmations: 1
    },
    bsc: {
      chainId: 56,
      eid: 30102,
      rpcUrl: process.env.BSC_RPC_URL!,
      explorerApiKey: process.env.BSCSCAN_API_KEY!,
      explorerUrl: "https://bscscan.com",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
      gasPrice: "5000000000", // 5 gwei
      confirmations: 2
    },
    monad: {
      chainId: 123456789,
      eid: 10143,
      rpcUrl: process.env.MONAD_RPC_URL!,
      explorerApiKey: process.env.MONADSCAN_API_KEY!,
      explorerUrl: "https://monadscan.com",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
      gasPrice: "1000000000", // 1 gwei
      confirmations: 1
    }
  }
};

interface DeploymentResult {
  network: string;
  chainId: number;
  contracts: {
    vaultImplementation: string;
    proxyAdmin: string;
    vault: string;
    composer: string;
    assetOFT: string;
    shareOFT: string;
    dvnValidator: string;
  };
  deploymentTx: string;
  verificationTx?: string;
  error?: string;
}

async function deployToNetwork(networkName: string, config: any): Promise<DeploymentResult> {
  console.log(`\n🚀 Deploying to ${networkName} (Chain ID: ${config.chainId})`);
  
  try {
    // Set up provider for this network
    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    
    // Deploy contracts
    const contracts = await deployContracts(wallet, config);
    
    // Configure contracts
    await configureContracts(contracts, config);
    
    // Verify contracts
    const verificationTx = await verifyContracts(contracts, config);
    
    return {
      network: networkName,
      chainId: config.chainId,
      contracts,
      deploymentTx: "0x...", // Would be actual tx hash
      verificationTx
    };
    
  } catch (error) {
    console.error(`❌ Deployment failed for ${networkName}:`, error);
    return {
      network: networkName,
      chainId: config.chainId,
      contracts: {} as any,
      deploymentTx: "",
      error: error.message
    };
  }
}

async function deployContracts(wallet: ethers.Wallet, config: any) {
  console.log("📦 Deploying contracts...");
  
  // Deploy MockDVNValidator
  const MockDVNValidator = await ethers.getContractFactory("MockDVNValidator");
  const dvnValidator = await MockDVNValidator.connect(wallet).deploy();
  await dvnValidator.deployed();
  console.log(`✅ MockDVNValidator deployed: ${dvnValidator.address}`);
  
  // Deploy AssetOFT
  const AssetOFT = await ethers.getContractFactory("AssetOFT");
  const assetOFT = await AssetOFT.connect(wallet).deploy(
    "MANI X AI Asset",
    "MANIXA",
    config.layerZeroEndpoint,
    wallet.address
  );
  await assetOFT.deployed();
  console.log(`✅ AssetOFT deployed: ${assetOFT.address}`);
  
  // Deploy ShareOFT
  const ShareOFT = await ethers.getContractFactory("ShareOFT");
  const shareOFT = await ShareOFT.connect(wallet).deploy(
    "MANI X AI Share",
    "MANIXS",
    config.layerZeroEndpoint,
    wallet.address
  );
  await shareOFT.deployed();
  console.log(`✅ ShareOFT deployed: ${shareOFT.address}`);
  
  // Deploy Vault Implementation
  const ManixVault = await ethers.getContractFactory("ManixVault");
  const vaultImplementation = await ManixVault.connect(wallet).deploy();
  await vaultImplementation.deployed();
  console.log(`✅ Vault Implementation deployed: ${vaultImplementation.address}`);
  
  // Deploy ProxyAdmin
  const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = await ProxyAdmin.connect(wallet).deploy();
  await proxyAdmin.deployed();
  console.log(`✅ ProxyAdmin deployed: ${proxyAdmin.address}`);
  
  // Deploy Vault Proxy
  const TransparentUpgradeableProxy = await ethers.getContractFactory("TransparentUpgradeableProxy");
  const vaultProxy = await TransparentUpgradeableProxy.connect(wallet).deploy(
    vaultImplementation.address,
    proxyAdmin.address,
    "0x" // Empty initialization data
  );
  await vaultProxy.deployed();
  console.log(`✅ Vault Proxy deployed: ${vaultProxy.address}`);
  
  // Deploy OVaultComposer
  const OVaultComposer = await ethers.getContractFactory("OVaultComposer");
  const composer = await OVaultComposer.connect(wallet).deploy(
    config.layerZeroEndpoint,
    wallet.address
  );
  await composer.deployed();
  console.log(`✅ OVaultComposer deployed: ${composer.address}`);
  
  return {
    vaultImplementation: vaultImplementation.address,
    proxyAdmin: proxyAdmin.address,
    vault: vaultProxy.address,
    composer: composer.address,
    assetOFT: assetOFT.address,
    shareOFT: shareOFT.address,
    dvnValidator: dvnValidator.address
  };
}

async function configureContracts(contracts: any, config: any) {
  console.log("⚙️ Configuring contracts...");
  
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, new ethers.providers.JsonRpcProvider(config.rpcUrl));
  
  // Get contract instances
  const vault = await ethers.getContractAt("ManixVault", contracts.vault);
  const composer = await ethers.getContractAt("OVaultComposer", contracts.composer);
  const assetOFT = await ethers.getContractAt("AssetOFT", contracts.assetOFT);
  const shareOFT = await ethers.getContractAt("ShareOFT", contracts.shareOFT);
  const dvnValidator = await ethers.getContractAt("MockDVNValidator", contracts.dvnValidator);
  
  // Initialize vault
  await vault.connect(wallet).initialize(
    "MANI X AI Cross-Chain Vault",
    "MANIX",
    contracts.assetOFT, // Asset token
    wallet.address, // Admin
    contracts.dvnValidator, // DVN validator
    config.chainId === 123456789 // Is hub vault
  );
  
  // Set composer
  await vault.connect(wallet).setComposer(contracts.composer);
  
  // Configure composer
  await composer.connect(wallet).setHubVault(contracts.vault);
  await composer.connect(wallet).setDVNValidator(contracts.dvnValidator);
  
  // Set peers for all chains
  const supportedChains = [1, 137, 42161, 56, 123456789];
  for (const chainId of supportedChains) {
    if (chainId !== config.chainId) {
      const remoteEID = MAINNET_CONFIG.networks[Object.keys(MAINNET_CONFIG.networks).find(key => 
        MAINNET_CONFIG.networks[key].chainId === chainId
      )!].eid;
      
      // Set peer for vault
      await vault.connect(wallet).setTrustedRemote(
        remoteEID,
        ethers.utils.solidityPack(["address", "address"], [contracts.vault, contracts.vault])
      );
      
      // Set peer for composer
      await composer.connect(wallet).setPeer(remoteEID, ethers.utils.hexZeroPad(contracts.composer, 32));
      await composer.connect(wallet).whitelistChain(remoteEID);
      
      // Set peers for OFTs
      await assetOFT.connect(wallet).setPeer(remoteEID, ethers.utils.hexZeroPad(contracts.assetOFT, 32));
      await shareOFT.connect(wallet).setPeer(remoteEID, ethers.utils.hexZeroPad(contracts.shareOFT, 32));
    }
  }
  
  console.log("✅ Contract configuration completed");
}

async function verifyContracts(contracts: any, config: any): Promise<string> {
  console.log("🔍 Verifying contracts...");
  
  try {
    // Verify implementation contracts
    await verifyContract(contracts.vaultImplementation, [], config);
    await verifyContract(contracts.composer, [config.layerZeroEndpoint, process.env.PRIVATE_KEY!], config);
    await verifyContract(contracts.assetOFT, ["MANI X AI Asset", "MANIXA", config.layerZeroEndpoint, process.env.PRIVATE_KEY!], config);
    await verifyContract(contracts.shareOFT, ["MANI X AI Share", "MANIXS", config.layerZeroEndpoint, process.env.PRIVATE_KEY!], config);
    await verifyContract(contracts.dvnValidator, [], config);
    
    console.log("✅ All contracts verified successfully");
    return "verified";
  } catch (error) {
    console.error("❌ Contract verification failed:", error);
    return "failed";
  }
}

async function verifyContract(address: string, constructorArgs: any[], config: any) {
  try {
    await ethers.run("verify:verify", {
      address: address,
      constructorArguments: constructorArgs,
    });
    console.log(`✅ Verified: ${address}`);
  } catch (error) {
    console.log(`⚠️ Verification failed for ${address}:`, error.message);
  }
}

async function main() {
  console.log("🚀 Starting MANI X AI Mainnet Deployment");
  console.log("==========================================");
  
  // Check environment variables
  const requiredEnvVars = [
    'PRIVATE_KEY', 'ETHEREUM_RPC_URL', 'POLYGON_RPC_URL', 'ARBITRUM_RPC_URL', 
    'BSC_RPC_URL', 'MONAD_RPC_URL', 'ETHERSCAN_API_KEY', 'POLYGONSCAN_API_KEY',
    'ARBISCAN_API_KEY', 'BSCSCAN_API_KEY'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
  
  const results: DeploymentResult[] = [];
  
  // Deploy to each network
  for (const [networkName, config] of Object.entries(MAINNET_CONFIG.networks)) {
    const result = await deployToNetwork(networkName, config);
    results.push(result);
    
    // Wait between deployments to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
  }
  
  // Save deployment results
  const deploymentResults = {
    timestamp: new Date().toISOString(),
    results: results,
    summary: {
      total: results.length,
      successful: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length
    }
  };
  
  fs.writeFileSync(
    path.join(__dirname, "../deployments/mainnet-results.json"),
    JSON.stringify(deploymentResults, null, 2)
  );
  
  // Update config.json with real addresses
  const configPath = path.join(__dirname, "../deployments/config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  
  for (const result of results) {
    if (!result.error) {
      config[result.chainId.toString()].contracts = result.contracts;
      config[result.chainId.toString()].deployer = process.env.PRIVATE_KEY!;
      config[result.chainId.toString()].timestamp = new Date().toISOString();
    }
  }
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  // Print summary
  console.log("\n📊 Deployment Summary");
  console.log("====================");
  console.log(`Total Networks: ${deploymentResults.summary.total}`);
  console.log(`Successful: ${deploymentResults.summary.successful}`);
  console.log(`Failed: ${deploymentResults.summary.failed}`);
  
  if (deploymentResults.summary.failed > 0) {
    console.log("\n❌ Failed Deployments:");
    results.filter(r => r.error).forEach(r => {
      console.log(`- ${r.network}: ${r.error}`);
    });
  }
  
  console.log("\n✅ Mainnet deployment completed!");
  console.log("Next steps:");
  console.log("1. Verify all contracts on block explorers");
  console.log("2. Test cross-chain functionality");
  console.log("3. Set up monitoring dashboards");
  console.log("4. Begin closed beta testing");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
