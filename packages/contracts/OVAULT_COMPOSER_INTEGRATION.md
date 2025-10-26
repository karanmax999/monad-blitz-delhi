# OVault Composer Integration - MANI X AI

## Overview

This document describes the LayerZero OVault Composer integration for MANI X AI, implementing a hub-and-spoke architecture for cross-chain asset and share transfers with OFT (Omnichain Fungible Token) support and DVN (Data Verification Network) validation.

## Architecture

### Hub-and-Spoke Model

- **Hub Vault (Monad)**: Central vault that manages aggregated yield optimization and AI recommendations
- **Spoke Vaults**: Supporting vaults on Ethereum, Polygon, Arbitrum, and BSC that sync with the hub
- **Cross-Chain Communication**: LayerZero messaging for deposits, withdrawals, and AI synchronization

### Key Components

1. **OVault Composer Interface**: Implements LayerZero OFT standards for asset/share transfers
2. **DVN Validation**: Data Verification Network integration for secure cross-chain messaging
3. **Hub-Spoke Messaging**: Specialized message types for coordinated operations
4. **AI Recommendation Sync**: Cross-chain propagation of AI-driven strategy recommendations

## Deployment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MANI X AI Cross-Chain Deployment Flow                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Monad     │    │  Ethereum   │    │   Polygon    │    │  Arbitrum    │    │     BSC     │
│   (Hub)     │    │  (Spoke)    │    │  (Spoke)     │    │  (Spoke)     │    │  (Spoke)    │
│   EID:10143 │    │  EID:30101  │    │  EID:30109   │    │  EID:30110   │    │  EID:30102  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Deploy    │    │   Deploy    │    │   Deploy    │    │   Deploy    │    │   Deploy    │
│ Contracts:  │    │ Contracts:  │    │ Contracts:  │    │ Contracts:  │    │ Contracts:  │
│ • ManixVault│    │ • ManixVault│    │ • ManixVault│    │ • ManixVault│    │ • ManixVault│
│ • Composer  │    │ • Composer  │    │ • Composer  │    │ • Composer  │    │ • Composer  │
│ • AssetOFT  │    │ • AssetOFT  │    │ • AssetOFT  │    │ • AssetOFT  │    │ • AssetOFT  │
│ • ShareOFT  │    │ • ShareOFT  │    │ • ShareOFT  │    │ • ShareOFT  │    │ • ShareOFT  │
│ • DVN       │    │ • DVN       │    │ • DVN       │    │ • DVN       │    │ • DVN       │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Configure   │    │ Configure   │    │ Configure   │    │ Configure   │    │ Configure   │
│ • Set Hub   │    │ • Set DVN   │    │ • Set DVN   │    │ • Set DVN   │    │ • Set DVN   │
│ • Set DVN   │    │ • Set Peers │    │ • Set Peers │    │ • Set Peers │    │ • Set Peers │
│ • Set Peers │    │ • Whitelist │    │ • Whitelist │    │ • Whitelist │    │ • Whitelist │
│ • Whitelist │    │ • OFT Peers │    │ • OFT Peers │    │ • OFT Peers │    │ • OFT Peers │
│ • OFT Peers │    │ • Link to   │    │ • Link to   │    │ • Link to   │    │ • Link to   │
│ • Link to   │    │   Vault     │    │   Vault     │    │   Vault     │    │   Vault     │
│   Vault     │    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
└─────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Cross-Chain Peer Configuration                        │
└─────────────────────────────────────────────────────────────────────────────────┘

Hub (Monad) ←→ Spokes (Ethereum, Polygon, Arbitrum, BSC)
     │                    │
     ▼                    ▼
┌─────────────┐    ┌─────────────┐
│ Set Peers   │    │ Set Peers   │
│ • Vault     │    │ • Vault     │
│ • Composer  │    │ • Composer  │
│ • AssetOFT  │    │ • AssetOFT  │
│ • ShareOFT  │    │ • ShareOFT  │
└─────────────┘    └─────────────┘
```

## Cross-Chain Deposit Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Cross-Chain Deposit Flow Diagram                         │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │    │ Spoke Vault │    │ AssetOFT    │    │ Hub Composer│    │  Hub Vault  │
│ (Ethereum)  │    │ (Ethereum)  │    │ (Cross-Chain│    │   (Monad)   │    │   (Monad)   │
│             │    │             │    │ Transfer)   │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │                   │
       │ 1. deposit()      │                   │                   │                   │
       ├──────────────────►│                   │                   │                   │
       │                   │                   │                   │                   │
       │                   │ 2. AssetOFT.send()│                   │                   │
       │                   ├──────────────────►│                   │                   │
       │                   │                   │                   │                   │
       │                   │                   │ 3. LayerZero      │                   │
       │                   │                   │    Message       │                   │
       │                   │                   ├──────────────────►│                   │
       │                   │                   │                   │                   │
       │                   │                   │                   │ 4. lzCompose()   │
       │                   │                   │                   ├──────────────────►│
       │                   │                   │                   │                   │
       │                   │                   │                   │ 5. DVN Validation│
       │                   │                   │                   │    + composerDeposit()│
       │                   │                   │                   │                   │
       │                   │                   │                   │ 6. Mint Shares  │
       │                   │                   │                   │    + Emit Event │
       │                   │                   │                   │                   │
       │                   │                   │                   │ 7. ShareOFT.send()│
       │                   │                   │                   ├──────────────────►│
       │                   │                   │                   │                   │
       │                   │                   │ 8. LayerZero      │                   │
       │                   │                   │    Response       │                   │
       │                   │                   │◄──────────────────┤                   │
       │                   │                   │                   │                   │
       │                   │ 9. Receive Shares │                   │                   │
       │                   │◄──────────────────┤                   │                   │
       │                   │                   │                   │                   │
       │ 10. Shares Minted │                   │                   │                   │
       │◄──────────────────┤                   │                   │                   │
       │                   │                   │                   │                   │
```

## Peer Configuration Table

| Chain | EID | Contract Type | Contract Address | Peer Configuration |
|-------|-----|---------------|------------------|-------------------|
| **Monad (Hub)** | 10143 | Vault | `0x...` | Peers to all spokes |
| | | Composer | `0x...` | Peers to all spokes |
| | | AssetOFT | `0x...` | Peers to all spokes |
| | | ShareOFT | `0x...` | Peers to all spokes |
| | | DVN Validator | `0x...` | Validates all chains |
| **Ethereum** | 30101 | Vault | `0x...` | Peers to Monad hub |
| | | Composer | `0x...` | Peers to Monad hub |
| | | AssetOFT | `0x...` | Peers to Monad hub |
| | | ShareOFT | `0x...` | Peers to Monad hub |
| | | DVN Validator | `0x...` | Validates Monad |
| **Polygon** | 30109 | Vault | `0x...` | Peers to Monad hub |
| | | Composer | `0x...` | Peers to Monad hub |
| | | AssetOFT | `0x...` | Peers to Monad hub |
| | | ShareOFT | `0x...` | Peers to Monad hub |
| | | DVN Validator | `0x...` | Validates Monad |
| **Arbitrum** | 30110 | Vault | `0x...` | Peers to Monad hub |
| | | Composer | `0x...` | Peers to Monad hub |
| | | AssetOFT | `0x...` | Peers to Monad hub |
| | | ShareOFT | `0x...` | Peers to Monad hub |
| | | DVN Validator | `0x...` | Validates Monad |
| **BSC** | 30102 | Vault | `0x...` | Peers to Monad hub |
| | | Composer | `0x...` | Peers to Monad hub |
| | | AssetOFT | `0x...` | Peers to Monad hub |
| | | ShareOFT | `0x...` | Peers to Monad hub |
| | | DVN Validator | `0x...` | Validates Monad |

## DVN Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DVN Validation Workflow                           │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Message   │    │   DVN       │    │   Proof    │    │ Composer   │    │   Vault     │
│   Creation  │    │ Validator   │    │ Generation │    │ Validation │    │ Execution   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │                   │
       │ 1. Create Message │                   │                   │                   │
       ├──────────────────►│                   │                   │                   │
       │                   │                   │                   │                   │
       │                   │ 2. Generate Proof │                   │                   │
       │                   ├──────────────────►│                   │                   │
       │                   │                   │                   │                   │
       │                   │ 3. Return Proof   │                   │                   │
       │                   │◄──────────────────┤                   │                   │
       │                   │                   │                   │                   │
       │ 4. Send with Proof│                   │                   │                   │
       ├──────────────────►│                   │                   │                   │
       │                   │                   │                   │                   │
       │                   │ 5. Validate Proof │                   │                   │
       │                   ├──────────────────►│                   │                   │
       │                   │                   │                   │                   │
       │                   │ 6. Proof Valid   │                   │                   │
       │                   │◄──────────────────┤                   │                   │
       │                   │                   │                   │                   │
       │                   │ 7. Execute Message│                   │                   │
       │                   ├──────────────────►│                   │                   │
       │                   │                   │                   │                   │
       │                   │ 8. Process Action │                   │                   │
       │                   │                   │                   │                   │
       │                   │ 9. Emit Events    │                   │                   │
       │                   │                   │                   │                   │
```

## Smart Contract Enhancements

### ManixVault.sol Updates

#### New State Variables
```solidity
IDVNValidator public dvnValidator;
mapping(uint32 => bool) public isSupportedChain;
mapping(uint32 => bytes) public chainDVNOptions;
bool public isHubVault;
uint32 public hubChainId;
mapping(bytes32 => bool) public hubSpokeTransactions;
address public composer; // OVault Composer address
```

#### Enhanced Initialization
```solidity
function initialize(
    address _asset,
    string memory _name,
    string memory _symbol,
    address _admin,
    address _layerZeroEndpoint,
    address _dvnValidator,
    bool _isHubVault
) external initializer
```

#### New Functions

**1. quoteLayerZeroFees()** - Enhanced fee quoting with DVN validation
```solidity
function quoteLayerZeroFees(
    uint32 _dstEid,
    bytes memory _message,
    bytes memory _options,
    bool _validateDVN
) external view returns (uint256 nativeFee, uint256 lzTokenFee, bool dvnValid)
```

**2. send()** - OVault Composer send function
```solidity
function send(
    SendParam calldata _sendParam,
    MessagingFee calldata _fee,
    address _refundAddress
) external payable returns (MessagingFee memory, bytes memory)
```

**3. lzCompose()** - Receives and processes hub-spoke messages
```solidity
function lzCompose(
    address _from,
    address _to,
    bytes32 _guid,
    bytes calldata _message
) external payable
```

**4. sendAISyncToChains()** - Multi-chain AI recommendation propagation
```solidity
function sendAISyncToChains(
    address _user,
    string memory _action,
    uint256 _confidence,
    uint256 _expectedReturn,
    uint32[] memory _targetChains,
    bytes memory _options
) external payable
```

**5. Composer Hooks** - New functions for OVault Composer integration
```solidity
function composerDeposit(address user, uint256 amount, bytes32 txId, uint32 srcEid) external;
function composerWithdraw(address user, uint256 amount, bytes32 txId, uint32 srcEid) external;
function composerAISync(bytes calldata aiMessage) external;
```

### OVaultComposer.sol - New Modular Contract

#### Key Features
- Implements LayerZero v2 OApp Composer and OVault Composer interfaces
- DVN validation as mandatory pre-execution step
- Hub-and-spoke coordination with Monad as hub
- Chain whitelisting and peer management
- Fee quoting with DVN validation

#### Core Functions
```solidity
function lzCompose(
    address oApp,
    bytes32 guid,
    bytes calldata message,
    address executor,
    bytes calldata extraData
) external payable override;

function quoteLayerZeroFees(
    uint32 _dstEid,
    bytes calldata _message,
    bytes calldata _options,
    bool _validateDVN
) external view returns (uint256 nativeFee, uint256 lzTokenFee, bool dvnValid);

function verifyWithDVN(bytes32 messageHash, bytes calldata dvnProof, uint32 srcEid) 
    public view returns (bool);
```

### AssetOFT.sol & ShareOFT.sol - OFT v2 Integration

#### Features
- ERC20 tokens bound to LayerZero OFT v2
- Cross-chain asset and share transfers
- Peer configuration for multi-chain support
- Mint/burn functionality for testing

#### Key Functions
```solidity
function setPeer(uint32 remoteEID, bytes32 remotePeer) external onlyOwner;
function mint(address to, uint256 amount) external onlyOwner;
function burn(address from, uint256 amount) external onlyOwner;
```

### Enhanced MockDVNValidator.sol

#### Multi-Chain Support
- Chain-specific validation states
- DVN configuration per chain
- Validation count tracking
- Replay attack prevention

#### New Functions
```solidity
function setChainValidationEnabled(uint32 _eid, bool _enabled) external onlyOwner;
function setChainDVNOptions(uint32 _eid, DVNOptions memory _options) external onlyOwner;
function verifyWithDVNStrict(bytes32 _messageHash, bytes calldata _dvnProof, uint32 _srcEid) external returns (bool);
function getChainValidationStats(uint32 _eid) external view returns (bool enabled, uint256 count, DVNOptions memory options, ExecutionState memory state);
```

## Usage Examples

### 1. Hub-and-Spoke Deposit Flow

**From Spoke (Ethereum) to Hub (Monad):**

```solidity
// 1. User deposits on Ethereum spoke vault
await spokeVault.connect(user).deposit(amount, userAddress);

// 2. Initiate cross-chain transfer to hub
const sendParam = OVaultUtils.createSpokeDepositParams(
    MONAD_CHAIN_ID,
    amount,
    hubVaultAddress,
    transactionId,
    userAddress,
    ETHEREUM_CHAIN_ID
);

const fee = await spokeVault.quoteSend(sendParam, false);
await spokeVault.connect(user).send(sendParam, fee, userAddress, { value: fee.nativeFee });
```

**Hub receives and processes:**
```solidity
// Automatic processing via lzCompose()
// - Validates DVN proof
// - Calls composerDeposit() hook
// - Mints shares to user
// - Updates cross-chain balance tracking
// - Emits HubDepositReceived event
```

### 2. AI Recommendation Sync

**From Hub to Multiple Spokes:**
```solidity
const targetChains = [1, 137, 42161]; // Ethereum, Polygon, Arbitrum
await hubVault.sendAISyncToChains(
    userAddress,
    "REBALANCE",
    8500, // 85% confidence
    1500, // 15% expected return
    targetChains,
    emptyOptions,
    { value: totalFee }
);
```

**Spoke receives AI recommendation:**
```solidity
// Automatic processing via lzCompose()
// - Validates DVN proof and confidence level
// - Calls composerAISync() hook
// - Forwards to strategy contract
// - Emits AIRecommendationSpokeSync event
```

### 3. DVN Validation

```solidity
// Quote fees with DVN validation
const [nativeFee, lzTokenFee, dvnValid] = await vault.quoteLayerZeroFees(
    targetChain,
    message,
    options,
    true // validate DVN
);

require(dvnValid, "DVN validation required");
```

## Testing

### Comprehensive Test Suite

**ManixVaultComposerDeploy.test.ts** includes:

1. **Initialization Tests**
   - Hub vault configuration verification
   - Spoke vault configuration verification
   - Supported chain setup validation

2. **DVN Validation Tests**
   - Valid DVN options validation
   - Invalid DVN rejection handling
   - Multi-chain validation support

3. **Hub-and-Spoke Deposit Tests**
   - Cross-chain deposit initiation
   - Hub deposit receipt processing
   - Transaction deduplication

4. **AI Recommendation Sync Tests**
   - Multi-chain AI recommendation propagation
   - Low-confidence rejection
   - Hub-to-spoke synchronization

5. **Fee Quoting Tests**
   - OVault send operation fee calculation
   - Unsupported chain handling

6. **DVN Message Processing Tests**
   - Valid DVN message processing
   - Invalid DVN rejection

7. **Access Control Tests**
   - Composer hook authorization
   - Admin-only functions

8. **OFT Integration Tests**
   - Peer configuration validation
   - Token minting and burning

9. **End-to-End Integration Tests**
   - Complete hub-spoke deposit flow
   - Event emission verification

### Test Deployments

**Mock Contracts:**
- `MockDVNValidator.sol` - Enhanced DVN validation simulation
- `MockLayerZeroEndpoint.sol` - LayerZero endpoint simulation

**Test Configuration:**
- Hub vault on chain 123456789 (Monad simulation)
- Spoke vault on chain 1 (Ethereum simulation)
- Mock DVN validator with configurable validation results

## Security Features

### Access Control
- `CROSS_CHAIN_ROLE` for cross-chain operations
- `AI_ROLE` for AI recommendation synchronization
- `DEFAULT_ADMIN_ROLE` for configuration management
- Composer-only hooks for vault operations

### Security Validations
1. **DVN Validation**: All cross-chain messages validated through DVN
2. **Transaction Deduplication**: Unique transaction IDs prevent replay attacks
3. **Chain Validation**: Only supported chains allowed for operations
4. **Reentrancy Protection**: All external calls protected
5. **Pausable Operations**: Emergency stop functionality
6. **Peer Authorization**: Only whitelisted peers can send messages

### Event Logging
Comprehensive event emission for:
- Cross-chain deposit/withdrawal initiation and completion
- AI recommendation synchronization
- DVN validation results
- Hub-spoke message processing
- Composer configuration changes

## Deployment

### Enhanced Deployment Script

**deploy-layerzero-vault.ts** updated with:
- Hub/spoke vault detection based on chain ID
- Enhanced DVN validator deployment
- OVault Composer initialization
- AssetOFT and ShareOFT deployment
- Multi-chain configuration support
- Automatic peer configuration
- Fee quoting validation
- Config.json generation

### Network Configuration

**Supported Chains:**
- **Monad (123456789)**: Hub vault - EID 10143
- **Ethereum (1)**: Spoke vault - EID 30101
- **Polygon (137)**: Spoke vault - EID 30109
- **Arbitrum (42161)**: Spoke vault - EID 30110
- **BSC (56)**: Spoke vault - EID 30102

### Deployment Commands

```bash
# Deploy hub vault (Monad)
npx hardhat run scripts/deploy-layerzero-vault.ts --network monad

# Deploy spoke vault (Ethereum)
npx hardhat run scripts/deploy-layerzero-vault.ts --network ethereum

# Deploy spoke vault (Polygon)
npx hardhat run scripts/deploy-layerzero-vault.ts --network polygon

# Deploy spoke vault (Arbitrum)
npx hardhat run scripts/deploy-layerzero-vault.ts --network arbitrum

# Deploy spoke vault (BSC)
npx hardhat run scripts/deploy-layerzero-vault.ts --network bsc

# Run comprehensive tests
npx hardhat test test/ManixVaultComposerDeploy.test.ts
```

### LayerZero CLI Integration

```bash
# Validate peer configuration
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts

# Wire peers automatically
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts

# Configure DVN libraries
npx hardhat lz:oapp:config:set --oapp-config layerzero.config.ts
```

## Integration Guidelines

### 1. Frontend Integration
- Monitor hub-spoke events for UI updates
- Display cross-chain balance synchronization
- Show AI recommendation propagation status
- Display DVN validation status

### 2. Backend Integration
- Track cross-chain transactions via events
- Monitor DVN validation status
- Sync AI recommendations across services
- Maintain peer configuration state

### 3. Monitoring
- Cross-chain message success rates
- DVN validation statistics
- AI recommendation propagation metrics
- Fee optimization tracking
- Peer connectivity status

## Best Practices

### 1. Gas Optimization
- Batch cross-chain operations when possible
- Use appropriate DVN options for chain efficiency
- Monitor and adjust fee parameters
- Optimize message sizes

### 2. Security
- Always validate DVN proofs
- Implement proper access controls
- Monitor for suspicious cross-chain activity
- Regular security audits

### 3. User Experience
- Provide clear cross-chain operation status
- Implement proper error handling and retry mechanisms
- Display accurate fee estimates
- Show DVN validation progress

## Future Enhancements

1. **Dynamic DVN Selection**: Choose optimal DVN based on network conditions
2. **Cross-Chain Strategy Migration**: Move strategies between chains
3. **Automated Rebalancing**: AI-driven cross-chain rebalancing
4. **Yield Optimization**: Hub-spoke yield arbitrage opportunities
5. **Multi-DVN Support**: Redundant validation for critical operations
6. **Gasless Cross-Chain**: Meta-transaction support for user operations

## Smart Contract Enhancements

### ManixVault.sol Updates

#### New State Variables
```solidity
IDVNValidator public dvnValidator;
mapping(uint32 => bool) public isSupportedChain;
mapping(uint32 => bytes) public chainDVNOptions;
bool public isHubVault;
uint32 public hubChainId;
mapping(bytes32 => bool) public hubSpokeTransactions;
```

#### Enhanced Initialization
```solidity
function initialize(
    address _asset,
    string memory _name,
    string memory _symbol,
    address _admin,
    address _layerZeroEndpoint,
    address _dvnValidator,
    bool _isHubVault
) external initializer
```

#### New Functions

**1. quoteLayerZeroFees()** - Enhanced fee quoting with DVN validation
```solidity
function quoteLayerZeroFees(
    uint32 _dstEid,
    bytes memory _message,
    bytes memory _options,
    bool _validateDVN
) external view returns (uint256 nativeFee, uint256 lzTokenFee, bool dvnValid)
```

**2. send()** - OVault Composer send function
```solidity
function send(
    SendParam calldata _sendParam,
    MessagingFee calldata _fee,
    address _refundAddress
) external payable returns (MessagingFee memory, bytes memory)
```

**3. lzCompose()** - Receives and processes hub-spoke messages
```solidity
function lzCompose(
    address _from,
    address _to,
    bytes32 _guid,
    bytes calldata _message
) external payable
```

**4. sendAISyncToChains()** - Multi-chain AI recommendation propagation
```solidity
function sendAISyncToChains(
    address _user,
    string memory _action,
    uint256 _confidence,
    uint256 _expectedReturn,
    uint32[] memory _targetChains,
    bytes memory _options
) external payable
```

### OVaultUtils.sol Library

#### Message Types
- `MSG_TYPE_HUB_DEPOSIT = 10` - Hub-initiated deposits
- `MSG_TYPE_HUB_WITHDRAW = 11` - Hub-initiated withdrawals
- `MSG_TYPE_SPOKE_DEPOSIT = 12` - Spoke-initiated deposits
- `MSG_TYPE_SPOKE_WITHDRAW = 13` - Spoke-initiated withdrawals
- `MSG_TYPE_AI_SYNC_HUB = 14` - AI sync from hub to spokes
- `MSG_TYPE_AI_SYNC_SPOKE = 15` - AI sync from spoke to hub
- `MSG_TYPE_YIELD_SYNC = 16` - Yield performance synchronization

#### Key Functions
```solidity
function createHubDepositParams(...)
function createSpokeDepositParams(...)
function createAISyncParams(...)
function decodeHubSpokeMessage(...)
function isHubChain(uint32 _chainId)
function isSpokeChain(uint32 _chainId)
function createDVNOptions(...)
function validateDVNProof(...)
```

## Usage Examples

### 1. Hub-and-Spoke Deposit Flow

**From Spoke (Ethereum) to Hub (Monad):**

```solidity
// 1. User deposits on Ethereum spoke vault
await spokeVault.connect(user).deposit(amount, userAddress);

// 2. Initiate cross-chain transfer to hub
const sendParam = OVaultUtils.createSpokeDepositParams(
    MONAD_CHAIN_ID,
    amount,
    hubVaultAddress,
    transactionId,
    userAddress,
    ETHEREUM_CHAIN_ID
);

const fee = await spokeVault.quoteSend(sendParam, false);
await spokeVault.connect(user).send(sendParam, fee, userAddress, { value: fee.nativeFee });
```

**Hub receives and processes:**
```solidity
// Automatic processing via lzCompose()
// - Validates DVN proof
// - Mints shares to user
// - Updates cross-chain balance tracking
// - Emits HubDepositReceived event
```

### 2. AI Recommendation Sync

**From Hub to Multiple Spokes:**
```solidity
const targetChains = [1, 137, 42161]; // Ethereum, Polygon, Arbitrum
await hubVault.sendAISyncToChains(
    userAddress,
    "REBALANCE",
    8500, // 85% confidence
    1500, // 15% expected return
    targetChains,
    emptyOptions,
    { value: totalFee }
);
```

**Spoke receives AI recommendation:**
```solidity
// Automatic processing via lzCompose()
// - Validates DVN proof and confidence level
// - Forwards to strategy contract
// - Emits AIRecommendationSpokeSync event
```

### 3. DVN Validation

```solidity
// Quote fees with DVN validation
const [nativeFee, lzTokenFee, dvnValid] = await vault.quoteLayerZeroFees(
    targetChain,
    message,
    options,
    true // validate DVN
);

require(dvnValid, "DVN validation required");
```

## Testing

### Comprehensive Test Suite

**ManixVaultOVaultComposer.test.ts** includes:

1. **Initialization Tests**
   - Hub vault configuration verification
   - Spoke vault configuration verification
   - Supported chain setup validation

2. **DVN Validation Tests**
   - Valid DVN options validation
   - Invalid DVN rejection handling

3. **Hub-and-Spoke Deposit Tests**
   - Cross-chain deposit initiation
   - Hub deposit receipt processing
   - Transaction deduplication

4. **AI Recommendation Sync Tests**
   - Multi-chain AI recommendation propagation
   - Low-confidence rejection
   - Hub-to-spoke synchronization

5. **Fee Quoting Tests**
   - OVault send operation fee calculation
   - Unsupported chain handling

6. **DVN Message Processing Tests**
   - Valid DVN message processing
   - Invalid DVN rejection

### Test Deployments

**Mock Contracts:**
- `MockDVNValidator.sol` - DVN validation simulation
- `MockLayerZeroEndpoint.sol` - LayerZero endpoint simulation

**Test Configuration:**
- Hub vault on chain 123456789 (Monad simulation)
- Spoke vault on chain 1 (Ethereum simulation)
- Mock DVN validator with configurable validation results

## Security Features

### Access Control
- `CROSS_CHAIN_ROLE` for cross-chain operations
- `AI_ROLE` for AI recommendation synchronization
- `DEFAULT_ADMIN_ROLE` for configuration management

### Security Validations
1. **DVN Validation**: All cross-chain messages validated through DVN
2. **Transaction Deduplication**: Unique transaction IDs prevent replay attacks
3. **Chain Validation**: Only supported chains allowed for operations
4. **Reentrancy Protection**: All external calls protected
5. **Pausable Operations**: Emergency stop functionality

### Event Logging
Comprehensive event emission for:
- Cross-chain deposit/withdrawal initiation and completion
- AI recommendation synchronization
- DVN validation results
- Hub-spoke message processing

## Deployment

### Enhanced Deployment Script

**deploy-layerzero-vault.ts** updated with:
- Hub/spoke vault detection based on chain ID
- DVN validator deployment
- OVault Composer initialization
- Multi-chain configuration support

### Network Configuration

**Supported Chains:**
- **Monad (123456789)**: Hub vault
- **Ethereum (1)**: Spoke vault
- **Polygon (137)**: Spoke vault  
- **Arbitrum (42161)**: Spoke vault
- **BSC (56)**: Spoke vault

### Deployment Commands

```bash
# Deploy hub vault (Monad)
npx hardhat run scripts/deploy-layerzero-vault.ts --network monad

# Deploy spoke vault (Ethereum)
npx hardhat run scripts/deploy-layerzero-vault.ts --network ethereum

# Run comprehensive tests
npx hardhat test test/ManixVaultOVaultComposer.test.ts
```

## Integration Guidelines

### 1. Frontend Integration
- Monitor hub-spoke events for UI updates
- Display cross-chain balance synchronization
- Show AI recommendation propagation status

### 2. Backend Integration
- Track cross-chain transactions via events
- Monitor DVN validation status
- Sync AI recommendations across services

### 3. Monitoring
- Cross-chain message success rates
- DVN validation statistics
- AI recommendation propagation metrics
- Fee optimization tracking

## Best Practices

### 1. Gas Optimization
- Batch cross-chain operations when possible
- Use appropriate DVN options for chain efficiency
- Monitor and adjust fee parameters

### 2. Security
- Always validate DVN proofs
- Implement proper access controls
- Monitor for suspicious cross-chain activity

### 3. User Experience
- Provide clear cross-chain operation status
- Implement proper error handling and retry mechanisms
- Display accurate fee estimates

## Future Enhancements

1. **Dynamic DVN Selection**: Choose optimal DVN based on network conditions
2. **Cross-Chain Strategy Migration**: Move strategies between chains
3. **Automated Rebalancing**: AI-driven cross-chain rebalancing
4. **Yield Optimization**: Hub-spoke yield arbitrage opportunities
