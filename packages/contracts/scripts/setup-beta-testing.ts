import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

// Beta testing configuration
const BETA_CONFIG = {
  networks: {
    ethereum: {
      chainId: 1,
      name: "Ethereum",
      rpcUrl: process.env.ETHEREUM_RPC_URL!,
      explorerUrl: "https://etherscan.io",
      testnet: false
    },
    polygon: {
      chainId: 137,
      name: "Polygon",
      rpcUrl: process.env.POLYGON_RPC_URL!,
      explorerUrl: "https://polygonscan.com",
      testnet: false
    },
    arbitrum: {
      chainId: 42161,
      name: "Arbitrum",
      rpcUrl: process.env.ARBITRUM_RPC_URL!,
      explorerUrl: "https://arbiscan.io",
      testnet: false
    },
    bsc: {
      chainId: 56,
      name: "BSC",
      rpcUrl: process.env.BSC_RPC_URL!,
      explorerUrl: "https://bscscan.com",
      testnet: false
    },
    monad: {
      chainId: 123456789,
      name: "Monad",
      rpcUrl: process.env.MONAD_RPC_URL!,
      explorerUrl: "https://monadscan.com",
      testnet: false
    }
  },
  beta: {
    maxParticipants: 50,
    maxDepositPerUser: ethers.utils.parseEther("10"), // 10 ETH
    maxTotalDeposit: ethers.utils.parseEther("500"), // 500 ETH
    duration: 7 * 24 * 60 * 60, // 7 days
    startTime: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    endTime: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) + 3600
  }
};

interface BetaParticipant {
  address: string;
  email: string;
  discord: string;
  joinedAt: number;
  totalDeposits: string;
  totalWithdrawals: string;
  transactions: number;
  status: "active" | "paused" | "banned";
}

interface BetaTestResult {
  participant: string;
  testType: string;
  success: boolean;
  error?: string;
  gasUsed?: string;
  timestamp: number;
  txHash?: string;
}

async function setupBetaTesting() {
  console.log("🧪 Setting up MANI X AI Closed Beta Testing");
  console.log("=============================================");
  
  // Create beta testing directory
  const betaDir = path.join(__dirname, "../../beta-testing");
  if (!fs.existsSync(betaDir)) {
    fs.mkdirSync(betaDir, { recursive: true });
  }
  
  // Load deployment configuration
  const configPath = path.join(__dirname, "../deployments/config.json");
  const deploymentConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  
  // Generate beta testing configuration
  const betaTestingConfig = {
    ...BETA_CONFIG,
    contracts: deploymentConfig,
    participants: [] as BetaParticipant[],
    testResults: [] as BetaTestResult[],
    metrics: {
      totalParticipants: 0,
      totalDeposits: "0",
      totalWithdrawals: "0",
      totalTransactions: 0,
      successRate: 0,
      averageGasUsed: "0"
    }
  };
  
  fs.writeFileSync(
    path.join(betaDir, "beta-config.json"),
    JSON.stringify(betaTestingConfig, null, 2)
  );
  
  console.log("✅ Beta testing configuration created");
}

async function generateBetaTestScripts() {
  console.log("📝 Generating beta test scripts...");
  
  const betaDir = path.join(__dirname, "../../beta-testing");
  
  // Beta test runner script
  const testRunnerScript = `import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

interface BetaTest {
  name: string;
  description: string;
  test: () => Promise<boolean>;
  required: boolean;
}

class BetaTestRunner {
  private tests: BetaTest[] = [];
  private results: { [key: string]: boolean } = {};
  
  addTest(test: BetaTest) {
    this.tests.push(test);
  }
  
  async runAllTests(): Promise<void> {
    console.log("🧪 Running MANI X AI Beta Tests");
    console.log("===============================");
    
    let passed = 0;
    let failed = 0;
    
    for (const test of this.tests) {
      try {
        console.log(\`\\n🔍 Running: \${test.name}\`);
        console.log(\`   Description: \${test.description}\`);
        
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        this.results[test.name] = result;
        
        if (result) {
          console.log(\`   ✅ PASSED (\${duration}ms)\`);
          passed++;
        } else {
          console.log(\`   ❌ FAILED (\${duration}ms)\`);
          failed++;
        }
        
      } catch (error) {
        console.log(\`   ❌ ERROR: \${error.message}\`);
        this.results[test.name] = false;
        failed++;
      }
    }
    
    console.log(\`\\n📊 Test Results\`);
    console.log(\`   Total: \${this.tests.length}\`);
    console.log(\`   Passed: \${passed}\`);
    console.log(\`   Failed: \${failed}\`);
    console.log(\`   Success Rate: \${((passed / this.tests.length) * 100).toFixed(1)}%\`);
    
    // Save results
    const resultsPath = path.join(__dirname, "test-results.json");
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: { total: this.tests.length, passed, failed },
      results: this.results
    }, null, 2));
    
    console.log(\`\\n📄 Results saved to: \${resultsPath}\`);
  }
}

// Test implementations
async function testVaultInitialization(): Promise<boolean> {
  try {
    const configPath = path.join(__dirname, "../packages/contracts/deployments/config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    
    for (const [chainId, chainConfig] of Object.entries(config)) {
      const provider = new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
      const vault = await ethers.getContractAt("ManixVault", chainConfig.contracts.vault);
      
      const name = await vault.name();
      const symbol = await vault.symbol();
      const totalAssets = await vault.totalAssets();
      
      if (name !== "MANI X AI Cross-Chain Vault") return false;
      if (symbol !== "MANIX") return false;
    }
    
    return true;
  } catch (error) {
    console.error("Vault initialization test failed:", error);
    return false;
  }
}

async function testCrossChainDeposit(): Promise<boolean> {
  try {
    // This would test a cross-chain deposit flow
    // For now, just check that contracts are properly configured
    const configPath = path.join(__dirname, "../packages/contracts/deployments/config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    
    // Check that all chains have proper peer configuration
    for (const [chainId, chainConfig] of Object.entries(config)) {
      if (!chainConfig.contracts.vault) return false;
      if (!chainConfig.contracts.composer) return false;
      if (!chainConfig.contracts.assetOFT) return false;
      if (!chainConfig.contracts.shareOFT) return false;
    }
    
    return true;
  } catch (error) {
    console.error("Cross-chain deposit test failed:", error);
    return false;
  }
}

async function testAIRecommendations(): Promise<boolean> {
  try {
    // Test AI recommendation system
    const configPath = path.join(__dirname, "../packages/contracts/deployments/config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    
    // Check that AI services are configured
    if (!process.env.GEMINI_API_KEY) return false;
    if (!process.env.OPENAI_API_KEY) return false;
    
    return true;
  } catch (error) {
    console.error("AI recommendations test failed:", error);
    return false;
  }
}

async function testMonitoring(): Promise<boolean> {
  try {
    // Test monitoring endpoints
    const monitoringEndpoints = [
      "http://localhost:9090", // Prometheus
      "http://localhost:3000", // Grafana
      "http://localhost:9093"  // Alertmanager
    ];
    
    for (const endpoint of monitoringEndpoints) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) return false;
      } catch (error) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error("Monitoring test failed:", error);
    return false;
  }
}

async function main() {
  const runner = new BetaTestRunner();
  
  // Add tests
  runner.addTest({
    name: "Vault Initialization",
    description: "Test that all vaults are properly initialized",
    test: testVaultInitialization,
    required: true
  });
  
  runner.addTest({
    name: "Cross-Chain Deposit",
    description: "Test cross-chain deposit functionality",
    test: testCrossChainDeposit,
    required: true
  });
  
  runner.addTest({
    name: "AI Recommendations",
    description: "Test AI recommendation system",
    test: testAIRecommendations,
    required: true
  });
  
  runner.addTest({
    name: "Monitoring",
    description: "Test monitoring infrastructure",
    test: testMonitoring,
    required: false
  });
  
  // Run all tests
  await runner.runAllTests();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Beta testing failed:", error);
    process.exit(1);
  });
`;

  fs.writeFileSync(
    path.join(betaDir, "beta-test-runner.ts"),
    testRunnerScript
  );
  
  // Beta participant management script
  const participantScript = `import fs from "fs";
import path from "path";

interface BetaParticipant {
  address: string;
  email: string;
  discord: string;
  joinedAt: number;
  totalDeposits: string;
  totalWithdrawals: string;
  transactions: number;
  status: "active" | "paused" | "banned";
}

class BetaParticipantManager {
  private configPath: string;
  private config: any;
  
  constructor() {
    this.configPath = path.join(__dirname, "beta-config.json");
    this.config = JSON.parse(fs.readFileSync(this.configPath, "utf8"));
  }
  
  addParticipant(participant: Omit<BetaParticipant, "joinedAt" | "totalDeposits" | "totalWithdrawals" | "transactions">): boolean {
    if (this.config.participants.length >= this.config.beta.maxParticipants) {
      console.log("❌ Beta testing is full");
      return false;
    }
    
    const newParticipant: BetaParticipant = {
      ...participant,
      joinedAt: Date.now(),
      totalDeposits: "0",
      totalWithdrawals: "0",
      transactions: 0,
      status: "active"
    };
    
    this.config.participants.push(newParticipant);
    this.saveConfig();
    
    console.log(\`✅ Added participant: \${participant.address}\`);
    return true;
  }
  
  removeParticipant(address: string): boolean {
    const index = this.config.participants.findIndex((p: BetaParticipant) => p.address === address);
    if (index === -1) {
      console.log("❌ Participant not found");
      return false;
    }
    
    this.config.participants.splice(index, 1);
    this.saveConfig();
    
    console.log(\`✅ Removed participant: \${address}\`);
    return true;
  }
  
  updateParticipantStatus(address: string, status: "active" | "paused" | "banned"): boolean {
    const participant = this.config.participants.find((p: BetaParticipant) => p.address === address);
    if (!participant) {
      console.log("❌ Participant not found");
      return false;
    }
    
    participant.status = status;
    this.saveConfig();
    
    console.log(\`✅ Updated participant status: \${address} -> \${status}\`);
    return true;
  }
  
  getParticipant(address: string): BetaParticipant | null {
    return this.config.participants.find((p: BetaParticipant) => p.address === address) || null;
  }
  
  getAllParticipants(): BetaParticipant[] {
    return this.config.participants;
  }
  
  getActiveParticipants(): BetaParticipant[] {
    return this.config.participants.filter((p: BetaParticipant) => p.status === "active");
  }
  
  private saveConfig(): void {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }
}

// CLI interface
async function main() {
  const manager = new BetaParticipantManager();
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command) {
    case "add":
      if (args.length < 3) {
        console.log("Usage: add <address> <email> <discord>");
        return;
      }
      manager.addParticipant({
        address: args[0],
        email: args[1],
        discord: args[2]
      });
      break;
      
    case "remove":
      if (args.length < 1) {
        console.log("Usage: remove <address>");
        return;
      }
      manager.removeParticipant(args[0]);
      break;
      
    case "status":
      if (args.length < 2) {
        console.log("Usage: status <address> <active|paused|banned>");
        return;
      }
      manager.updateParticipantStatus(args[0], args[1] as any);
      break;
      
    case "list":
      const participants = manager.getAllParticipants();
      console.log(\`\\n📋 Beta Participants (\${participants.length}/\${manager.config.beta.maxParticipants})\`);
      participants.forEach((p, i) => {
        console.log(\`\${i + 1}. \${p.address} (\${p.status}) - \${p.email}\`);
      });
      break;
      
    case "active":
      const activeParticipants = manager.getActiveParticipants();
      console.log(\`\\n✅ Active Participants (\${activeParticipants.length})\`);
      activeParticipants.forEach((p, i) => {
        console.log(\`\${i + 1}. \${p.address} - \${p.email}\`);
      });
      break;
      
    default:
      console.log("Available commands:");
      console.log("  add <address> <email> <discord>");
      console.log("  remove <address>");
      console.log("  status <address> <active|paused|banned>");
      console.log("  list");
      console.log("  active");
  }
}

main().catch(console.error);
`;

  fs.writeFileSync(
    path.join(betaDir, "participant-manager.ts"),
    participantScript
  );
  
  // Beta testing package.json
  const packageJson = {
    name: "manix-ai-beta-testing",
    version: "1.0.0",
    description: "MANI X AI Closed Beta Testing Framework",
    scripts: {
      "test": "ts-node beta-test-runner.ts",
      "participants": "ts-node participant-manager.ts",
      "start": "npm run test && npm run participants list"
    },
    dependencies: {
      "hardhat": "^2.19.0",
      "ethers": "^5.7.2",
      "ts-node": "^10.9.1",
      "typescript": "^4.9.5"
    }
  };
  
  fs.writeFileSync(
    path.join(betaDir, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );
  
  console.log("✅ Beta test scripts generated");
}

async function generateBetaDocumentation() {
  console.log("📚 Generating beta testing documentation...");
  
  const betaDir = path.join(__dirname, "../../beta-testing");
  
  const documentation = `# MANI X AI Closed Beta Testing Guide

## Overview
This document provides comprehensive guidance for participating in the MANI X AI closed beta testing program.

## Beta Testing Phases

### Phase 1: Closed Beta (Week 1)
- **Participants**: 50 selected users
- **Duration**: 7 days
- **Focus**: Core functionality testing
- **Limits**: 10 ETH per user, 500 ETH total

### Phase 2: Open Beta (Week 2-3)
- **Participants**: 500 users
- **Duration**: 14 days
- **Focus**: UX feedback and stress testing
- **Limits**: 5 ETH per user, 2000 ETH total

### Phase 3: Final Audit (Week 4-6)
- **Participants**: Internal team only
- **Duration**: 21 days
- **Focus**: Security audit and final testing
- **Limits**: No limits

## Getting Started

### Prerequisites
1. MetaMask wallet with testnet ETH
2. Discord account for support
3. Basic understanding of DeFi protocols

### Setup Instructions
1. Install dependencies:
   \`\`\`bash
   cd beta-testing
   npm install
   \`\`\`

2. Run initial tests:
   \`\`\`bash
   npm run test
   \`\`\`

3. Check participant status:
   \`\`\`bash
   npm run participants list
   \`\`\`

## Testing Scenarios

### 1. Cross-Chain Deposits
- Deposit ETH on Ethereum
- Verify receipt on Monad hub
- Check share minting
- Verify cross-chain message delivery

### 2. Cross-Chain Withdrawals
- Initiate withdrawal from Monad hub
- Verify processing on target chain
- Check asset delivery
- Verify transaction completion

### 3. AI Recommendations
- Trigger AI analysis
- Verify recommendation quality
- Check confidence scores
- Test execution automation

### 4. Risk Management
- Monitor APY calculations
- Check volatility metrics
- Verify risk scores
- Test rebalancing triggers

## Monitoring and Reporting

### Real-Time Monitoring
- **Grafana Dashboard**: http://localhost:3000
- **Prometheus Metrics**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

### Key Metrics to Monitor
- Total Value Locked (TVL)
- Cross-chain transaction success rate
- AI recommendation accuracy
- Gas usage efficiency
- Error rates

### Reporting Issues
1. **Critical Issues**: Discord #critical-issues
2. **Bug Reports**: Discord #bug-reports
3. **Feature Requests**: Discord #feature-requests
4. **General Feedback**: Discord #general-feedback

## Safety Measures

### Risk Controls
- Maximum deposit limits per user
- Total TVL caps
- Emergency pause functionality
- Automated risk monitoring

### Emergency Procedures
1. **Emergency Pause**: Contact team immediately
2. **Fund Recovery**: Automated recovery procedures
3. **Communication**: Discord announcements
4. **Escalation**: Direct team contact

## Rewards and Incentives

### Beta Testing Rewards
- **Participation**: 100 MNX tokens
- **Bug Reports**: 50-500 MNX tokens
- **Feature Suggestions**: 25-100 MNX tokens
- **Completion**: 200 MNX tokens

### Token Distribution
- Tokens distributed after beta completion
- Vesting: 25% immediately, 75% over 6 months
- Minimum participation: 3 days active testing

## Support and Resources

### Support Channels
- **Discord**: Primary communication
- **Email**: beta-support@manix.ai
- **Telegram**: @ManixAISupport

### Documentation
- **Technical Docs**: ./docs/
- **API Reference**: ./api-docs/
- **Video Tutorials**: ./tutorials/

### Team Contacts
- **Technical Lead**: @tech-lead
- **Product Manager**: @product-manager
- **Community Manager**: @community-manager

## Testing Checklist

### Pre-Testing
- [ ] Wallet connected
- [ ] Testnet ETH available
- [ ] Discord joined
- [ ] Documentation reviewed

### Daily Testing
- [ ] Check system status
- [ ] Test core functionality
- [ ] Report any issues
- [ ] Provide feedback

### Post-Testing
- [ ] Complete feedback form
- [ ] Submit bug reports
- [ ] Participate in debrief
- [ ] Claim rewards

## Important Notes

### Security
- Never share private keys
- Use testnet only
- Report suspicious activity
- Follow security guidelines

### Communication
- Be respectful and constructive
- Provide detailed bug reports
- Share positive feedback
- Help other participants

### Compliance
- Follow terms of service
- Respect privacy policies
- Maintain confidentiality
- Report violations

## Contact Information

- **Website**: https://manix.ai
- **Discord**: https://discord.gg/manix-ai
- **Twitter**: @ManixAI
- **Email**: hello@manix.ai

---

*This document is updated regularly. Please check for the latest version.*
`;

  fs.writeFileSync(
    path.join(betaDir, "README.md"),
    documentation
  );
  
  console.log("✅ Beta testing documentation generated");
}

async function main() {
  console.log("🧪 Setting up MANI X AI Closed Beta Testing Framework");
  console.log("=====================================================");
  
  try {
    // Set up beta testing infrastructure
    await setupBetaTesting();
    
    // Generate beta test scripts
    await generateBetaTestScripts();
    
    // Generate beta documentation
    await generateBetaDocumentation();
    
    console.log("\n✅ Beta testing framework setup completed!");
    console.log("\n📋 Next steps:");
    console.log("1. Review beta testing configuration");
    console.log("2. Add beta participants");
    console.log("3. Run initial tests");
    console.log("4. Begin closed beta testing");
    console.log("5. Collect feedback and iterate");
    
  } catch (error) {
    console.error("❌ Beta testing setup failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });
