# LayerZero Cross-Chain Integration for MANI X AI

This document describes the comprehensive LayerZero omnichain functionality implemented in the MANI X AI vault and strategy contracts for cross-chain deposits, yield synchronization, and AI recommendations.

## Overview

The LayerZero integration enables:
- **Cross-chain deposits and withdrawals** between supported chains
- **Real-time yield synchronization** across multiple chains
- **AI recommendation propagation** for coordinated strategy execution
- **Full event logging** for monitoring and analytics

## Architecture

### Contracts Enhanced

1. **ManixVault.sol** - Main vault with LayerZero receiver capability
2. **ManixStrategyBase.sol** - Strategy base with cross-chain AI processing
3. **LayerZeroUtils.sol** - Utility library for message encoding/decoding

### Message Types

```solidity
uint8 MSG_TYPE_CROSS_CHAIN_DEPOSIT = 1;
uint8 MSG_TYPE_CROSS_CHAIN_WITHDRAW = 2;
uint8 MSG_TYPE_YIELD_SYNC = 3;
uint8 MSG_TYPE_AI_RECOMMENDATION = 4;
uint8 MSG_TYPE_REBALANCE_UPDATE = 5;
uint8 MSG_TYPE_STATE_SYNC = 6;
```

## Core Functions

### ManixVault LayerZero Functions

#### Cross-Chain Deposit
```solidity
function sendCrossChainDeposit(
    uint32 _targetChain,
    address _targetVault,
    uint256 _amount,
    address _user,
    bytes memory _options
) external payable onlyRole(CROSS_CHAIN_ROLE)
```

- Initiates cross-chain deposit to target chain
- Generates unique transaction ID to prevent duplicates
- Emits `CrossChainDepositInitiated` event

#### Cross-Chain Withdraw
```solidity
function sendCrossChainWithdraw(
    uint32 _targetChain,
    address _targetVault,
    uint256 _amount,
    address _user,
    bytes memory _options
) external payable onlyRole(CROSS_CHAIN_ROLE)
```

- Initiates cross-chain withdrawal to target chain
- Validates user has sufficient balance
- Emits `CrossChainWithdrawExecuted` event

#### Yield Synchronization
```solidity
function sendCrossChainUpdate(
    uint32 _targetChain,
    address _targetVault,
    bytes memory _options
) external payable onlyRole(HARVESTER_ROLE)
```

- Sends current vault state to target chain
- Includes total assets, shares, APY, and strategy hash
- Enables coordinated yield optimization across chains

#### AI Recommendation Broadcasting
```solidity
function sendAIRecommendation(
    uint32 _targetChain,
    address _targetVault,
    address _user,
    string memory _action,
    uint256 _confidence,
    uint256 _expectedReturn,
    bytes memory _options
) external payable onlyRole(AI_ROLE)
```

- Broadcasts AI recommendations to target chains
- Requires minimum 70% confidence level
- Enables coordinated AI-driven strategy execution

### Message Reception

#### LayerZero Receiver Implementation
```solidity
function lzReceive(
    bytes32 _origin,
    uint32 _srcEid,
    bytes calldata _message,
    address _executor,
    bytes calldata _extraData
) external payable override
```

- Processes incoming cross-chain messages
- Validates source chain is trusted
- Routes messages to appropriate handlers

#### Message Processing
The contract automatically processes different message types:

1. **Cross-chain deposits** - Mints shares to users from other chains
2. **Cross-chain withdrawals** - Burns shares and updates balances
3. **Yield synchronization** - Updates strategy parameters
4. **AI recommendations** - Forwards to strategy contracts

## Strategy Integration

### ManixStrategyBase LayerZero Functions

#### Cross-Chain AI Processing
```solidity
function _handleCrossChainAIRecommendation(
    uint32 _srcEid, 
    bytes calldata _message
) internal
```

- Processes AI recommendations from other chains
- Updates strategy state with new recommendations
- Executes actions based on confidence thresholds

#### Strategy Synchronization
```solidity
function _handleCrossChainStrategySync(
    uint32 _srcEid, 
    bytes calldata _message
) internal
```

- Synchronizes strategy state across chains
- Enables coordinated rebalancing and optimization

## Security Features

### Access Control
- **CROSS_CHAIN_ROLE** - Can initiate cross-chain operations
- **AI_ROLE** - Can send AI recommendations
- **HARVESTER_ROLE** - Can send yield sync updates
- **ADMIN_ROLE** - Can configure trusted remotes

### Validation
- **Duplicate Prevention** - Transaction IDs prevent replay attacks
- **Trust Verification** - Only trusted chains accepted
- **Balance Validation** - Sufficient balance checks for withdrawals
- **Confidence Thresholds** - Minimum AI confidence levels

## Event Logging

### Vault Events
```solidity
event CrossChainDepositInitiated(bytes32 indexed transactionId, address indexed user, uint256 amount, uint32 targetChain, address targetVault);
event CrossChainDepositExecuted(bytes32 indexed transactionId, address indexed user, uint256 amount, uint32 sourceChain);
event CrossChainWithdrawInitiated(bytes32 indexed transactionId, address indexed user, uint256 amount, uint32 targetChain, address targetVault);
event CrossChainWithdrawExecuted(bytes32 indexed transactionId, address indexed user, uint256 amount, uint32 sourceChain);
event YieldSyncMessageSent(uint32 targetChain, uint256 totalAssets, uint256 totalShares, uint256 apy, bytes32 strategyHash);
event YieldSyncMessageReceived(uint32 sourceChain, uint256 totalAssets, uint256 totalShares, uint256 apy, bytes32 strategyHash);
event AIRecommendationCrossChain(address indexed user, string action, uint256 confidence, uint256 expectedReturn, bytes32 recommendationId, uint32 targetChain);
event LayerZeroMessageReceived(uint32 sourceChain, bytes32 origin, bytes message);
```

### Strategy Events
```solidity
event CrossChainAIRecommendationReceived(uint32 sourceChain, address indexed user, string action, uint256 confidence, uint256 expectedReturn, bytes32 recommendationId);
event CrossChainStrategySync(uint32 sourceChain, uint256 strategyAssets, uint256 apy, bytes32 strategyHash);
event LayerZeroMessageReceivedStrategy(uint32 sourceChain, bytes32 origin, bytes message);
```

## Configuration

### Trusted Remote Setup
```solidity
function setTrustedRemote(uint32 _srcEid, bytes calldata _path) external onlyRole(ADMIN_ROLE)
```

- Admin must configure trusted remote paths for each supported chain
- Path format: `abi.encodePacked(remoteContractAddress, localContractAddress)`

### Supported Chains
- **Ethereum** (Chain ID: 1)
- **Polygon** (Chain ID: 137)
- **Arbitrum** (Chain ID: 42161)
- **BSC** (Chain ID: 56)
- **Monad** (Chain ID: 123456789) - When available

## Deployment

### LayerZero Endpoints
Each chain has specific LayerZero endpoint addresses that need to be configured:

```typescript
const LAYER_ZERO_CONFIG = {
  1: { layerZeroEndpoint: '0x1a44076050125825900e736c501f859c50fE728c' }, // Ethereum
  137: { layerZeroEndpoint: '0x1a44076050125825900e736c501f859c50fE728c' }, // Polygon
  42161: { layerZeroEndpoint: '0x1a44076050125825900e736c501f859c50fE728c' }, // Arbitrum
  56: { layerZeroEndpoint: '0x1a44076050125825900e736c501f859c50fE728c' }, // BSC
};
```

### Initialization
```solidity
function initialize(
    address _asset,
    string memory _name,
    string memory _symbol,
    address _admin,
    address _layerZeroEndpoint
) external initializer
```

## Usage Examples

### Cross-Chain Deposit Flow
1. User calls `sendCrossChainDeposit()` on source chain vault
2. Vault creates LayerZero message and sends to target chain
3. Target chain vault receives message via `lzReceive()`
4. Target vault processes deposit and mints shares to user
5. Events are emitted for monitoring

### AI Recommendation Flow
1. AI system generates recommendation on source chain
2. Recommendation sent via `sendAIRecommendation()`
3. Target chain vault receives and forwards to strategy
4. Strategy processes recommendation and executes action
5. Results synchronized across chains

### Yield Sync Flow
1. Harvest triggers on source chain
2. Yield data sent via `sendCrossChainUpdate()`
3. Target chains receive and update strategy parameters
4. Coordinated optimization across all chains

## Fee Management

### LayerZero Fees
- Native token fees for cross-chain messaging
- Optional LZ token fees for reduced costs
- Fee quoting via `quoteLayerZeroFee()` function

### Monitoring
All cross-chain operations include comprehensive event logging for:
- Transaction tracking across chains
- Performance monitoring
- Security auditing
- User analytics

## Best Practices

1. **Always verify trusted remotes** before processing messages
2. **Use unique transaction IDs** to prevent duplicate processing
3. **Implement proper error handling** for failed cross-chain operations
4. **Monitor events** for cross-chain activity and performance
5. **Test thoroughly** with multiple chains before mainnet deployment

This LayerZero integration provides a robust foundation for truly decentralized, cross-chain DeFi operations with AI-driven optimization capabilities.
