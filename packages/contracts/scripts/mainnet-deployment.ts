import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

interface MainnetConfig {
  networks: {
    [chainId: string]: {
      name: string;
      rpcUrl: string;
      layerZeroEndpoint: string;
      eid: number;
      gasPrice?: string;
      gasLimit?: string;
    };
  };
  contracts: {
    vaultName: string;
    vaultSymbol: string;
    assetToken: string;
    admin: string;
    performanceFee: number;
    managementFee: number;
  };
  dvn: {
    productionEndpoint: string;
    replaceMockDvn: boolean;
  };
  monitoring: {
    enablePrometheus: boolean;
    enableGrafana: boolean;
    enableForta: boolean;
  };
}

export class MainnetDeployer {
  private hre: HardhatRuntimeEnvironment;
  private config: MainnetConfig;
  private deployedContracts: { [chainId: string]: any } = {};

  constructor(hre: HardhatRuntimeEnvironment) {
    this.hre = hre;
    this.config = this.loadMainnetConfig();
  }

  /**
   * Deploy to all mainnet chains
   */
  async deployToAllChains(): Promise<void> {
    console.log('🚀 Starting Mainnet Deployment...');
    
    const deploymentId = `mainnet-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Deploy to each chain
      for (const [chainId, networkConfig] of Object.entries(this.config.networks)) {
        console.log(`\n📡 Deploying to ${networkConfig.name} (Chain ID: ${chainId})`);
        await this.deployToChain(chainId, networkConfig);
      }

      // Configure cross-chain peers
      console.log('\n🔗 Configuring Cross-Chain Peers...');
      await this.configureCrossChainPeers();

      // Replace Mock DVN with production DVN
      if (this.config.dvn.replaceMockDvn) {
        console.log('\n🛡️ Replacing Mock DVN with Production DVN...');
        await this.replaceMockDvn();
      }

      // Generate deployment summary
      const deploymentTime = Date.now() - startTime;
      await this.generateDeploymentSummary(deploymentId, deploymentTime);

      console.log('\n✅ Mainnet Deployment Complete!');
      console.log(`⏱️ Total deployment time: ${Math.round(deploymentTime / 1000)}s`);

    } catch (error) {
      console.error('❌ Mainnet deployment failed:', error);
      throw error;
    }
  }

  /**
   * Deploy to specific chain
   */
  private async deployToChain(chainId: string, networkConfig: any): Promise<void> {
    try {
      // Set network
      await this.hre.changeNetwork(networkConfig.name);

      // Get deployer account
      const [deployer] = await this.hre.ethers.getSigners();
      console.log(`📝 Deploying with account: ${deployer.address}`);

      // Check balance
      const balance = await deployer.getBalance();
      console.log(`💰 Account balance: ${ethers.utils.formatEther(balance)} ETH`);

      if (balance.lt(ethers.utils.parseEther('0.1'))) {
        throw new Error('Insufficient balance for deployment');
      }

      // Deploy contracts in order
      const contracts = await this.deployContracts(chainId, networkConfig, deployer);
      
      // Configure contracts
      await this.configureContracts(chainId, contracts, deployer);

      // Save deployment info
      this.deployedContracts[chainId] = {
        network: networkConfig,
        deployer: deployer.address,
        contracts,
        timestamp: new Date().toISOString()
      };

      console.log(`✅ ${networkConfig.name} deployment complete`);

    } catch (error) {
      console.error(`❌ Failed to deploy to ${networkConfig.name}:`, error);
      throw error;
    }
  }

  /**
   * Deploy all contracts for a chain
   */
  private async deployContracts(chainId: string, networkConfig: any, deployer: any): Promise<any> {
    const contracts: any = {};

    // 1. Deploy MockDVNValidator (or skip if using production DVN)
    if (!this.config.dvn.replaceMockDvn) {
      console.log('🛡️ Deploying MockDVNValidator...');
      const MockDVNValidator = await this.hre.ethers.getContractFactory('MockDVNValidator');
      contracts.dvnValidator = await MockDVNValidator.deploy();
      await contracts.dvnValidator.deployed();
      console.log(`✅ MockDVNValidator deployed: ${contracts.dvnValidator.address}`);
    } else {
      contracts.dvnValidator = this.config.dvn.productionEndpoint;
    }

    // 2. Deploy AssetOFT
    console.log('🪙 Deploying AssetOFT...');
    const AssetOFT = await this.hre.ethers.getContractFactory('AssetOFT');
    contracts.assetOFT = await AssetOFT.deploy(
      'MANI X AI Asset',
      'MANIXA',
      networkConfig.layerZeroEndpoint,
      deployer.address
    );
    await contracts.assetOFT.deployed();
    console.log(`✅ AssetOFT deployed: ${contracts.assetOFT.address}`);

    // 3. Deploy ShareOFT
    console.log('📊 Deploying ShareOFT...');
    const ShareOFT = await this.hre.ethers.getContractFactory('ShareOFT');
    contracts.shareOFT = await ShareOFT.deploy(
      'MANI X AI Share',
      'MANIXS',
      networkConfig.layerZeroEndpoint,
      deployer.address
    );
    await contracts.shareOFT.deployed();
    console.log(`✅ ShareOFT deployed: ${contracts.shareOFT.address}`);

    // 4. Deploy ManixVault Implementation
    console.log('🏛️ Deploying ManixVault Implementation...');
    const ManixVault = await this.hre.ethers.getContractFactory('ManixVault');
    contracts.vaultImplementation = await ManixVault.deploy();
    await contracts.vaultImplementation.deployed();
    console.log(`✅ ManixVault Implementation deployed: ${contracts.vaultImplementation.address}`);

    // 5. Deploy ProxyAdmin
    console.log('🔧 Deploying ProxyAdmin...');
    const ProxyAdmin = await this.hre.ethers.getContractFactory('ProxyAdmin');
    contracts.proxyAdmin = await ProxyAdmin.deploy();
    await contracts.proxyAdmin.deployed();
    console.log(`✅ ProxyAdmin deployed: ${contracts.proxyAdmin.address}`);

    // 6. Deploy ManixVault Proxy
    console.log('🏛️ Deploying ManixVault Proxy...');
    const TransparentUpgradeableProxy = await this.hre.ethers.getContractFactory('TransparentUpgradeableProxy');
    
    const initData = contracts.vaultImplementation.interface.encodeFunctionData('initialize', [
      this.config.contracts.vaultName,
      this.config.contracts.vaultSymbol,
      this.config.contracts.assetToken,
      this.config.contracts.admin,
      networkConfig.layerZeroEndpoint,
      contracts.dvnValidator,
      chainId === '123456789' // isHubVault for Monad
    ]);

    contracts.vault = await TransparentUpgradeableProxy.deploy(
      contracts.vaultImplementation.address,
      contracts.proxyAdmin.address,
      initData
    );
    await contracts.vault.deployed();
    console.log(`✅ ManixVault Proxy deployed: ${contracts.vault.address}`);

    // 7. Deploy OVaultComposer
    console.log('🎼 Deploying OVaultComposer...');
    const OVaultComposer = await this.hre.ethers.getContractFactory('OVaultComposer');
    contracts.composer = await OVaultComposer.deploy(
      networkConfig.layerZeroEndpoint,
      deployer.address
    );
    await contracts.composer.deployed();
    console.log(`✅ OVaultComposer deployed: ${contracts.composer.address}`);

    return contracts;
  }

  /**
   * Configure deployed contracts
   */
  private async configureContracts(chainId: string, contracts: any, deployer: any): Promise<void> {
    console.log('⚙️ Configuring contracts...');

    // Get vault instance
    const vault = await this.hre.ethers.getContractAt('ManixVault', contracts.vault.address);

    // Configure vault
    await vault.setComposer(contracts.composer.address);
    console.log('✅ Vault composer configured');

    // Configure composer
    const composer = await this.hre.ethers.getContractAt('OVaultComposer', contracts.composer.address);
    
    await composer.setHubVault(contracts.vault.address);
    console.log('✅ Composer hub vault configured');

    if (contracts.dvnValidator !== this.config.dvn.productionEndpoint) {
      await composer.setDVNValidator(contracts.dvnValidator);
      console.log('✅ Composer DVN validator configured');
    }

    // Set trusted remotes for all other chains
    for (const [remoteChainId, remoteConfig] of Object.entries(this.config.networks)) {
      if (remoteChainId !== chainId) {
        const remoteVaultAddress = this.deployedContracts[remoteChainId]?.contracts?.vault?.address;
        if (remoteVaultAddress) {
          const remotePath = ethers.utils.solidityPack(['address', 'address'], [remoteVaultAddress, contracts.vault.address]);
          await vault.setTrustedRemote(parseInt(remoteChainId), remotePath);
          console.log(`✅ Trusted remote set for chain ${remoteChainId}`);
        }
      }
    }

    // Set fees
    await vault.setFees(this.config.contracts.performanceFee, this.config.contracts.managementFee);
    console.log('✅ Vault fees configured');
  }

  /**
   * Configure cross-chain peers using LayerZero CLI
   */
  private async configureCrossChainPeers(): Promise<void> {
    console.log('🔗 Configuring cross-chain peers...');

    // Generate layerzero.config.ts with deployed addresses
    await this.generateLayerZeroConfig();

    // Run LayerZero CLI commands
    try {
      console.log('📡 Wiring peers with LayerZero CLI...');
      await this.runCommand('npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts');
      console.log('✅ Peers wired successfully');

      console.log('🔍 Validating peer configuration...');
      await this.runCommand('npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts');
      console.log('✅ Peer configuration validated');

    } catch (error) {
      console.error('❌ LayerZero CLI configuration failed:', error);
      throw error;
    }
  }

  /**
   * Replace Mock DVN with production DVN
   */
  private async replaceMockDvn(): Promise<void> {
    console.log('🛡️ Replacing Mock DVN with production DVN...');

    for (const [chainId, deployment] of Object.entries(this.deployedContracts)) {
      if (deployment.contracts.dvnValidator !== this.config.dvn.productionEndpoint) {
        console.log(`🔄 Updating DVN on chain ${chainId}...`);
        
        const composer = await this.hre.ethers.getContractAt(
          'OVaultComposer', 
          deployment.contracts.composer.address
        );

        await composer.setDVNValidator(this.config.dvn.productionEndpoint);
        console.log(`✅ DVN updated on chain ${chainId}`);
      }
    }
  }

  /**
   * Generate deployment summary
   */
  private async generateDeploymentSummary(deploymentId: string, deploymentTime: number): Promise<void> {
    const summary = {
      deploymentId,
      timestamp: new Date().toISOString(),
      deploymentTime: `${Math.round(deploymentTime / 1000)}s`,
      networks: Object.keys(this.config.networks),
      contracts: this.deployedContracts,
      config: this.config,
      nextSteps: [
        'Verify contracts on block explorers',
        'Run pre-launch validation tests',
        'Configure monitoring and alerting',
        'Set up production monitoring dashboards',
        'Prepare for public beta launch'
      ]
    };

    // Save summary
    const summaryPath = path.join(__dirname, '../deployments/mainnet-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // Update config.json with deployed addresses
    await this.updateDeploymentConfig();

    console.log('\n📊 Deployment Summary:');
    console.log(`📄 Summary saved: ${summaryPath}`);
    console.log(`🔗 Networks deployed: ${Object.keys(this.deployedContracts).length}`);
    console.log(`⏱️ Total time: ${Math.round(deploymentTime / 1000)}s`);
  }

  /**
   * Update deployment config with deployed addresses
   */
  private async updateDeploymentConfig(): Promise<void> {
    const configPath = path.join(__dirname, '../deployments/config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    for (const [chainId, deployment] of Object.entries(this.deployedContracts)) {
      if (config[chainId]) {
        config[chainId].contracts = deployment.contracts;
        config[chainId].deployer = deployment.deployer;
        config[chainId].timestamp = deployment.timestamp;
      }
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Deployment config updated');
  }

  /**
   * Generate LayerZero configuration file
   */
  private async generateLayerZeroConfig(): Promise<void> {
    const config = {
      oapp: {} as any,
      executorConfig: {} as any,
      dvnConfig: {} as any
    };

    for (const [chainId, deployment] of Object.entries(this.deployedContracts)) {
      const networkConfig = this.config.networks[chainId];
      
      config.oapp[networkConfig.name] = {
        eid: networkConfig.eid,
        contracts: {
          vault: deployment.contracts.vault.address,
          composer: deployment.contracts.composer.address,
          assetOFT: deployment.contracts.assetOFT.address,
          shareOFT: deployment.contracts.shareOFT.address
        }
      };

      config.executorConfig[networkConfig.name] = {
        executor: '0x0000000000000000000000000000000000000000',
        maxMessageSize: 10000
      };

      config.dvnConfig[networkConfig.name] = {
        dvn: this.config.dvn.productionEndpoint,
        gasLimit: 200000
      };
    }

    const configPath = path.join(__dirname, '../layerzero.config.ts');
    const configContent = `export default ${JSON.stringify(config, null, 2)};`;
    fs.writeFileSync(configPath, configContent);
    console.log('✅ LayerZero config generated');
  }

  /**
   * Helper methods
   */
  private loadMainnetConfig(): MainnetConfig {
    const configPath = path.join(__dirname, '../config/mainnet.json');
    
    if (!fs.existsSync(configPath)) {
      // Create default mainnet config
      const defaultConfig: MainnetConfig = {
        networks: {
          '123456789': {
            name: 'monad',
            rpcUrl: process.env.MONAD_MAINNET_RPC_URL || 'https://mainnet-rpc.monad.xyz',
            layerZeroEndpoint: '0x1a44076050125825900e736c501f859c50fE728c',
            eid: 10143
          },
          '1': {
            name: 'ethereum',
            rpcUrl: process.env.ETHEREUM_MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
            layerZeroEndpoint: '0x1a44076050125825900e736c501f859c50fE728c',
            eid: 30101
          },
          '137': {
            name: 'polygon',
            rpcUrl: process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
            layerZeroEndpoint: '0x1a44076050125825900e736c501f859c50fE728c',
            eid: 30109
          },
          '42161': {
            name: 'arbitrum',
            rpcUrl: process.env.ARBITRUM_MAINNET_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
            layerZeroEndpoint: '0x1a44076050125825900e736c501f859c50fE728c',
            eid: 30110
          },
          '56': {
            name: 'bsc',
            rpcUrl: process.env.BSC_MAINNET_RPC_URL || 'https://bsc-dataseed.binance.org/',
            layerZeroEndpoint: '0x1a44076050125825900e736c501f859c50fE728c',
            eid: 30102
          }
        },
        contracts: {
          vaultName: 'MANI X AI Cross-Chain Vault',
          vaultSymbol: 'MANIXVAULT',
          assetToken: '0xA0b86a33E6441b8c4C8C0e4B8c4C8C0e4B8c4C8C0', // USDC
          admin: process.env.ADMIN_ADDRESS || '0x0000000000000000000000000000000000000000',
          performanceFee: 200, // 2%
          managementFee: 50    // 0.5%
        },
        dvn: {
          productionEndpoint: '0x1a44076050125825900e736c501f859c50fE728c',
          replaceMockDvn: true
        },
        monitoring: {
          enablePrometheus: true,
          enableGrafana: true,
          enableForta: true
        }
      };

      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log('📝 Created default mainnet config. Please update with your values.');
      return defaultConfig;
    }

    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  private async runCommand(command: string): Promise<void> {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    try {
      const { stdout, stderr } = await execAsync(command);
      if (stderr) {
        console.log(stderr);
      }
      if (stdout) {
        console.log(stdout);
      }
    } catch (error) {
      throw new Error(`Command failed: ${error.message}`);
    }
  }
}

// Export for use in Hardhat tasks
export default MainnetDeployer;
