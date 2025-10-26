import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

// Contract verification configuration
const VERIFICATION_CONFIG = {
  networks: {
    ethereum: {
      chainId: 1,
      explorerApiKey: process.env.ETHERSCAN_API_KEY!,
      explorerUrl: "https://etherscan.io",
      rpcUrl: process.env.ETHEREUM_RPC_URL!
    },
    polygon: {
      chainId: 137,
      explorerApiKey: process.env.POLYGONSCAN_API_KEY!,
      explorerUrl: "https://polygonscan.com",
      rpcUrl: process.env.POLYGON_RPC_URL!
    },
    arbitrum: {
      chainId: 42161,
      explorerApiKey: process.env.ARBISCAN_API_KEY!,
      explorerUrl: "https://arbiscan.io",
      rpcUrl: process.env.ARBITRUM_RPC_URL!
    },
    bsc: {
      chainId: 56,
      explorerApiKey: process.env.BSCSCAN_API_KEY!,
      explorerUrl: "https://bscscan.com",
      rpcUrl: process.env.BSC_RPC_URL!
    },
    monad: {
      chainId: 123456789,
      explorerApiKey: process.env.MONADSCAN_API_KEY!,
      explorerUrl: "https://monadscan.com",
      rpcUrl: process.env.MONAD_RPC_URL!
    }
  }
};

interface VerificationResult {
  network: string;
  chainId: number;
  contracts: {
    [contractName: string]: {
      address: string;
      verified: boolean;
      error?: string;
      explorerUrl?: string;
    };
  };
  summary: {
    total: number;
    verified: number;
    failed: number;
  };
}

async function verifyNetworkContracts(networkName: string, config: any, contracts: any): Promise<VerificationResult> {
  console.log(`\n🔍 Verifying contracts on ${networkName} (Chain ID: ${config.chainId})`);
  
  const result: VerificationResult = {
    network: networkName,
    chainId: config.chainId,
    contracts: {},
    summary: { total: 0, verified: 0, failed: 0 }
  };
  
  // Contract verification configurations
  const contractConfigs = [
    {
      name: "vaultImplementation",
      address: contracts.vaultImplementation,
      constructorArgs: [],
      description: "ManixVault Implementation"
    },
    {
      name: "composer",
      address: contracts.composer,
      constructorArgs: [config.layerZeroEndpoint, process.env.PRIVATE_KEY!],
      description: "OVaultComposer"
    },
    {
      name: "assetOFT",
      address: contracts.assetOFT,
      constructorArgs: ["MANI X AI Asset", "MANIXA", config.layerZeroEndpoint, process.env.PRIVATE_KEY!],
      description: "AssetOFT"
    },
    {
      name: "shareOFT",
      address: contracts.shareOFT,
      constructorArgs: ["MANI X AI Share", "MANIXS", config.layerZeroEndpoint, process.env.PRIVATE_KEY!],
      description: "ShareOFT"
    },
    {
      name: "dvnValidator",
      address: contracts.dvnValidator,
      constructorArgs: [],
      description: "MockDVNValidator"
    }
  ];
  
  for (const contractConfig of contractConfigs) {
    result.summary.total++;
    
    try {
      console.log(`  📋 Verifying ${contractConfig.description}...`);
      
      // Set up provider for this network
      const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
      
      // Verify contract
      await ethers.run("verify:verify", {
        address: contractConfig.address,
        constructorArguments: contractConfig.constructorArgs,
        network: networkName
      });
      
      result.contracts[contractConfig.name] = {
        address: contractConfig.address,
        verified: true,
        explorerUrl: `${config.explorerUrl}/address/${contractConfig.address}`
      };
      
      result.summary.verified++;
      console.log(`    ✅ Verified: ${contractConfig.address}`);
      
    } catch (error) {
      result.contracts[contractConfig.name] = {
        address: contractConfig.address,
        verified: false,
        error: error.message,
        explorerUrl: `${config.explorerUrl}/address/${contractConfig.address}`
      };
      
      result.summary.failed++;
      console.log(`    ❌ Failed: ${error.message}`);
    }
    
    // Wait between verifications to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
  }
  
  return result;
}

async function generateVerificationReport(results: VerificationResult[]) {
  console.log("\n📊 Contract Verification Report");
  console.log("===============================");
  
  let totalContracts = 0;
  let totalVerified = 0;
  let totalFailed = 0;
  
  for (const result of results) {
    console.log(`\n🌐 ${result.network.toUpperCase()} (Chain ID: ${result.chainId})`);
    console.log(`   Total: ${result.summary.total}, Verified: ${result.summary.verified}, Failed: ${result.summary.failed}`);
    
    totalContracts += result.summary.total;
    totalVerified += result.summary.verified;
    totalFailed += result.summary.failed;
    
    // Show contract details
    for (const [contractName, contractInfo] of Object.entries(result.contracts)) {
      const status = contractInfo.verified ? "✅" : "❌";
      console.log(`   ${status} ${contractName}: ${contractInfo.address}`);
      if (contractInfo.explorerUrl) {
        console.log(`      🔗 ${contractInfo.explorerUrl}`);
      }
      if (contractInfo.error) {
        console.log(`      ⚠️  ${contractInfo.error}`);
      }
    }
  }
  
  console.log(`\n📈 Overall Summary:`);
  console.log(`   Total Contracts: ${totalContracts}`);
  console.log(`   Verified: ${totalVerified} (${((totalVerified / totalContracts) * 100).toFixed(1)}%)`);
  console.log(`   Failed: ${totalFailed} (${((totalFailed / totalContracts) * 100).toFixed(1)}%)`);
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalContracts,
      totalVerified,
      totalFailed,
      successRate: ((totalVerified / totalContracts) * 100).toFixed(1) + "%"
    },
    results: results
  };
  
  fs.writeFileSync(
    path.join(__dirname, "../deployments/verification-report.json"),
    JSON.stringify(report, null, 2)
  );
  
  console.log(`\n📄 Detailed report saved to: deployments/verification-report.json`);
}

async function main() {
  console.log("🔍 Starting Contract Verification Process");
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
  
  // Load deployment configuration
  const configPath = path.join(__dirname, "../deployments/config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error("Deployment configuration not found. Please run deployment first.");
  }
  
  const deploymentConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const results: VerificationResult[] = [];
  
  // Verify contracts on each network
  for (const [networkName, config] of Object.entries(VERIFICATION_CONFIG.networks)) {
    const chainId = config.chainId.toString();
    
    if (deploymentConfig[chainId] && deploymentConfig[chainId].contracts) {
      const result = await verifyNetworkContracts(
        networkName, 
        config, 
        deploymentConfig[chainId].contracts
      );
      results.push(result);
    } else {
      console.log(`⚠️  No deployment found for ${networkName} (Chain ID: ${chainId})`);
    }
    
    // Wait between networks to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
  }
  
  // Generate verification report
  await generateVerificationReport(results);
  
  console.log("\n✅ Contract verification completed!");
  console.log("Next steps:");
  console.log("1. Review verification report for any failures");
  console.log("2. Manually verify failed contracts if needed");
  console.log("3. Test cross-chain functionality");
  console.log("4. Set up monitoring dashboards");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
