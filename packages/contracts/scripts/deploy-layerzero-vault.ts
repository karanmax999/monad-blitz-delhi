import { ethers, upgrades } from 'hardhat';
import { Contract } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

interface LayerZeroVaultConfig {
  name: string;
  symbol: string;
  asset: string;
  admin: string;
  layerZeroEndpoint: string;
  dvnValidator?: string;
  isHubVault: boolean;
  performanceFee: number;
  managementFee: number;
}

interface ChainConfig {
  chainId: number;
  layerZeroEndpoint: string;
  eid: number; // LayerZero Endpoint ID
  trustedRemotePaths: { [chainId: string]: string };
}

interface DeploymentConfig {
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
    composer?: string;
    assetOFT?: string;
    shareOFT?: string;
    dvnValidator: string;
  };
  config: LayerZeroVaultConfig;
  layerZero: ChainConfig;
}

// LayerZero endpoint addresses and EIDs for different chains
const LAYER_ZERO_CONFIG: { [chainId: number]: ChainConfig } = {
  // Monad (Hub) - EID 10143
  123456789: {
    chainId: 123456789,
    layerZeroEndpoint: '0x1a44076050125825900e736c501f859c50fE728c', // Monad endpoint
    eid: 10143, // Monad testnet EID
    trustedRemotePaths: {
      1: '0x0000000000000000000000000000000000000000', // Ethereum
      137: '0x0000000000000000000000000000000000000000', // Polygon
      42161: '0x0000000000000000000000000000000000000000', // Arbitrum
      56: '0x0000000000000000000000000000000000000000', // BSC
    }
  },
  // Ethereum Mainnet (Spoke) - EID 30101
  1: {
    chainId: 1,
    layerZeroEndpoint: '0x1a44076050125825900e736c501f859c50fE728c', // Ethereum endpoint
    eid: 30101, // Ethereum mainnet EID
    trustedRemotePaths: {
      123456789: '0x0000000000000000000000000000000000000000', // Monad (Hub)
      137: '0x0000000000000000000000000000000000000000', // Polygon
      42161: '0x0000000000000000000000000000000000000000', // Arbitrum
      56: '0x0000000000000000000000000000000000000000', // BSC
    }
  },
  // Polygon - EID 30109
  137: {
    chainId: 137,
    layerZeroEndpoint: '0x1a44076050125825900e736c501f859c50fE728c', // Polygon endpoint
    eid: 30109, // Polygon mainnet EID
    trustedRemotePaths: {
      1: '0x0000000000000000000000000000000000000000', // Ethereum
      42161: '0x0000000000000000000000000000000000000000', // Arbitrum
      56: '0x0000000000000000000000000000000000000000', // BSC
    }
  },
  // Arbitrum - EID 30110
  42161: {
    chainId: 42161,
    layerZeroEndpoint: '0x1a44076050125825900e736c501f859c50fE728c', // Arbitrum endpoint
    eid: 30110, // Arbitrum mainnet EID
    trustedRemotePaths: {
      1: '0x0000000000000000000000000000000000000000', // Ethereum
      137: '0x0000000000000000000000000000000000000000', // Polygon
      56: '0x0000000000000000000000000000000000000000', // BSC
    }
  },
  // BSC - EID 30102
  56: {
    chainId: 56,
    layerZeroEndpoint: '0x1a44076050125825900e736c501f859c50fE728c', // BSC endpoint
    eid: 30102, // BSC mainnet EID
    trustedRemotePaths: {
      1: '0x0000000000000000000000000000000000000000', // Ethereum
      137: '0x0000000000000000000000000000000000000000', // Polygon
      42161: '0x0000000000000000000000000000000000000000', // Arbitrum
    }
  }
};

// Helper function to convert address to bytes32
function addressToBytes32(address: string): string {
  return ethers.utils.hexZeroPad(address, 32);
}

// Helper function to save deployment config
function saveDeploymentConfig(config: DeploymentConfig) {
  const configPath = path.join(__dirname, '..', 'deployments', 'config.json');
  const deploymentsDir = path.dirname(configPath);
  
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  let existingConfig = {};
  if (fs.existsSync(configPath)) {
    existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  
  const updatedConfig = {
    ...existingConfig,
    [config.network.chainId]: config
  };
  
  fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
  console.log(`📄 Deployment config saved to: ${configPath}`);
}

async function main() {
  console.log('🚀 Deploying MANI X AI Vault with LayerZero OVault Composer Integration...\n');

  const [deployer] = await ethers.getSigners();
  const network = await deployer.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log('Deployer:', deployer.address);
  console.log('Network:', network.name, `(Chain ID: ${chainId})`);
  console.log('Account balance:', ethers.utils.formatEther(await deployer.getBalance()), 'ETH');

  // Get LayerZero configuration for current chain
  const chainConfig = LAYER_ZERO_CONFIG[chainId];
  if (!chainConfig) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  console.log(`📡 LayerZero EID: ${chainConfig.eid}`);
  console.log(`🔗 LayerZero Endpoint: ${chainConfig.layerZeroEndpoint}`);

  // Determine if this is a hub vault (Monad) or spoke vault
  const isHubVault = chainId === 123456789; // Monad chain ID
  const vaultSuffix = isHubVault ? 'Hub' : 'Spoke';
  
  // Deploy DVN validator for testing (or use existing one)
  console.log('\n🔐 Deploying Enhanced DVN Validator...');
  const MockDVNValidator = await ethers.getContractFactory('MockDVNValidator');
  const dvnValidator = await MockDVNValidator.deploy();
  await dvnValidator.deployed();
  console.log('✅ DVN Validator deployed to:', dvnValidator.address);

  // Deploy Asset OFT
  console.log('\n🪙 Deploying Asset OFT...');
  const AssetOFT = await ethers.getContractFactory('AssetOFT');
  const assetOFT = await AssetOFT.deploy(
    `MANI X AI Asset ${vaultSuffix}`,
    isHubVault ? 'MANIXA' : 'MANIXA-SPOKE',
    chainConfig.layerZeroEndpoint,
    deployer.address
  );
  await assetOFT.deployed();
  console.log('✅ Asset OFT deployed to:', assetOFT.address);

  // Deploy Share OFT
  console.log('\n📊 Deploying Share OFT...');
  const ShareOFT = await ethers.getContractFactory('ShareOFT');
  const shareOFT = await ShareOFT.deploy(
    `MANI X AI Share ${vaultSuffix}`,
    isHubVault ? 'MANIXS' : 'MANIXS-SPOKE',
    chainConfig.layerZeroEndpoint,
    deployer.address
  );
  await shareOFT.deployed();
  console.log('✅ Share OFT deployed to:', shareOFT.address);

  // Vault configuration
  const vaultConfig: LayerZeroVaultConfig = {
    name: `MANI X AI Cross-Chain Vault ${vaultSuffix}`,
    symbol: isHubVault ? 'MANIXHUB' : 'MANIXSPOKE',
    asset: assetOFT.address, // Use Asset OFT as the underlying asset
    admin: deployer.address,
    layerZeroEndpoint: chainConfig.layerZeroEndpoint,
    dvnValidator: dvnValidator.address,
    isHubVault: isHubVault,
    performanceFee: 200, // 2%
    managementFee: 50,   // 0.5%
  };

  console.log('\n📋 Configuration:');
  console.log('- Vault Name:', vaultConfig.name);
  console.log('- Vault Symbol:', vaultConfig.symbol);
  console.log('- Asset Token (OFT):', vaultConfig.asset);
  console.log('- LayerZero Endpoint:', vaultConfig.layerZeroEndpoint);

  try {
    // Deploy vault implementation
    console.log('\n📦 Deploying ManixVault implementation...');
    const ManixVault = await ethers.getContractFactory('ManixVault');
    const vaultImplementation = await ManixVault.deploy();
    await vaultImplementation.deployed();
    console.log('✅ Vault implementation deployed to:', vaultImplementation.address);

    // Deploy proxy admin
    console.log('\n🔧 Deploying ProxyAdmin...');
    const ProxyAdmin = await ethers.getContractFactory('ProxyAdmin');
    const proxyAdmin = await ProxyAdmin.deploy();
    await proxyAdmin.deployed();
    console.log('✅ Proxy admin deployed to:', proxyAdmin.address);

    // Deploy vault proxy
    console.log('\n🔄 Deploying vault proxy...');
    const vaultInterface = ManixVault.interface;
    const initData = vaultInterface.encodeFunctionData('initialize', [
      vaultConfig.asset,
      vaultConfig.name,
      vaultConfig.symbol,
      vaultConfig.admin,
      vaultConfig.layerZeroEndpoint,
      vaultConfig.dvnValidator,
      vaultConfig.isHubVault,
    ]);

    const TransparentUpgradeableProxy = await ethers.getContractFactory('TransparentUpgradeableProxy');
    const vaultProxy = await TransparentUpgradeableProxy.deploy(
      vaultImplementation.address,
      proxyAdmin.address,
      initData
    );
    await vaultProxy.deployed();
    console.log('✅ Vault proxy deployed to:', vaultProxy.address);

    // Get vault instance through proxy
    const vault = ManixVault.attach(vaultProxy.address);

    // Deploy OVault Composer
    console.log('\n🎼 Deploying OVault Composer...');
    const OVaultComposer = await ethers.getContractFactory('OVaultComposer');
    const composer = await OVaultComposer.deploy(
      chainConfig.layerZeroEndpoint,
      deployer.address
    );
    await composer.deployed();
    console.log('✅ OVault Composer deployed to:', composer.address);

    // Configure OVault Composer
    console.log('\n⚙️ Configuring OVault Composer...');
    
    // Set hub vault address (only for hub)
    if (isHubVault) {
      await composer.setHubVault(vaultProxy.address);
      console.log('✅ Hub vault set in composer');
    }
    
    // Set DVN validator
    await composer.setDVNValidator(dvnValidator.address);
    console.log('✅ DVN validator set in composer');
    
    // Set initial fees
    console.log('\n💰 Setting initial fees...');
    await vault.setPerformanceFee(vaultConfig.performanceFee);
    await vault.setManagementFee(vaultConfig.managementFee);
    console.log('✅ Fees set - Performance:', vaultConfig.performanceFee, 'Management:', vaultConfig.managementFee);

    // Set composer in vault
    console.log('\n🔗 Linking composer to vault...');
    await vault.setComposer(composer.address);
    console.log('✅ Composer linked to vault');

    // Configure LayerZero trusted remotes and peers
    console.log('\n🌐 Configuring LayerZero trusted remotes and peers...');
    
    // Configure peers for all supported chains
    const supportedChains = [1, 137, 42161, 56, 123456789]; // Ethereum, Polygon, Arbitrum, BSC, Monad
    for (const targetChainId of supportedChains) {
      if (targetChainId !== chainId) {
        const targetEid = LAYER_ZERO_CONFIG[targetChainId]?.eid;
        if (targetEid) {
          // Set trusted remote in vault
          const remotePath = addressToBytes32(vaultProxy.address);
          await vault.setTrustedRemote(targetEid, remotePath);
          console.log(`✅ Trusted remote set for chain ${targetChainId} (EID: ${targetEid})`);
          
          // Set peer in composer
          const peerAddress = addressToBytes32(vaultProxy.address); // Will be updated with actual peer addresses
          await composer.setPeer(targetEid, peerAddress);
          console.log(`✅ Peer set in composer for chain ${targetChainId} (EID: ${targetEid})`);
          
          // Whitelist chain in composer
          await composer.setWhitelistedChain(targetEid, true);
          console.log(`✅ Chain ${targetChainId} whitelisted in composer`);
        }
      }
    }

    // Configure OFT peers
    console.log('\n🔗 Configuring OFT peers...');
    for (const targetChainId of supportedChains) {
      if (targetChainId !== chainId) {
        const targetEid = LAYER_ZERO_CONFIG[targetChainId]?.eid;
        if (targetEid) {
          // Set peers for Asset OFT
          const assetPeerAddress = addressToBytes32(assetOFT.address); // Will be updated with actual peer addresses
          await assetOFT.setPeer(targetEid, assetPeerAddress);
          console.log(`✅ Asset OFT peer set for chain ${targetChainId}`);
          
          // Set peers for Share OFT
          const sharePeerAddress = addressToBytes32(shareOFT.address); // Will be updated with actual peer addresses
          await shareOFT.setPeer(targetEid, sharePeerAddress);
          console.log(`✅ Share OFT peer set for chain ${targetChainId}`);
        }
      }
    }

    // Test LayerZero fee quoting
    console.log('\n💸 Testing LayerZero fee quoting...');
    try {
      // Create test message for hub-spoke deposit
      const testMessage = ethers.utils.defaultAbiCoder.encode(
        ['uint8', 'bytes32', 'address', 'uint256', 'uint256', 'uint32', 'uint32', 'bytes'],
        [
          12, // MSG_TYPE_SPOKE_DEPOSIT
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-tx')),
          deployer.address,
          ethers.utils.parseEther('1'),
          0,
          chainId,
          isHubVault ? 1 : 123456789, // target chain
          '0x'
        ]
      );
      
      const testOptions = ethers.utils.toUtf8Bytes('');
      
      // Quote fees with DVN validation
      const [nativeFee, lzTokenFee, dvnValid] = await composer.quoteLayerZeroFees(
        isHubVault ? 30101 : 10143, // target EID
        testMessage,
        testOptions,
        true // validate DVN
      );
      
      console.log('✅ LayerZero quote successful:');
      console.log(`   Native fee: ${ethers.utils.formatEther(nativeFee)} ETH`);
      console.log(`   LZ token fee: ${ethers.utils.formatEther(lzTokenFee)} ETH`);
      console.log(`   DVN valid: ${dvnValid}`);
    } catch (error) {
      console.log('⚠️  LayerZero quote failed (likely due to network configuration):', error.message);
    }

    // Verify deployment
    console.log('\n🔍 Verifying deployment...');
    console.log('Vault name:', await vault.name());
    console.log('Vault symbol:', await vault.symbol());
    console.log('Vault asset:', await vault.asset());
    console.log('Performance fee:', await vault.performanceFee());
    console.log('Management fee:', await vault.managementFee());
    console.log('Composer address:', await vault.composer());
    console.log('Admin role:', await vault.hasRole(await vault.DEFAULT_ADMIN_ROLE(), deployer.address));
    console.log('Cross-chain role:', await vault.hasRole(await vault.CROSS_CHAIN_ROLE(), deployer.address));
    console.log('AI role:', await vault.hasRole(await vault.AI_ROLE(), deployer.address));

    // Save deployment info
    const deploymentInfo: DeploymentConfig = {
      network: {
        name: network.name,
        chainId: chainId,
      },
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        vaultImplementation: vaultImplementation.address,
        proxyAdmin: proxyAdmin.address,
        vault: vaultProxy.address,
        composer: composer.address,
        assetOFT: assetOFT.address,
        shareOFT: shareOFT.address,
        dvnValidator: dvnValidator.address,
      },
      config: vaultConfig,
      layerZero: chainConfig,
    };

    // Save to config.json
    saveDeploymentConfig(deploymentInfo);

    console.log('\n📄 Deployment completed successfully!');
    console.log('Deployment info:', JSON.stringify(deploymentInfo, null, 2));

    // Instructions for verification
    console.log('\n--- Verification Instructions ---');
    console.log('To verify contracts on Etherscan, run:');
    console.log(`npx hardhat verify --network <network> ${vaultImplementation.address}`);
    console.log(`npx hardhat verify --network <network> ${proxyAdmin.address}`);
    console.log(`npx hardhat verify --network <network> ${composer.address}`);
    console.log(`npx hardhat verify --network <network> ${assetOFT.address}`);
    console.log(`npx hardhat verify --network <network> ${shareOFT.address}`);
    console.log(`npx hardhat verify --network <network> ${dvnValidator.address}`);

    console.log('\n--- Next Steps ---');
    console.log('1. Deploy contracts on all supported chains');
    console.log('2. Update peer addresses in composer and OFT contracts');
    console.log('3. Configure LayerZero DVN libraries');
    console.log('4. Test cross-chain deposits and withdrawals');
    console.log('5. Integrate with AI recommendation system');
    console.log('6. Run comprehensive test suite');

    console.log('\n--- LayerZero CLI Commands ---');
    console.log('To validate peer configuration:');
    console.log('npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts');
    console.log('To wire peers automatically:');
    console.log('npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts');

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
