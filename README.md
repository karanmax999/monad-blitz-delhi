# MANI X AI - AI-Powered Multi-Chain DeFi Platform

A comprehensive DeFi automation platform that leverages AI to provide intelligent vault management, cross-chain strategies, and educational features across multiple blockchain networks including Monad.

## 🏗️ Architecture

This monorepo is structured for scalability and modularity:

### Packages (`/packages`)
- **ui**: Shared React components and design system
- **types**: TypeScript type definitions shared across the platform
- **utils**: Common utility functions and helpers
- **config**: Configuration management and environment settings
- **contracts**: Smart contracts for vaults, strategies, and governance
- **adapters**: Multi-chain blockchain adapters and integrations

### Services (`/services`)
- **vault-manager**: Core vault management and automation logic
- **strategy-engine**: AI-powered strategy recommendations and execution
- **ai-integration**: Integration with AI services (Gemini/MCP)
- **analytics**: Risk management, analytics, and reporting

### Apps (`/apps`)
- **web**: Next.js frontend application
- **api**: Backend API services

## 🚀 Quick Start

```bash
# Install dependencies
yarn install

# Start development environment
yarn dev

# Build all packages
yarn build

# Run tests
yarn test

# Lint codebase
yarn lint
```

## 🔗 Supported Chains

- **Monad**: Parallel execution with high TPS and low fees
- **Ethereum**: Mainnet DeFi protocols
- **Polygon**: High-performance L2 scaling
- **Arbitrum**: Optimistic rollup solutions
- **BSC**: Binance Smart Chain integration

## 🤖 AI Features

- Intelligent vault recommendations
- Risk assessment and management
- Automated strategy optimization
- Educational content and gamification

## 🛡️ Security

- Comprehensive smart contract audits
- Multi-signature governance
- Rate limiting and input validation
- Real-time monitoring and alerting

## 📚 Documentation

Detailed documentation for each package and service can be found in their respective directories.
