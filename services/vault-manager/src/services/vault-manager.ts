import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { ethers } from 'ethers';
import { DeploymentConfig } from '../types/config';
import { VaultEvent, CrossChainDeposit, CrossChainWithdraw } from '../types/events';

export class VaultManagerService {
  private prisma: PrismaClient;
  private redis: Redis;
  private config: { [chainId: string]: DeploymentConfig };
  private providers: { [chainId: string]: ethers.providers.JsonRpcProvider };

  constructor(
    prisma: PrismaClient,
    redis: Redis,
    config: { [chainId: string]: DeploymentConfig },
    providers: { [chainId: string]: ethers.providers.JsonRpcProvider }
  ) {
    this.prisma = prisma;
    this.redis = redis;
    this.config = config;
    this.providers = providers;
  }

  /**
   * Process LayerZero hub events and update TVL data
   */
  async processHubEvent(event: VaultEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'CrossChainDepositInitiated':
          await this.handleDepositInitiated(event.data as CrossChainDeposit);
          break;
        case 'CrossChainDepositExecuted':
          await this.handleDepositExecuted(event.data as CrossChainDeposit);
          break;
        case 'CrossChainWithdrawInitiated':
          await this.handleWithdrawInitiated(event.data as CrossChainWithdraw);
          break;
        case 'CrossChainWithdrawExecuted':
          await this.handleWithdrawExecuted(event.data as CrossChainWithdraw);
          break;
        case 'HubDepositHandled':
          await this.handleHubDeposit(event.data as CrossChainDeposit);
          break;
        case 'SpokeWithdrawalProcessed':
          await this.handleSpokeWithdraw(event.data as CrossChainWithdraw);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error processing hub event:', error);
      throw error;
    }
  }

  /**
   * Handle cross-chain deposit initiation
   */
  private async handleDepositInitiated(data: CrossChainDeposit): Promise<void> {
    const { transactionId, user, amount, targetChain, targetVault } = data;

    // Create pending transaction record
    await this.prisma.pendingTransaction.create({
      data: {
        transactionId,
        userId: user,
        amount: amount.toString(),
        sourceChain: data.sourceChain || 'unknown',
        targetChain,
        targetVault,
        type: 'DEPOSIT',
        status: 'PENDING',
        timestamp: new Date()
      }
    });

    // Update user's pending deposits
    await this.redis.hincrby(`user:${user}:pending`, 'deposits', amount.toString());
    
    console.log(`📥 Deposit initiated: ${transactionId} - ${amount} from ${user}`);
  }

  /**
   * Handle cross-chain deposit execution
   */
  private async handleDepositExecuted(data: CrossChainDeposit): Promise<void> {
    const { transactionId, user, amount, sourceChain } = data;

    // Update transaction status
    await this.prisma.pendingTransaction.updateMany({
      where: { transactionId },
      data: { status: 'COMPLETED' }
    });

    // Update user's actual balance
    await this.redis.hincrby(`user:${user}:balance`, 'deposits', amount.toString());
    await this.redis.hincrby(`user:${user}:pending`, 'deposits', -amount.toString());

    // Update vault TVL
    await this.updateVaultTVL(data.targetVault || 'unknown', amount, 'ADD');

    // Update analytics
    await this.updateAnalytics(user, amount, 'DEPOSIT', sourceChain);

    console.log(`✅ Deposit executed: ${transactionId} - ${amount} for ${user}`);
  }

  /**
   * Handle cross-chain withdrawal initiation
   */
  private async handleWithdrawInitiated(data: CrossChainWithdraw): Promise<void> {
    const { transactionId, user, amount, targetChain, targetVault } = data;

    // Create pending transaction record
    await this.prisma.pendingTransaction.create({
      data: {
        transactionId,
        userId: user,
        amount: amount.toString(),
        sourceChain: data.sourceChain || 'unknown',
        targetChain,
        targetVault,
        type: 'WITHDRAW',
        status: 'PENDING',
        timestamp: new Date()
      }
    });

    // Update user's pending withdrawals
    await this.redis.hincrby(`user:${user}:pending`, 'withdrawals', amount.toString());
    
    console.log(`📤 Withdrawal initiated: ${transactionId} - ${amount} from ${user}`);
  }

  /**
   * Handle cross-chain withdrawal execution
   */
  private async handleWithdrawExecuted(data: CrossChainWithdraw): Promise<void> {
    const { transactionId, user, amount, sourceChain } = data;

    // Update transaction status
    await this.prisma.pendingTransaction.updateMany({
      where: { transactionId },
      data: { status: 'COMPLETED' }
    });

    // Update user's actual balance
    await this.redis.hincrby(`user:${user}:balance`, 'withdrawals', amount.toString());
    await this.redis.hincrby(`user:${user}:pending`, 'withdrawals', -amount.toString());

    // Update vault TVL
    await this.updateVaultTVL(data.targetVault || 'unknown', amount, 'SUBTRACT');

    // Update analytics
    await this.updateAnalytics(user, amount, 'WITHDRAW', sourceChain);

    console.log(`✅ Withdrawal executed: ${transactionId} - ${amount} for ${user}`);
  }

  /**
   * Handle hub deposit (from composer)
   */
  private async handleHubDeposit(data: CrossChainDeposit): Promise<void> {
    const { transactionId, user, amount, srcChain } = data;

    // Update vault TVL
    await this.updateVaultTVL('hub', amount, 'ADD');

    // Update user's hub balance
    await this.redis.hincrby(`user:${user}:hub`, 'balance', amount.toString());

    // Update cross-chain analytics
    await this.updateCrossChainAnalytics(user, amount, 'HUB_DEPOSIT', srcChain);

    console.log(`🏛️ Hub deposit: ${transactionId} - ${amount} from ${srcChain}`);
  }

  /**
   * Handle spoke withdrawal (from composer)
   */
  private async handleSpokeWithdraw(data: CrossChainWithdraw): Promise<void> {
    const { transactionId, user, amount, dstChain } = data;

    // Update vault TVL
    await this.updateVaultTVL('hub', amount, 'SUBTRACT');

    // Update user's spoke balance
    await this.redis.hincrby(`user:${user}:spoke`, 'balance', amount.toString());

    // Update cross-chain analytics
    await this.updateCrossChainAnalytics(user, amount, 'SPOKE_WITHDRAW', dstChain);

    console.log(`🔄 Spoke withdrawal: ${transactionId} - ${amount} to ${dstChain}`);
  }

  /**
   * Update vault TVL (Total Value Locked)
   */
  private async updateVaultTVL(vaultId: string, amount: ethers.BigNumber, operation: 'ADD' | 'SUBTRACT'): Promise<void> {
    const amountStr = amount.toString();
    const multiplier = operation === 'ADD' ? 1 : -1;
    
    // Update Redis cache
    await this.redis.hincrby(`vault:${vaultId}:tvl`, 'total', amountStr);
    
    // Update database
    const vault = await this.prisma.vault.findUnique({
      where: { address: vaultId }
    });

    if (vault) {
      const newTVL = operation === 'ADD' 
        ? vault.totalValueLocked + BigInt(amountStr)
        : vault.totalValueLocked - BigInt(amountStr);

      await this.prisma.vault.update({
        where: { address: vaultId },
        data: { 
          totalValueLocked: newTVL,
          lastUpdated: new Date()
        }
      });
    }
  }

  /**
   * Update user analytics
   */
  private async updateAnalytics(
    userId: string, 
    amount: ethers.BigNumber, 
    type: 'DEPOSIT' | 'WITHDRAW', 
    chainId: string
  ): Promise<void> {
    const amountStr = amount.toString();
    
    // Update user stats
    await this.redis.hincrby(`user:${userId}:stats`, `${type.toLowerCase()}s`, 1);
    await this.redis.hincrby(`user:${userId}:stats`, `${type.toLowerCase()}_volume`, amountStr);
    
    // Update chain-specific stats
    await this.redis.hincrby(`chain:${chainId}:stats`, `${type.toLowerCase()}s`, 1);
    await this.redis.hincrby(`chain:${chainId}:stats`, `${type.toLowerCase()}_volume`, amountStr);
    
    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    await this.redis.hincrby(`daily:${today}:stats`, `${type.toLowerCase()}s`, 1);
    await this.redis.hincrby(`daily:${today}:stats`, `${type.toLowerCase()}_volume`, amountStr);
  }

  /**
   * Update cross-chain analytics
   */
  private async updateCrossChainAnalytics(
    userId: string,
    amount: ethers.BigNumber,
    type: 'HUB_DEPOSIT' | 'SPOKE_WITHDRAW',
    chainId: string
  ): Promise<void> {
    const amountStr = amount.toString();
    
    // Update cross-chain stats
    await this.redis.hincrby(`crosschain:${chainId}:stats`, `${type.toLowerCase()}s`, 1);
    await this.redis.hincrby(`crosschain:${chainId}:stats`, `${type.toLowerCase()}_volume`, amountStr);
    
    // Update user's cross-chain activity
    await this.redis.hincrby(`user:${userId}:crosschain`, `${type.toLowerCase()}s`, 1);
    await this.redis.hincrby(`user:${userId}:crosschain`, `${type.toLowerCase()}_volume`, amountStr);
  }

  /**
   * Get vault TVL data
   */
  async getVaultTVL(vaultId: string): Promise<{
    totalValueLocked: string;
    totalDeposits: string;
    totalWithdrawals: string;
    activeUsers: number;
    lastUpdated: Date;
  }> {
    const vault = await this.prisma.vault.findUnique({
      where: { address: vaultId }
    });

    if (!vault) {
      throw new Error(`Vault ${vaultId} not found`);
    }

    const tvlData = await this.redis.hmget(
      `vault:${vaultId}:tvl`,
      'total',
      'deposits',
      'withdrawals'
    );

    const activeUsers = await this.redis.scard(`vault:${vaultId}:users`);

    return {
      totalValueLocked: tvlData[0] || '0',
      totalDeposits: tvlData[1] || '0',
      totalWithdrawals: tvlData[2] || '0',
      activeUsers,
      lastUpdated: vault.lastUpdated
    };
  }

  /**
   * Get user portfolio across all chains
   */
  async getUserPortfolio(userId: string): Promise<{
    totalBalance: string;
    chainBalances: { [chainId: string]: string };
    pendingTransactions: any[];
    crossChainActivity: any;
  }> {
    // Get balances from all chains
    const chainBalances: { [chainId: string]: string } = {};
    let totalBalance = '0';

    for (const chainId of Object.keys(this.config)) {
      const balance = await this.redis.hget(`user:${userId}:${chainId}`, 'balance') || '0';
      chainBalances[chainId] = balance;
      totalBalance = (BigInt(totalBalance) + BigInt(balance)).toString();
    }

    // Get pending transactions
    const pendingTransactions = await this.prisma.pendingTransaction.findMany({
      where: {
        userId,
        status: 'PENDING'
      },
      orderBy: { timestamp: 'desc' }
    });

    // Get cross-chain activity
    const crossChainActivity = await this.redis.hgetall(`user:${userId}:crosschain`);

    return {
      totalBalance,
      chainBalances,
      pendingTransactions,
      crossChainActivity
    };
  }

  /**
   * Get multi-chain TVL summary
   */
  async getMultiChainTVL(): Promise<{
    totalTVL: string;
    chainTVL: { [chainId: string]: string };
    vaultTVL: { [vaultId: string]: string };
  }> {
    const chainTVL: { [chainId: string]: string } = {};
    const vaultTVL: { [vaultId: string]: string } = {};
    let totalTVL = '0';

    // Get TVL by chain
    for (const chainId of Object.keys(this.config)) {
      const tvl = await this.redis.hget(`chain:${chainId}:tvl`, 'total') || '0';
      chainTVL[chainId] = tvl;
      totalTVL = (BigInt(totalTVL) + BigInt(tvl)).toString();
    }

    // Get TVL by vault
    const vaults = await this.prisma.vault.findMany();
    for (const vault of vaults) {
      const tvl = await this.redis.hget(`vault:${vault.address}:tvl`, 'total') || '0';
      vaultTVL[vault.address] = tvl;
    }

    return {
      totalTVL,
      chainTVL,
      vaultTVL
    };
  }
}
