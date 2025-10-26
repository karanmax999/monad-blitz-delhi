import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  contract: string;
  chainId: string;
  address: string;
  verified: boolean;
  verificationUrl?: string;
  abi?: any[];
  bytecode?: string;
  constructorArgs?: string;
  timestamp: string;
}

interface CrossChainTestResult {
  testName: string;
  sourceChain: string;
  targetChain: string;
  transactionHash: string;
  success: boolean;
  gasUsed: string;
  events: any[];
  timestamp: string;
}

interface DeploymentReport {
  deploymentId: string;
  timestamp: string;
  contracts: ValidationResult[];
  crossChainTests: CrossChainTestResult[];
  dvnValidation: {
    mockDvnReplaced: boolean;
    productionDvnEndpoint: string;
    validationTests: any[];
  };
  summary: {
    totalContracts: number;
    verifiedContracts: number;
    successfulTests: number;
    totalTests: number;
    overallStatus: 'PASS' | 'FAIL' | 'PARTIAL';
  };
}

export class PreLaunchValidator {
  private hre: HardhatRuntimeEnvironment;
  private config: any;
  private results: ValidationResult[] = [];
  private testResults: CrossChainTestResult[] = [];

  constructor(hre: HardhatRuntimeEnvironment) {
    this.hre = hre;
    this.config = this.loadDeploymentConfig();
  }

  /**
   * Main validation entry point
   */
  async validateAll(): Promise<DeploymentReport> {
    console.log('🔍 Starting Pre-Launch Validation...');
    
    const deploymentId = `validation-${Date.now()}`;
    const timestamp = new Date().toISOString();

    try {
      // Step 1: Contract Verification
      console.log('📋 Step 1: Contract Verification');
      await this.verifyAllContracts();

      // Step 2: Cross-Chain Testing
      console.log('🔗 Step 2: Cross-Chain Testing');
      await this.runCrossChainTests();

      // Step 3: DVN Validation
      console.log('🛡️ Step 3: DVN Validation');
      const dvnValidation = await this.validateDVN();

      // Step 4: Generate Report
      console.log('📊 Step 4: Generating Report');
      const report = this.generateReport(deploymentId, timestamp, dvnValidation);
      
      // Save report
      await this.saveReport(report);
      
      console.log('✅ Pre-Launch Validation Complete!');
      console.log(`📄 Report saved: deployments/results/${deploymentId}.json`);
      
      return report;

    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }
  }

  /**
   * Verify all contracts on block explorers
   */
  private async verifyAllContracts(): Promise<void> {
    const contractsToVerify = [
      'ManixVault',
      'OVaultComposer', 
      'AssetOFT',
      'ShareOFT',
      'MockDVNValidator'
    ];

    for (const [chainId, chainConfig] of Object.entries(this.config)) {
      console.log(`🔍 Verifying contracts on chain ${chainId} (${chainConfig.network.name})`);
      
      for (const contractName of contractsToVerify) {
        const contractAddress = chainConfig.contracts[this.getContractKey(contractName)];
        
        if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
          console.log(`⚠️ Skipping ${contractName} - not deployed on chain ${chainId}`);
          continue;
        }

        try {
          const result = await this.verifyContract(contractName, contractAddress, chainId, chainConfig);
          this.results.push(result);
          
          if (result.verified) {
            console.log(`✅ ${contractName} verified on ${chainConfig.network.name}`);
          } else {
            console.log(`❌ ${contractName} verification failed on ${chainConfig.network.name}`);
          }
        } catch (error) {
          console.error(`❌ Error verifying ${contractName} on ${chainConfig.network.name}:`, error);
          this.results.push({
            contract: contractName,
            chainId,
            address: contractAddress,
            verified: false,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  }

  /**
   * Verify individual contract
   */
  private async verifyContract(
    contractName: string, 
    address: string, 
    chainId: string, 
    chainConfig: any
  ): Promise<ValidationResult> {
    try {
      // Get contract factory
      const ContractFactory = await this.hre.ethers.getContractFactory(contractName);
      
      // Get ABI and bytecode
      const abi = ContractFactory.interface.format('json');
      const bytecode = ContractFactory.bytecode;

      // Prepare verification arguments
      const constructorArgs = await this.getConstructorArgs(contractName, chainConfig);

      // Attempt verification
      let verified = false;
      let verificationUrl = '';

      try {
        await this.hre.run('verify:verify', {
          address,
          constructorArguments: constructorArgs,
          contract: `contracts/core/${contractName}.sol:${contractName}`
        });
        verified = true;
        verificationUrl = this.getExplorerUrl(chainId, address);
      } catch (verifyError) {
        console.log(`Verification attempt failed for ${contractName}:`, verifyError.message);
        // Check if already verified
        if (verifyError.message.includes('Already Verified')) {
          verified = true;
          verificationUrl = this.getExplorerUrl(chainId, address);
        }
      }

      return {
        contract: contractName,
        chainId,
        address,
        verified,
        verificationUrl,
        abi: JSON.parse(abi),
        bytecode,
        constructorArgs: constructorArgs.join(','),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Contract verification failed: ${error.message}`);
    }
  }

  /**
   * Run comprehensive cross-chain tests
   */
  private async runCrossChainTests(): Promise<void> {
    const testScenarios = [
      {
        name: 'Monad to Ethereum Deposit',
        sourceChain: '123456789',
        targetChain: '1'
      },
      {
        name: 'Ethereum to Polygon Deposit', 
        sourceChain: '1',
        targetChain: '137'
      },
      {
        name: 'Polygon to Arbitrum Deposit',
        sourceChain: '137', 
        targetChain: '42161'
      },
      {
        name: 'Arbitrum to BSC Deposit',
        sourceChain: '42161',
        targetChain: '56'
      },
      {
        name: 'BSC to Monad Deposit',
        sourceChain: '56',
        targetChain: '123456789'
      }
    ];

    for (const scenario of testScenarios) {
      try {
        console.log(`🧪 Testing: ${scenario.name}`);
        const result = await this.runCrossChainTest(scenario);
        this.testResults.push(result);
        
        if (result.success) {
          console.log(`✅ ${scenario.name} - SUCCESS`);
        } else {
          console.log(`❌ ${scenario.name} - FAILED`);
        }
      } catch (error) {
        console.error(`❌ Error in ${scenario.name}:`, error);
        this.testResults.push({
          testName: scenario.name,
          sourceChain: scenario.sourceChain,
          targetChain: scenario.targetChain,
          transactionHash: '',
          success: false,
          gasUsed: '0',
          events: [],
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Run individual cross-chain test
   */
  private async runCrossChainTest(scenario: any): Promise<CrossChainTestResult> {
    const sourceConfig = this.config[scenario.sourceChain];
    const targetConfig = this.config[scenario.targetChain];

    if (!sourceConfig || !targetConfig) {
      throw new Error(`Configuration not found for chains ${scenario.sourceChain} or ${scenario.targetChain}`);
    }

    // Get source chain provider and signer
    const sourceProvider = new ethers.providers.JsonRpcProvider(sourceConfig.rpcUrl);
    const sourceSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, sourceProvider);

    // Get vault contract on source chain
    const vaultAddress = sourceConfig.contracts.vault;
    const vaultContract = new ethers.Contract(
      vaultAddress,
      ['function composerDeposit(uint256 amount, uint16 targetChain, uint256 minShares) external payable'],
      sourceSigner
    );

    // Execute test deposit
    const amount = ethers.utils.parseEther('0.001'); // Small test amount
    const targetChainId = parseInt(scenario.targetChain);
    const minShares = 0;

    const tx = await vaultContract.composerDeposit(
      amount,
      targetChainId,
      minShares,
      { value: amount }
    );

    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed.toString();

    // Extract events
    const events = receipt.events?.map(event => ({
      event: event.event,
      args: event.args
    })) || [];

    // Check for success events
    const successEvents = events.filter(event => 
      event.event === 'CrossChainDepositInitiated' || 
      event.event === 'HubDepositHandled'
    );

    return {
      testName: scenario.name,
      sourceChain: scenario.sourceChain,
      targetChain: scenario.targetChain,
      transactionHash: tx.hash,
      success: successEvents.length > 0,
      gasUsed,
      events,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate DVN configuration
   */
  private async validateDVN(): Promise<any> {
    console.log('🛡️ Validating DVN Configuration...');

    // Check if MockDVN is still being used
    const mockDvnAddresses = Object.values(this.config)
      .map((chain: any) => chain.contracts.dvnValidator)
      .filter(addr => addr && addr !== '0x0000000000000000000000000000000000000000');

    const mockDvnReplaced = mockDvnAddresses.length === 0;

    // Production DVN endpoints
    const productionDvnEndpoints = {
      '1': '0x1a44076050125825900e736c501f859c50fE728c', // Ethereum
      '137': '0x1a44076050125825900e736c501f859c50fE728c', // Polygon
      '42161': '0x1a44076050125825900e736c501f859c50fE728c', // Arbitrum
      '56': '0x1a44076050125825900e736c501f859c50fE728c', // BSC
      '123456789': '0x1a44076050125825900e736c501f859c50fE728c' // Monad
    };

    // Run DVN validation tests
    const validationTests = [];
    for (const [chainId, chainConfig] of Object.entries(this.config)) {
      try {
        const testResult = await this.testDVNValidation(chainId, chainConfig);
        validationTests.push(testResult);
      } catch (error) {
        validationTests.push({
          chainId,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      mockDvnReplaced,
      productionDvnEndpoint: productionDvnEndpoints,
      validationTests
    };
  }

  /**
   * Test DVN validation on specific chain
   */
  private async testDVNValidation(chainId: string, chainConfig: any): Promise<any> {
    const provider = new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
    const dvnAddress = chainConfig.contracts.dvnValidator;

    if (!dvnAddress || dvnAddress === '0x0000000000000000000000000000000000000000') {
      return {
        chainId,
        success: false,
        error: 'DVN validator not deployed',
        timestamp: new Date().toISOString()
      };
    }

    // Test DVN validator contract
    const dvnContract = new ethers.Contract(
      dvnAddress,
      ['function verifyWithDVN(bytes calldata proof, bytes calldata options) external view returns (bool)'],
      provider
    );

    try {
      // Test with mock proof
      const mockProof = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-proof'));
      const mockOptions = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-options'));
      
      const result = await dvnContract.verifyWithDVN(mockProof, mockOptions);
      
      return {
        chainId,
        success: true,
        dvnAddress,
        testResult: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        chainId,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate comprehensive deployment report
   */
  private generateReport(deploymentId: string, timestamp: string, dvnValidation: any): DeploymentReport {
    const verifiedContracts = this.results.filter(r => r.verified).length;
    const successfulTests = this.testResults.filter(t => t.success).length;
    
    let overallStatus: 'PASS' | 'FAIL' | 'PARTIAL' = 'PASS';
    if (verifiedContracts < this.results.length * 0.8) {
      overallStatus = 'FAIL';
    } else if (verifiedContracts < this.results.length || successfulTests < this.testResults.length) {
      overallStatus = 'PARTIAL';
    }

    return {
      deploymentId,
      timestamp,
      contracts: this.results,
      crossChainTests: this.testResults,
      dvnValidation,
      summary: {
        totalContracts: this.results.length,
        verifiedContracts,
        successfulTests,
        totalTests: this.testResults.length,
        overallStatus
      }
    };
  }

  /**
   * Save deployment report
   */
  private async saveReport(report: DeploymentReport): Promise<void> {
    const resultsDir = path.join(__dirname, '../deployments/results');
    
    // Ensure results directory exists
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const reportPath = path.join(resultsDir, `${report.deploymentId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Also save as latest
    const latestPath = path.join(resultsDir, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
  }

  /**
   * Helper methods
   */
  private loadDeploymentConfig(): any {
    const configPath = path.join(__dirname, '../deployments/config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  }

  private getContractKey(contractName: string): string {
    const mapping: { [key: string]: string } = {
      'ManixVault': 'vault',
      'OVaultComposer': 'composer',
      'AssetOFT': 'assetOFT',
      'ShareOFT': 'shareOFT',
      'MockDVNValidator': 'dvnValidator'
    };
    return mapping[contractName] || contractName.toLowerCase();
  }

  private async getConstructorArgs(contractName: string, chainConfig: any): Promise<any[]> {
    // Return constructor arguments based on contract type
    switch (contractName) {
      case 'ManixVault':
        return [
          chainConfig.config.name,
          chainConfig.config.symbol,
          chainConfig.config.asset,
          chainConfig.config.admin,
          chainConfig.config.layerZeroEndpoint,
          chainConfig.config.dvnValidator,
          chainConfig.config.isHubVault
        ];
      case 'OVaultComposer':
        return [
          chainConfig.config.layerZeroEndpoint,
          chainConfig.config.admin
        ];
      case 'AssetOFT':
      case 'ShareOFT':
        return [
          contractName === 'AssetOFT' ? 'MANI X AI Asset' : 'MANI X AI Share',
          contractName === 'AssetOFT' ? 'MANIXA' : 'MANIXS',
          chainConfig.config.layerZeroEndpoint,
          chainConfig.config.admin
        ];
      default:
        return [];
    }
  }

  private getExplorerUrl(chainId: string, address: string): string {
    const explorers: { [key: string]: string } = {
      '1': `https://etherscan.io/address/${address}`,
      '137': `https://polygonscan.com/address/${address}`,
      '42161': `https://arbiscan.io/address/${address}`,
      '56': `https://bscscan.com/address/${address}`,
      '123456789': `https://monad-explorer.com/address/${address}`
    };
    return explorers[chainId] || `https://explorer.chain-${chainId}.com/address/${address}`;
  }
}

// Export for use in Hardhat tasks
export default PreLaunchValidator;
