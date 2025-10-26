import { ethers } from 'ethers';
import { DeploymentConfig } from '../types/config';
import { VaultManagerService } from './vault-manager';
import { AIStrategyEngine } from './ai-strategy-engine';
import { RiskAnalyticsService } from './risk-analytics';
import { NotificationService } from './notification';

export class EventListener {
  private config: { [chainId: string]: DeploymentConfig };
  private providers: { [chainId: string]: ethers.providers.JsonRpcProvider };
  private vaultManager: VaultManagerService;
  private aiEngine: AIStrategyEngine;
  private riskAnalytics: RiskAnalyticsService;
  private notificationService: NotificationService;
  
  private listeners: { [chainId: string]: ethers.Contract } = {};
  private isRunning: boolean = false;

  constructor(
    config: { [chainId: string]: DeploymentConfig },
    providers: { [chainId: string]: ethers.providers.JsonRpcProvider },
    vaultManager: VaultManagerService,
    aiEngine: AIStrategyEngine,
    riskAnalytics: RiskAnalyticsService,
    notificationService: NotificationService
  ) {
    this.config = config;
    this.providers = providers;
    this.vaultManager = vaultManager;
    this.aiEngine = aiEngine;
    this.riskAnalytics = riskAnalytics;
    this.notificationService = notificationService;
  }

  /**
   * Start listening to LayerZero events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Event listener already running');
      return;
    }

    console.log('🎧 Starting LayerZero event listeners...');

    for (const [chainId, chainConfig] of Object.entries(this.config)) {
      await this.setupChainListener(chainId, chainConfig);
    }

    this.isRunning = true;
    console.log('✅ All event listeners started');
  }

  /**
   * Stop listening to events
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping event listeners...');

    for (const [chainId, listener] of Object.entries(this.listeners)) {
      listener.removeAllListeners();
      console.log(`Stopped listener for chain ${chainId}`);
    }

    this.listeners = {};
    this.isRunning = false;
    console.log('✅ All event listeners stopped');
  }

  /**
   * Setup event listener for a specific chain
   */
  private async setupChainListener(chainId: string, chainConfig: DeploymentConfig): Promise<void> {
    const provider = this.providers[chainId];
    const vaultAddress = chainConfig.contracts.vault;
    const composerAddress = chainConfig.contracts.composer;

    if (!provider || !vaultAddress || !composerAddress) {
      console.log(`Skipping chain ${chainId} - missing provider or contract addresses`);
      return;
    }

    // Vault contract ABI (simplified)
    const vaultABI = [
      'event CrossChainDepositInitiated(bytes32 indexed transactionId, address indexed user, uint256 amount, uint16 targetChain, address targetVault)',
      'event CrossChainDepositExecuted(bytes32 indexed transactionId, address indexed user, uint256 amount, uint16 sourceChain)',
      'event CrossChainWithdrawInitiated(bytes32 indexed transactionId, address indexed user, uint256 amount, uint16 targetChain, address targetVault)',
      'event CrossChainWithdrawExecuted(bytes32 indexed transactionId, address indexed user, uint256 amount, uint16 sourceChain)',
      'event HubDepositHandled(bytes32 indexed transactionId, address indexed user, uint256 amount, uint16 srcChain)',
      'event SpokeWithdrawalProcessed(bytes32 indexed transactionId, address indexed user, uint256 amount, uint16 dstChain)',
      'event AIRecommendationProcessed(address indexed user, string action, uint256 confidence, uint256 expectedReturn)'
    ];

    // Composer contract ABI (simplified)
    const composerABI = [
      'event ComposerDepositExecuted(bytes32 indexed transactionId, address indexed user, uint256 amount, uint16 targetChain)',
      'event ComposerWithdrawExecuted(bytes32 indexed transactionId, address indexed user, uint256 amount, uint16 sourceChain)',
      'event AISyncCompleted(address indexed user, string action, uint256 confidence)'
    ];

    // Create vault contract instance
    const vaultContract = new ethers.Contract(vaultAddress, vaultABI, provider);
    
    // Create composer contract instance
    const composerContract = new ethers.Contract(composerAddress, composerABI, provider);

    // Setup vault event listeners
    this.setupVaultEventListeners(vaultContract, chainId);
    
    // Setup composer event listeners
    this.setupComposerEventListeners(composerContract, chainId);

    this.listeners[chainId] = vaultContract;

    console.log(`🎧 Listening to events on chain ${chainId} (${chainConfig.network.name})`);
  }

  /**
   * Setup vault event listeners
   */
  private setupVaultEventListeners(vaultContract: ethers.Contract, chainId: string): void {
    // Cross-chain deposit initiated
    vaultContract.on('CrossChainDepositInitiated', async (
      transactionId: string,
      user: string,
      amount: ethers.BigNumber,
      targetChain: number,
      targetVault: string,
      event: any
    ) => {
      console.log(`📥 Cross-chain deposit initiated on chain ${chainId}`);
      
      try {
        await this.vaultManager.processHubEvent({
          type: 'CrossChainDepositInitiated',
          chainId,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          data: {
            transactionId,
            user,
            amount,
            targetChain,
            targetVault,
            sourceChain: chainId
          }
        });

        // Send notification
        await this.notificationService.sendNotification({
          type: 'CROSS_CHAIN_UPDATE',
          userId: user,
          message: `Cross-chain deposit initiated: ${ethers.utils.formatEther(amount)} tokens`,
          data: {
            transactionId,
            amount: amount.toString(),
            targetChain,
            sourceChain: chainId
          },
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error processing CrossChainDepositInitiated:', error);
      }
    });

    // Cross-chain deposit executed
    vaultContract.on('CrossChainDepositExecuted', async (
      transactionId: string,
      user: string,
      amount: ethers.BigNumber,
      sourceChain: number,
      event: any
    ) => {
      console.log(`✅ Cross-chain deposit executed on chain ${chainId}`);
      
      try {
        await this.vaultManager.processHubEvent({
          type: 'CrossChainDepositExecuted',
          chainId,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          data: {
            transactionId,
            user,
            amount,
            sourceChain,
            targetChain: chainId
          }
        });

        // Trigger risk analytics update
        await this.riskAnalytics.calculateRiskMetrics(chainId, chainId);

        // Send notification
        await this.notificationService.sendNotification({
          type: 'CROSS_CHAIN_UPDATE',
          userId: user,
          message: `Cross-chain deposit completed: ${ethers.utils.formatEther(amount)} tokens`,
          data: {
            transactionId,
            amount: amount.toString(),
            sourceChain,
            targetChain: chainId
          },
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error processing CrossChainDepositExecuted:', error);
      }
    });

    // Cross-chain withdraw initiated
    vaultContract.on('CrossChainWithdrawInitiated', async (
      transactionId: string,
      user: string,
      amount: ethers.BigNumber,
      targetChain: number,
      targetVault: string,
      event: any
    ) => {
      console.log(`📤 Cross-chain withdrawal initiated on chain ${chainId}`);
      
      try {
        await this.vaultManager.processHubEvent({
          type: 'CrossChainWithdrawInitiated',
          chainId,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          data: {
            transactionId,
            user,
            amount,
            targetChain,
            targetVault,
            sourceChain: chainId
          }
        });

        // Send notification
        await this.notificationService.sendNotification({
          type: 'CROSS_CHAIN_UPDATE',
          userId: user,
          message: `Cross-chain withdrawal initiated: ${ethers.utils.formatEther(amount)} tokens`,
          data: {
            transactionId,
            amount: amount.toString(),
            targetChain,
            sourceChain: chainId
          },
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error processing CrossChainWithdrawInitiated:', error);
      }
    });

    // Cross-chain withdraw executed
    vaultContract.on('CrossChainWithdrawExecuted', async (
      transactionId: string,
      user: string,
      amount: ethers.BigNumber,
      sourceChain: number,
      event: any
    ) => {
      console.log(`✅ Cross-chain withdrawal executed on chain ${chainId}`);
      
      try {
        await this.vaultManager.processHubEvent({
          type: 'CrossChainWithdrawExecuted',
          chainId,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          data: {
            transactionId,
            user,
            amount,
            sourceChain,
            targetChain: chainId
          }
        });

        // Trigger risk analytics update
        await this.riskAnalytics.calculateRiskMetrics(chainId, chainId);

        // Send notification
        await this.notificationService.sendNotification({
          type: 'CROSS_CHAIN_UPDATE',
          userId: user,
          message: `Cross-chain withdrawal completed: ${ethers.utils.formatEther(amount)} tokens`,
          data: {
            transactionId,
            amount: amount.toString(),
            sourceChain,
            targetChain: chainId
          },
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error processing CrossChainWithdrawExecuted:', error);
      }
    });

    // Hub deposit handled
    vaultContract.on('HubDepositHandled', async (
      transactionId: string,
      user: string,
      amount: ethers.BigNumber,
      srcChain: number,
      event: any
    ) => {
      console.log(`🏛️ Hub deposit handled on chain ${chainId}`);
      
      try {
        await this.vaultManager.processHubEvent({
          type: 'HubDepositHandled',
          chainId,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          data: {
            transactionId,
            user,
            amount,
            srcChain,
            targetChain: chainId
          }
        });

      } catch (error) {
        console.error('Error processing HubDepositHandled:', error);
      }
    });

    // Spoke withdrawal processed
    vaultContract.on('SpokeWithdrawalProcessed', async (
      transactionId: string,
      user: string,
      amount: ethers.BigNumber,
      dstChain: number,
      event: any
    ) => {
      console.log(`🔄 Spoke withdrawal processed on chain ${chainId}`);
      
      try {
        await this.vaultManager.processHubEvent({
          type: 'SpokeWithdrawalProcessed',
          chainId,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          data: {
            transactionId,
            user,
            amount,
            dstChain,
            sourceChain: chainId
          }
        });

      } catch (error) {
        console.error('Error processing SpokeWithdrawalProcessed:', error);
      }
    });

    // AI recommendation processed
    vaultContract.on('AIRecommendationProcessed', async (
      user: string,
      action: string,
      confidence: ethers.BigNumber,
      expectedReturn: ethers.BigNumber,
      event: any
    ) => {
      console.log(`🤖 AI recommendation processed on chain ${chainId}`);
      
      try {
        await this.aiEngine.processAIRecommendation({
          userId: user,
          vaultId: chainId,
          action,
          confidence: confidence.toNumber(),
          expectedReturn: expectedReturn.toNumber(),
          timestamp: new Date()
        });

        // Send notification
        await this.notificationService.sendNotification({
          type: 'AI_RECOMMENDATION',
          userId: user,
          message: `AI recommendation: ${action} (${confidence.toNumber()}% confidence)`,
          data: {
            action,
            confidence: confidence.toNumber(),
            expectedReturn: expectedReturn.toNumber(),
            chainId
          },
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error processing AIRecommendationProcessed:', error);
      }
    });
  }

  /**
   * Setup composer event listeners
   */
  private setupComposerEventListeners(composerContract: ethers.Contract, chainId: string): void {
    // Composer deposit executed
    composerContract.on('ComposerDepositExecuted', async (
      transactionId: string,
      user: string,
      amount: ethers.BigNumber,
      targetChain: number,
      event: any
    ) => {
      console.log(`🎼 Composer deposit executed on chain ${chainId}`);
      
      try {
        await this.vaultManager.processHubEvent({
          type: 'ComposerDepositExecuted',
          chainId,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          data: {
            transactionId,
            user,
            amount,
            targetChain,
            sourceChain: chainId
          }
        });

      } catch (error) {
        console.error('Error processing ComposerDepositExecuted:', error);
      }
    });

    // Composer withdraw executed
    composerContract.on('ComposerWithdrawExecuted', async (
      transactionId: string,
      user: string,
      amount: ethers.BigNumber,
      sourceChain: number,
      event: any
    ) => {
      console.log(`🎼 Composer withdrawal executed on chain ${chainId}`);
      
      try {
        await this.vaultManager.processHubEvent({
          type: 'ComposerWithdrawExecuted',
          chainId,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          data: {
            transactionId,
            user,
            amount,
            sourceChain,
            targetChain: chainId
          }
        });

      } catch (error) {
        console.error('Error processing ComposerWithdrawExecuted:', error);
      }
    });

    // AI sync completed
    composerContract.on('AISyncCompleted', async (
      user: string,
      action: string,
      confidence: ethers.BigNumber,
      event: any
    ) => {
      console.log(`🤖 AI sync completed on chain ${chainId}`);
      
      try {
        await this.aiEngine.processAIRecommendation({
          userId: user,
          vaultId: chainId,
          action,
          confidence: confidence.toNumber(),
          expectedReturn: 0, // Not provided in event
          timestamp: new Date()
        });

        // Send notification
        await this.notificationService.sendNotification({
          type: 'AI_RECOMMENDATION',
          userId: user,
          message: `AI sync completed: ${action} (${confidence.toNumber()}% confidence)`,
          data: {
            action,
            confidence: confidence.toNumber(),
            chainId
          },
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error processing AISyncCompleted:', error);
      }
    });
  }
}
