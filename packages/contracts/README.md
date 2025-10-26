# MANI X AI Smart Contracts

This directory contains the smart contracts for the MANI X AI DeFi platform, implementing upgradeable vault and strategy contracts with comprehensive event logging and AI integration capabilities.

## Architecture Overview

The smart contract system follows a modular architecture with clear separation of concerns:

### Core Contracts

1. **ManixVault.sol** - The main vault contract implementing ERC4626 standard
2. **ManixStrategyBase.sol** - Abstract base contract for all strategies
3. **YieldFarmingStrategy.sol** - Example implementation of yield farming strategy

### Key Features

- **Upgradeable Contracts**: All major contracts use OpenZeppelin's upgradeable patterns
- **ERC4626 Compliance**: Full compatibility with the ERC4626 vault standard
- **AI Integration**: Built-in hooks for AI-driven strategy recommendations
- **Risk Management**: Comprehensive risk parameters and emergency controls
- **Multi-Role Access Control**: Granular permissions for different user types
- **Event Logging**: Comprehensive event emission for monitoring and analysis

## Contract Interfaces

### IVault Interface
Standard vault interface with deposit/withdraw functionality and strategy management.

### IManixVault Interface
Extended interface adding MANI X AI specific features:
- Performance and management fee management
- Emergency pause/unpause functionality
- Harvest operations with event logging

### IStrategy Interface
Base strategy interface for yield generation and asset management.

### IManixStrategy Interface
Enhanced strategy interface with AI integration:
- Risk parameter management
- AI recommendation processing
- Auto-compound functionality
- Rebalance threshold controls

## Directory Structure

```
contracts/
├── core/                    # Main vault and strategy contracts
│   ├── ManixVault.sol      # Upgradeable ERC4626 vault
│   └── ManixStrategyBase.sol # Base strategy implementation
├── strategies/              # Strategy implementations
│   └── YieldFarmingStrategy.sol # Example yield farming strategy
├── interfaces/              # Contract interfaces
│   ├── IVault.sol          # Basic vault interface
│   ├── IManixVault.sol     # Extended vault interface
│   ├── IStrategy.sol       # Basic strategy interface
│   ├── IManixStrategy.sol  # Extended strategy interface
│   └── IERC4626.sol        # ERC4626 standard interface
├── libraries/               # Utility libraries
│   └── ManixMath.sol       # Mathematical calculations
├── mocks/                   # Testing contracts
│   ├── MockERC20.sol       # Mock ERC20 for testing
│   └── MockStrategy.sol    # Mock strategy for testing
scripts/                     # Deployment scripts
├── deploy-vault.ts         # Vault deployment script
test/                        # Comprehensive test suite
└── ManixVault.test.ts      # Main vault tests
```

## Security Features

### Access Control
- **Admin Role**: Full contract control, fee management, emergency functions
- **Harvester Role**: Can execute harvest operations for strategy optimization
- **AI Role**: Can process AI recommendations and trigger automated actions
- **Vault Role**: Strategy contracts can interact with vault for deposits/withdrawals

### Risk Management
- **Maximum Fees**: Hard-coded limits prevent excessive fee extraction
- **Emergency Pause**: Circuit breaker functionality for emergency situations
- **Reentrancy Protection**: All external calls protected against reentrancy attacks
- **Input Validation**: Comprehensive parameter validation throughout

### Upgrade Safety
- **Transparent Proxies**: Using OpenZeppelin transparent proxy pattern
- **Admin Controls**: Only authorized admins can perform upgrades
- **Storage Safety**: Careful storage slot management to prevent conflicts

## Event Logging

Comprehensive event emission for monitoring and analytics:

### Vault Events
- `Deposit`: User deposits with assets and shares
- `Withdraw`: User withdrawals with assets and shares
- `StrategyUpdated`: Strategy contract changes
- `PerformanceFeeUpdated`: Fee structure changes
- `ManagementFeeUpdated`: Management fee changes
- `HarvestExecuted`: Harvest operations with profit tracking
- `EmergencyPause/Unpause`: Emergency state changes

### Strategy Events
- `RiskParametersUpdated`: Risk management updates
- `AIRecommendationUpdated`: AI decision logging
- `RebalanceThresholdUpdated`: Rebalancing configuration changes
- `AutoCompoundToggled`: Auto-compound feature changes

## Deployment

### Prerequisites
1. Install dependencies: `yarn install`
2. Set up environment variables (see `.env.example`)
3. Configure network settings in `hardhat.config.ts`

### Deployment Process

1. **Compile Contracts**:
   ```bash
   cd packages/contracts
   yarn compile
   ```

2. **Run Tests**:
   ```bash
   yarn test
   ```

3. **Deploy to Network**:
   ```bash
   yarn deploy --network <network_name>
   ```

### Deployment Script
The `deploy-vault.ts` script handles:
- Vault implementation deployment
- Proxy admin deployment
- Transparent proxy setup
- Initial configuration and fee setup
- Verification preparation

## Testing

Comprehensive test suite covering:
- Contract deployment and initialization
- Deposit/withdraw functionality
- Fee management and updates
- Strategy integration
- Emergency functions
- Access control enforcement
- ERC4626 compliance

Run tests with:
```bash
yarn test
```

## Integration Guidelines

### LayerZero Integration
For cross-chain functionality, integrate LayerZero's messaging:
1. Implement `ILayerZeroReceiver` in vault contracts
2. Add cross-chain deposit/withdraw functions
3. Implement message verification and security checks

### Chainlink Integration
For price feeds and oracles:
1. Import Chainlink price feed contracts
2. Implement price conversion utilities
3. Add periodic price updates for strategy decisions

### AI Integration
For AI-driven strategy management:
1. Implement recommendation processing in strategy contracts
2. Add confidence threshold validation
3. Create event logging for AI decisions and outcomes

## Best Practices

### Performance
- Use `view` functions for state queries to reduce gas costs
- Implement batch operations where possible
- Optimize storage access patterns

### Maintainability
- Clear function and variable naming
- Comprehensive inline documentation
- Modular contract design for easy updates

### Testing
- 100% test coverage for critical functions
- Integration tests with mock contracts
- Gas optimization testing for deployment costs

## Monitoring and Analytics

The comprehensive event logging enables:
- Real-time vault performance tracking
- User deposit/withdrawal analytics
- Strategy performance monitoring
- AI decision effectiveness analysis
- Risk parameter optimization

Events can be indexed through services like The Graph or custom analytics tools to provide real-time insights into platform performance and user behavior.


