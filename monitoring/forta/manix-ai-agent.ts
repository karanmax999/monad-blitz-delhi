import {
  Finding,
  FindingSeverity,
  FindingType,
  HandleTransaction,
  HandleBlock,
  TransactionEvent,
  BlockEvent,
  getEthersProvider
} from "forta-agent";
import { ethers } from "ethers";

// Contract addresses and ABIs
const MANIX_VAULT_ABI = [
  "event CrossChainDepositInitiated(bytes32 indexed transactionId, address indexed user, uint256 amount, uint16 targetChain, address targetVault)",
  "event CrossChainDepositExecuted(bytes32 indexed transactionId, address indexed user, uint256 amount, uint16 sourceChain)",
  "event CrossChainWithdrawInitiated(bytes32 indexed transactionId, address indexed user, uint256 amount, uint16 targetChain, address targetVault)",
  "event CrossChainWithdrawExecuted(bytes32 indexed transactionId, address indexed user, uint256 amount, uint16 sourceChain)",
  "event HubDepositHandled(bytes32 indexed transactionId, address indexed user, uint256 amount, uint16 srcChain)",
  "event SpokeWithdrawalProcessed(bytes32 indexed transactionId, address indexed user, uint256 amount, uint16 dstChain)",
  "event AIRecommendationProcessed(address indexed user, string action, uint256 confidence, uint256 expectedReturn)"
];

const OVAULT_COMPOSER_ABI = [
  "event ComposerDepositExecuted(bytes32 indexed transactionId, address indexed user, uint256 amount, uint16 targetChain)",
  "event ComposerWithdrawExecuted(bytes32 indexed transactionId, address indexed user, uint256 amount, uint16 sourceChain)",
  "event AISyncCompleted(address indexed user, string action, uint256 confidence)"
];

// Configuration
const CONFIG = {
  VAULT_ADDRESSES: {
    '1': '0x0000000000000000000000000000000000000000', // Ethereum
    '137': '0x0000000000000000000000000000000000000000', // Polygon
    '42161': '0x0000000000000000000000000000000000000000', // Arbitrum
    '56': '0x0000000000000000000000000000000000000000', // BSC
    '123456789': '0x0000000000000000000000000000000000000000' // Monad
  },
  COMPOSER_ADDRESSES: {
    '1': '0x0000000000000000000000000000000000000000',
    '137': '0x0000000000000000000000000000000000000000',
    '42161': '0x0000000000000000000000000000000000000000',
    '56': '0x0000000000000000000000000000000000000000',
    '123456789': '0x0000000000000000000000000000000000000000'
  },
  THRESHOLDS: {
    LARGE_DEPOSIT: ethers.utils.parseEther('100'), // 100 ETH
    LARGE_WITHDRAWAL: ethers.utils.parseEther('50'), // 50 ETH
    HIGH_FREQUENCY_THRESHOLD: 10, // transactions per hour
    SUSPICIOUS_CONFIDENCE: 50, // AI confidence below 50%
    HIGH_RISK_SCORE: 80 // Risk score above 80
  }
};

// State tracking
const transactionCounts = new Map<string, number>();
const lastTransactionTime = new Map<string, number>();
const userActivity = new Map<string, { deposits: number, withdrawals: number, lastActivity: number }>();

/**
 * Handle transaction events
 */
export const handleTransaction: HandleTransaction = async (txEvent: TransactionEvent) => {
  const findings: Finding[] = [];

  // Check for MANI X AI vault events
  const vaultEvents = txEvent.filterLog(MANIX_VAULT_ABI);
  const composerEvents = txEvent.filterLog(OVAULT_COMPOSER_ABI);

  // Analyze vault events
  for (const event of vaultEvents) {
    findings.push(...await analyzeVaultEvent(event, txEvent));
  }

  // Analyze composer events
  for (const event of composerEvents) {
    findings.push(...await analyzeComposerEvent(event, txEvent));
  }

  // Check for suspicious patterns
  findings.push(...await checkSuspiciousPatterns(txEvent));

  return findings;
};

/**
 * Handle block events
 */
export const handleBlock: HandleBlock = async (blockEvent: BlockEvent) => {
  const findings: Finding[] = [];

  // Clean up old transaction counts (older than 1 hour)
  const oneHourAgo = Date.now() - 3600000;
  for (const [key, timestamp] of lastTransactionTime.entries()) {
    if (timestamp < oneHourAgo) {
      transactionCounts.delete(key);
      lastTransactionTime.delete(key);
    }
  }

  return findings;
};

/**
 * Analyze vault events for anomalies
 */
async function analyzeVaultEvent(event: any, txEvent: TransactionEvent): Promise<Finding[]> {
  const findings: Finding[] = [];

  switch (event.name) {
    case 'CrossChainDepositInitiated':
      findings.push(...await analyzeDepositEvent(event, txEvent));
      break;
    case 'CrossChainWithdrawInitiated':
      findings.push(...await analyzeWithdrawalEvent(event, txEvent));
      break;
    case 'AIRecommendationProcessed':
      findings.push(...await analyzeAIRecommendationEvent(event, txEvent));
      break;
  }

  return findings;
}

/**
 * Analyze composer events
 */
async function analyzeComposerEvent(event: any, txEvent: TransactionEvent): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Track composer activity
  const user = event.args.user;
  const amount = event.args.amount;

  // Check for large amounts
  if (amount.gt(CONFIG.THRESHOLDS.LARGE_DEPOSIT)) {
    findings.push(
      Finding.fromObject({
        name: "Large Cross-Chain Transaction Detected",
        description: `Large ${event.name} detected: ${ethers.utils.formatEther(amount)} ETH`,
        alertId: "MANIX-LARGE-TX",
        severity: FindingSeverity.Medium,
        type: FindingType.Info,
        metadata: {
          user: user,
          amount: amount.toString(),
          transactionHash: txEvent.transaction.hash,
          event: event.name
        }
      })
    );
  }

  return findings;
}

/**
 * Analyze deposit events
 */
async function analyzeDepositEvent(event: any, txEvent: TransactionEvent): Promise<Finding[]> {
  const findings: Finding[] = [];
  const user = event.args.user;
  const amount = event.args.amount;
  const targetChain = event.args.targetChain;

  // Track user activity
  updateUserActivity(user, 'deposit', amount);

  // Check for large deposits
  if (amount.gt(CONFIG.THRESHOLDS.LARGE_DEPOSIT)) {
    findings.push(
      Finding.fromObject({
        name: "Large Cross-Chain Deposit Detected",
        description: `Large cross-chain deposit detected: ${ethers.utils.formatEther(amount)} ETH to chain ${targetChain}`,
        alertId: "MANIX-LARGE-DEPOSIT",
        severity: FindingSeverity.Medium,
        type: FindingType.Info,
        metadata: {
          user: user,
          amount: amount.toString(),
          targetChain: targetChain.toString(),
          transactionHash: txEvent.transaction.hash
        }
      })
    );
  }

  // Check for suspicious frequency
  const frequency = checkTransactionFrequency(user, txEvent.timestamp);
  if (frequency > CONFIG.THRESHOLDS.HIGH_FREQUENCY_THRESHOLD) {
    findings.push(
      Finding.fromObject({
        name: "High Frequency Cross-Chain Activity",
        description: `User ${user} has made ${frequency} cross-chain transactions in the last hour`,
        alertId: "MANIX-HIGH-FREQUENCY",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
        metadata: {
          user: user,
          frequency: frequency.toString(),
          transactionHash: txEvent.transaction.hash
        }
      })
    );
  }

  return findings;
}

/**
 * Analyze withdrawal events
 */
async function analyzeWithdrawalEvent(event: any, txEvent: TransactionEvent): Promise<Finding[]> {
  const findings: Finding[] = [];
  const user = event.args.user;
  const amount = event.args.amount;
  const targetChain = event.args.targetChain;

  // Track user activity
  updateUserActivity(user, 'withdrawal', amount);

  // Check for large withdrawals
  if (amount.gt(CONFIG.THRESHOLDS.LARGE_WITHDRAWAL)) {
    findings.push(
      Finding.fromObject({
        name: "Large Cross-Chain Withdrawal Detected",
        description: `Large cross-chain withdrawal detected: ${ethers.utils.formatEther(amount)} ETH to chain ${targetChain}`,
        alertId: "MANIX-LARGE-WITHDRAWAL",
        severity: FindingSeverity.Medium,
        type: FindingType.Info,
        metadata: {
          user: user,
          amount: amount.toString(),
          targetChain: targetChain.toString(),
          transactionHash: txEvent.transaction.hash
        }
      })
    );
  }

  return findings;
}

/**
 * Analyze AI recommendation events
 */
async function analyzeAIRecommendationEvent(event: any, txEvent: TransactionEvent): Promise<Finding[]> {
  const findings: Finding[] = [];
  const user = event.args.user;
  const action = event.args.action;
  const confidence = event.args.confidence.toNumber();
  const expectedReturn = event.args.expectedReturn.toNumber();

  // Check for low confidence AI recommendations
  if (confidence < CONFIG.THRESHOLDS.SUSPICIOUS_CONFIDENCE) {
    findings.push(
      Finding.fromObject({
        name: "Low Confidence AI Recommendation",
        description: `AI recommendation with low confidence (${confidence}%): ${action}`,
        alertId: "MANIX-LOW-AI-CONFIDENCE",
        severity: FindingSeverity.Medium,
        type: FindingType.Info,
        metadata: {
          user: user,
          action: action,
          confidence: confidence.toString(),
          expectedReturn: expectedReturn.toString(),
          transactionHash: txEvent.transaction.hash
        }
      })
    );
  }

  // Check for suspiciously high expected returns
  if (expectedReturn > 50) { // More than 50% expected return
    findings.push(
      Finding.fromObject({
        name: "Suspiciously High Expected Return",
        description: `AI recommendation with unusually high expected return: ${expectedReturn}%`,
        alertId: "MANIX-HIGH-EXPECTED-RETURN",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
        metadata: {
          user: user,
          action: action,
          confidence: confidence.toString(),
          expectedReturn: expectedReturn.toString(),
          transactionHash: txEvent.transaction.hash
        }
      })
    );
  }

  return findings;
}

/**
 * Check for suspicious patterns
 */
async function checkSuspiciousPatterns(txEvent: TransactionEvent): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Check for contract interactions with MANI X AI contracts
  const vaultAddresses = Object.values(CONFIG.VAULT_ADDRESSES);
  const composerAddresses = Object.values(CONFIG.COMPOSER_ADDRESSES);
  
  const allAddresses = [...vaultAddresses, ...composerAddresses];
  const interactedAddresses = txEvent.addresses.filter(addr => allAddresses.includes(addr));

  if (interactedAddresses.length > 0) {
    // Check for unusual gas usage
    if (txEvent.gasUsed.gt(500000)) { // More than 500k gas
      findings.push(
        Finding.fromObject({
          name: "High Gas Usage on MANI X AI Contract",
          description: `Transaction used unusually high gas: ${txEvent.gasUsed.toString()}`,
          alertId: "MANIX-HIGH-GAS",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
            gasUsed: txEvent.gasUsed.toString(),
            transactionHash: txEvent.transaction.hash,
            interactedContracts: interactedAddresses.join(',')
          }
        })
      );
    }

    // Check for failed transactions
    if (txEvent.status === 0) {
      findings.push(
        Finding.fromObject({
          name: "Failed Transaction on MANI X AI Contract",
          description: `Transaction failed on MANI X AI contract`,
          alertId: "MANIX-FAILED-TX",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
          metadata: {
            transactionHash: txEvent.transaction.hash,
            interactedContracts: interactedAddresses.join(',')
          }
        })
      );
    }
  }

  return findings;
}

/**
 * Update user activity tracking
 */
function updateUserActivity(user: string, type: 'deposit' | 'withdrawal', amount: ethers.BigNumber): void {
  const now = Date.now();
  const activity = userActivity.get(user) || { deposits: 0, withdrawals: 0, lastActivity: now };
  
  if (type === 'deposit') {
    activity.deposits += 1;
  } else {
    activity.withdrawals += 1;
  }
  
  activity.lastActivity = now;
  userActivity.set(user, activity);
}

/**
 * Check transaction frequency for a user
 */
function checkTransactionFrequency(user: string, timestamp: number): number {
  const key = `${user}-${Math.floor(timestamp / 3600)}`; // Hour-based key
  const count = transactionCounts.get(key) || 0;
  transactionCounts.set(key, count + 1);
  lastTransactionTime.set(key, timestamp);
  
  return count + 1;
}

/**
 * Export configuration for testing
 */
export { CONFIG };
