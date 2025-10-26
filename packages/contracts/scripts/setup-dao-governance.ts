import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

// MNX DAO configuration
const DAO_CONFIG = {
  token: {
    name: "MANI X AI Token",
    symbol: "MNX",
    totalSupply: ethers.utils.parseEther("1000000000"), // 1B tokens
    decimals: 18,
    distribution: {
      team: 0.15,        // 15% - 150M tokens
      investors: 0.20,    // 20% - 200M tokens
      community: 0.30,    // 30% - 300M tokens
      treasury: 0.25,     // 25% - 250M tokens
      liquidity: 0.10     // 10% - 100M tokens
    }
  },
  governance: {
    votingDelay: 1,           // 1 block delay
    votingPeriod: 17280,      // 3 days (assuming 15s block time)
    proposalThreshold: ethers.utils.parseEther("1000000"), // 1M MNX
    quorumVotes: ethers.utils.parseEther("10000000"),       // 10M MNX
    timelockDelay: 2 * 24 * 60 * 60, // 2 days
    emergencyDelay: 24 * 60 * 60     // 1 day
  },
  vesting: {
    team: {
      cliff: 365 * 24 * 60 * 60,    // 1 year cliff
      duration: 4 * 365 * 24 * 60 * 60, // 4 years total
      revocable: false
    },
    investors: {
      cliff: 180 * 24 * 60 * 60,    // 6 months cliff
      duration: 2 * 365 * 24 * 60 * 60, // 2 years total
      revocable: false
    },
    community: {
      cliff: 0,                     // No cliff
      duration: 365 * 24 * 60 * 60, // 1 year total
      revocable: false
    }
  }
};

// Governance contract interfaces
const GOVERNANCE_ABI = [
  "function propose(address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description) returns (uint256)",
  "function castVote(uint256 proposalId, uint8 support) external",
  "function execute(uint256 proposalId) external",
  "function cancel(uint256 proposalId) external",
  "function getVotes(address account, uint256 blockNumber) external view returns (uint256)",
  "function proposalThreshold() external view returns (uint256)",
  "function quorumVotes() external view returns (uint256)",
  "function votingDelay() external view returns (uint256)",
  "function votingPeriod() external view returns (uint256)"
];

const TIMELOCK_ABI = [
  "function schedule(address target, uint256 value, bytes calldata data, bytes32 salt, uint256 delay) external",
  "function execute(address target, uint256 value, bytes calldata data, bytes32 salt, uint256 delay) external",
  "function cancel(bytes32 salt) external",
  "function getMinDelay() external view returns (uint256)"
];

const VESTING_ABI = [
  "function createVestingSchedule(address beneficiary, uint256 start, uint256 cliff, uint256 duration, bool revocable) external",
  "function release(address token) external",
  "function revoke(address token, address beneficiary) external",
  "function getVestingSchedule(address token, address beneficiary) external view returns (tuple)",
  "function getVestingSchedulesCount() external view returns (uint256)"
];

async function deployMNXToken() {
  console.log("🪙 Deploying MNX Token...");
  
  // Deploy MNX token
  const MNXToken = await ethers.getContractFactory("MNXToken");
  const mnxToken = await MNXToken.deploy(
    DAO_CONFIG.token.name,
    DAO_CONFIG.token.symbol,
    DAO_CONFIG.token.totalSupply
  );
  await mnxToken.deployed();
  
  console.log(`✅ MNX Token deployed: ${mnxToken.address}`);
  return mnxToken.address;
}

async function deployGovernanceContracts(mnxTokenAddress: string) {
  console.log("🏛️ Deploying Governance Contracts...");
  
  // Deploy Timelock
  const TimelockController = await ethers.getContractFactory("TimelockController");
  const timelock = await TimelockController.deploy(
    DAO_CONFIG.governance.timelockDelay,
    [], // proposers (empty initially)
    [], // executors (empty initially)
    ethers.constants.AddressZero // admin (will be set to governance)
  );
  await timelock.deployed();
  
  console.log(`✅ Timelock deployed: ${timelock.address}`);
  
  // Deploy Governance
  const Governance = await ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(
    mnxTokenAddress,
    timelock.address,
    DAO_CONFIG.governance.votingDelay,
    DAO_CONFIG.governance.votingPeriod,
    DAO_CONFIG.governance.proposalThreshold,
    DAO_CONFIG.governance.quorumVotes
  );
  await governance.deployed();
  
  console.log(`✅ Governance deployed: ${governance.address}`);
  
  // Deploy Vesting
  const VestingWallet = await ethers.getContractFactory("VestingWallet");
  const vesting = await VestingWallet.deploy();
  await vesting.deployed();
  
  console.log(`✅ Vesting deployed: ${vesting.address}`);
  
  return {
    timelock: timelock.address,
    governance: governance.address,
    vesting: vesting.address
  };
}

async function setupTokenDistribution(mnxTokenAddress: string, contracts: any) {
  console.log("📊 Setting up Token Distribution...");
  
  const [deployer] = await ethers.getSigners();
  const mnxToken = await ethers.getContractAt("MNXToken", mnxTokenAddress);
  
  // Calculate distribution amounts
  const totalSupply = DAO_CONFIG.token.totalSupply;
  const teamAmount = totalSupply.mul(DAO_CONFIG.token.distribution.team).div(100);
  const investorsAmount = totalSupply.mul(DAO_CONFIG.token.distribution.investors).div(100);
  const communityAmount = totalSupply.mul(DAO_CONFIG.token.distribution.community).div(100);
  const treasuryAmount = totalSupply.mul(DAO_CONFIG.token.distribution.treasury).div(100);
  const liquidityAmount = totalSupply.mul(DAO_CONFIG.token.distribution.liquidity).div(100);
  
  // Transfer tokens to respective addresses
  await mnxToken.transfer(process.env.TEAM_WALLET || deployer.address, teamAmount);
  await mnxToken.transfer(process.env.INVESTORS_WALLET || deployer.address, investorsAmount);
  await mnxToken.transfer(process.env.COMMUNITY_WALLET || deployer.address, communityAmount);
  await mnxToken.transfer(process.env.TREASURY_WALLET || deployer.address, treasuryAmount);
  await mnxToken.transfer(process.env.LIQUIDITY_WALLET || deployer.address, liquidityAmount);
  
  console.log("✅ Token distribution completed");
  console.log(`   Team: ${ethers.utils.formatEther(teamAmount)} MNX`);
  console.log(`   Investors: ${ethers.utils.formatEther(investorsAmount)} MNX`);
  console.log(`   Community: ${ethers.utils.formatEther(communityAmount)} MNX`);
  console.log(`   Treasury: ${ethers.utils.formatEther(treasuryAmount)} MNX`);
  console.log(`   Liquidity: ${ethers.utils.formatEther(liquidityAmount)} MNX`);
}

async function setupVestingSchedules(mnxTokenAddress: string, vestingAddress: string) {
  console.log("⏰ Setting up Vesting Schedules...");
  
  const vesting = await ethers.getContractAt("VestingWallet", vestingAddress);
  const mnxToken = await ethers.getContractAt("MNXToken", mnxTokenAddress);
  
  // Set up team vesting
  await vesting.createVestingSchedule(
    process.env.TEAM_WALLET || (await ethers.getSigners())[0].address,
    Math.floor(Date.now() / 1000), // Start now
    DAO_CONFIG.vesting.team.cliff,
    DAO_CONFIG.vesting.team.duration,
    DAO_CONFIG.vesting.team.revocable
  );
  
  // Set up investors vesting
  await vesting.createVestingSchedule(
    process.env.INVESTORS_WALLET || (await ethers.getSigners())[0].address,
    Math.floor(Date.now() / 1000), // Start now
    DAO_CONFIG.vesting.investors.cliff,
    DAO_CONFIG.vesting.investors.duration,
    DAO_CONFIG.vesting.investors.revocable
  );
  
  // Set up community vesting
  await vesting.createVestingSchedule(
    process.env.COMMUNITY_WALLET || (await ethers.getSigners())[0].address,
    Math.floor(Date.now() / 1000), // Start now
    DAO_CONFIG.vesting.community.cliff,
    DAO_CONFIG.vesting.community.duration,
    DAO_CONFIG.vesting.community.revocable
  );
  
  console.log("✅ Vesting schedules created");
}

async function generateDAODocumentation(contracts: any) {
  console.log("📚 Generating DAO Documentation...");
  
  const daoDir = path.join(__dirname, "../../dao");
  if (!fs.existsSync(daoDir)) {
    fs.mkdirSync(daoDir, { recursive: true });
  }
  
  const documentation = `# MANI X AI DAO Governance Framework

## Overview
The MANI X AI DAO (Decentralized Autonomous Organization) is a community-driven governance system that enables token holders to participate in the decision-making process for the MANI X AI ecosystem.

## Token Economics

### MNX Token
- **Name**: MANI X AI Token
- **Symbol**: MNX
- **Total Supply**: 1,000,000,000 MNX
- **Decimals**: 18
- **Contract**: ${contracts.mnxToken}

### Token Distribution
- **Team**: 15% (150M MNX) - 4-year vesting with 1-year cliff
- **Investors**: 20% (200M MNX) - 2-year vesting with 6-month cliff
- **Community**: 30% (300M MNX) - 1-year vesting, no cliff
- **Treasury**: 25% (250M MNX) - Controlled by DAO
- **Liquidity**: 10% (100M MNX) - For DEX liquidity

## Governance Structure

### Core Contracts
- **MNX Token**: ${contracts.mnxToken}
- **Governance**: ${contracts.governance}
- **Timelock**: ${contracts.timelock}
- **Vesting**: ${contracts.vesting}

### Governance Parameters
- **Voting Delay**: 1 block
- **Voting Period**: 3 days
- **Proposal Threshold**: 1M MNX
- **Quorum Votes**: 10M MNX
- **Timelock Delay**: 2 days
- **Emergency Delay**: 1 day

## Governance Process

### 1. Proposal Creation
Anyone holding at least 1M MNX tokens can create a proposal by calling:
\`\`\`solidity
governance.propose(
  targets,      // Array of target addresses
  values,       // Array of ETH values
  signatures,   // Array of function signatures
  calldatas,    // Array of calldata
  description   // Proposal description
)
\`\`\`

### 2. Voting
After the voting delay, token holders can vote:
\`\`\`solidity
governance.castVote(proposalId, support)
\`\`\`
- **Support**: 0 = Against, 1 = For, 2 = Abstain

### 3. Execution
If the proposal passes, it can be executed after the timelock delay:
\`\`\`solidity
governance.execute(proposalId)
\`\`\`

## Proposal Types

### 1. Protocol Upgrades
- Smart contract upgrades
- Parameter changes
- Feature additions/removals

### 2. Treasury Management
- Fund allocation
- Investment decisions
- Partnership agreements

### 3. Community Initiatives
- Marketing campaigns
- Educational programs
- Community events

### 4. Technical Decisions
- Security measures
- Performance optimizations
- Integration decisions

## Voting Power

### Token-Based Voting
- 1 MNX = 1 vote
- Voting power is calculated at the start of the voting period
- Delegation is supported

### Delegation
Token holders can delegate their voting power:
\`\`\`solidity
mnxToken.delegate(delegatee)
\`\`\`

## Emergency Procedures

### Emergency Pause
In case of critical issues, the DAO can:
1. Pause all vault operations
2. Halt cross-chain transactions
3. Freeze token transfers
4. Initiate emergency recovery

### Emergency Recovery
- Multi-signature wallet control
- Community fund recovery
- Protocol migration
- Asset protection

## DAO Treasury

### Treasury Management
- Controlled by DAO governance
- Multi-signature wallet for security
- Transparent fund allocation
- Regular financial reporting

### Fund Allocation
- Development funding
- Marketing and growth
- Security audits
- Community rewards
- Emergency reserves

## Community Participation

### Getting Involved
1. **Hold MNX Tokens**: Minimum 1M MNX to create proposals
2. **Participate in Voting**: Any token holder can vote
3. **Join Discussions**: Discord, Forum, Telegram
4. **Contribute to Development**: GitHub, Documentation
5. **Propose Initiatives**: Community proposals

### Rewards and Incentives
- **Proposal Creation**: Gas fee reimbursement
- **Active Participation**: Community recognition
- **Contributions**: Token rewards
- **Long-term Holding**: Staking rewards

## Security Measures

### Multi-Signature Wallets
- Treasury management
- Emergency procedures
- Key protocol functions

### Timelock Protection
- All governance actions delayed
- Community review period
- Emergency override mechanisms

### Audit Requirements
- Regular security audits
- Community review
- Professional verification

## Governance Timeline

### Phase 1: Foundation (Months 1-3)
- DAO deployment
- Initial token distribution
- Community onboarding
- First governance proposals

### Phase 2: Growth (Months 4-6)
- Feature expansion
- Partnership proposals
- Community initiatives
- Technical improvements

### Phase 3: Maturity (Months 7-12)
- Full decentralization
- Advanced governance features
- Cross-chain expansion
- Ecosystem development

## Resources

### Documentation
- **Technical Docs**: ./docs/
- **API Reference**: ./api-docs/
- **Governance Guide**: ./governance/

### Community
- **Discord**: https://discord.gg/manix-ai
- **Forum**: https://forum.manix.ai
- **Telegram**: @ManixAIDAO
- **Twitter**: @ManixAI

### Development
- **GitHub**: https://github.com/manix-ai
- **Smart Contracts**: ./contracts/
- **Frontend**: ./frontend/
- **Backend**: ./backend/

## Contact Information

- **Website**: https://manix.ai
- **Email**: dao@manix.ai
- **Support**: support@manix.ai
- **Partnerships**: partnerships@manix.ai

---

*This document is updated regularly through DAO governance proposals.*
`;

  fs.writeFileSync(
    path.join(daoDir, "README.md"),
    documentation
  );
  
  console.log("✅ DAO documentation generated");
}

async function generateGovernanceScripts(contracts: any) {
  console.log("🔧 Generating Governance Scripts...");
  
  const daoDir = path.join(__dirname, "../../dao");
  
  // Governance interaction script
  const governanceScript = `import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

interface Proposal {
  id: number;
  proposer: string;
  targets: string[];
  values: number[];
  signatures: string[];
  calldatas: string[];
  description: string;
  startBlock: number;
  endBlock: number;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  executed: boolean;
  canceled: boolean;
}

class GovernanceManager {
  private governance: any;
  private timelock: any;
  private mnxToken: any;
  
  constructor(governanceAddress: string, timelockAddress: string, mnxTokenAddress: string) {
    this.governance = new ethers.Contract(governanceAddress, GOVERNANCE_ABI);
    this.timelock = new ethers.Contract(timelockAddress, TIMELOCK_ABI);
    this.mnxToken = new ethers.Contract(mnxTokenAddress, MNX_TOKEN_ABI);
  }
  
  async createProposal(
    targets: string[],
    values: number[],
    signatures: string[],
    calldatas: string[],
    description: string
  ): Promise<number> {
    const [deployer] = await ethers.getSigners();
    
    // Check if proposer has enough tokens
    const balance = await this.mnxToken.balanceOf(deployer.address);
    const threshold = await this.governance.proposalThreshold();
    
    if (balance.lt(threshold)) {
      throw new Error(\`Insufficient MNX tokens. Required: \${ethers.utils.formatEther(threshold)}, Have: \${ethers.utils.formatEther(balance)}\`);
    }
    
    // Create proposal
    const tx = await this.governance.connect(deployer).propose(
      targets,
      values,
      signatures,
      calldatas,
      description
    );
    
    const receipt = await tx.wait();
    const proposalId = receipt.events.find((e: any) => e.event === "ProposalCreated").args.proposalId;
    
    console.log(\`✅ Proposal created: \${proposalId}\`);
    console.log(\`   Description: \${description}\`);
    console.log(\`   Targets: \${targets.length}\`);
    console.log(\`   Transaction: \${tx.hash}\`);
    
    return proposalId.toNumber();
  }
  
  async vote(proposalId: number, support: 0 | 1 | 2): Promise<void> {
    const [deployer] = await ethers.getSigners();
    
    const tx = await this.governance.connect(deployer).castVote(proposalId, support);
    await tx.wait();
    
    const supportText = ["Against", "For", "Abstain"][support];
    console.log(\`✅ Voted \${supportText} on proposal \${proposalId}\`);
  }
  
  async executeProposal(proposalId: number): Promise<void> {
    const [deployer] = await ethers.getSigners();
    
    const tx = await this.governance.connect(deployer).execute(proposalId);
    await tx.wait();
    
    console.log(\`✅ Proposal \${proposalId} executed\`);
  }
  
  async getProposal(proposalId: number): Promise<Proposal> {
    const proposal = await this.governance.proposals(proposalId);
    
    return {
      id: proposalId,
      proposer: proposal.proposer,
      targets: proposal.targets,
      values: proposal.values,
      signatures: proposal.signatures,
      calldatas: proposal.calldatas,
      description: proposal.description,
      startBlock: proposal.startBlock.toNumber(),
      endBlock: proposal.endBlock.toNumber(),
      forVotes: proposal.forVotes.toNumber(),
      againstVotes: proposal.againstVotes.toNumber(),
      abstainVotes: proposal.abstainVotes.toNumber(),
      executed: proposal.executed,
      canceled: proposal.canceled
    };
  }
  
  async getVotingPower(account: string, blockNumber?: number): Promise<number> {
    const votes = await this.governance.getVotes(account, blockNumber || "latest");
    return votes.toNumber();
  }
  
  async delegateVotingPower(delegatee: string): Promise<void> {
    const [deployer] = await ethers.getSigners();
    
    const tx = await this.mnxToken.connect(deployer).delegate(delegatee);
    await tx.wait();
    
    console.log(\`✅ Delegated voting power to \${delegatee}\`);
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  // Load contract addresses
  const configPath = path.join(__dirname, "../packages/contracts/deployments/dao-config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  
  const manager = new GovernanceManager(
    config.governance,
    config.timelock,
    config.mnxToken
  );
  
  switch (command) {
    case "propose":
      if (args.length < 5) {
        console.log("Usage: propose <targets> <values> <signatures> <calldatas> <description>");
        return;
      }
      const targets = JSON.parse(args[0]);
      const values = JSON.parse(args[1]);
      const signatures = JSON.parse(args[2]);
      const calldatas = JSON.parse(args[3]);
      const description = args[4];
      
      await manager.createProposal(targets, values, signatures, calldatas, description);
      break;
      
    case "vote":
      if (args.length < 2) {
        console.log("Usage: vote <proposalId> <support> (0=Against, 1=For, 2=Abstain)");
        return;
      }
      const proposalId = parseInt(args[0]);
      const support = parseInt(args[1]) as 0 | 1 | 2;
      
      await manager.vote(proposalId, support);
      break;
      
    case "execute":
      if (args.length < 1) {
        console.log("Usage: execute <proposalId>");
        return;
      }
      const executeProposalId = parseInt(args[0]);
      
      await manager.executeProposal(executeProposalId);
      break;
      
    case "info":
      if (args.length < 1) {
        console.log("Usage: info <proposalId>");
        return;
      }
      const infoProposalId = parseInt(args[0]);
      const proposal = await manager.getProposal(infoProposalId);
      
      console.log(\`\\n📋 Proposal \${proposal.id}\`);
      console.log(\`   Proposer: \${proposal.proposer}\`);
      console.log(\`   Description: \${proposal.description}\`);
      console.log(\`   Start Block: \${proposal.startBlock}\`);
      console.log(\`   End Block: \${proposal.endBlock}\`);
      console.log(\`   For Votes: \${proposal.forVotes}\`);
      console.log(\`   Against Votes: \${proposal.againstVotes}\`);
      console.log(\`   Abstain Votes: \${proposal.abstainVotes}\`);
      console.log(\`   Executed: \${proposal.executed}\`);
      console.log(\`   Canceled: \${proposal.canceled}\`);
      break;
      
    case "delegate":
      if (args.length < 1) {
        console.log("Usage: delegate <delegatee>");
        return;
      }
      const delegatee = args[0];
      
      await manager.delegateVotingPower(delegatee);
      break;
      
    case "power":
      const [deployer] = await ethers.getSigners();
      const votingPower = await manager.getVotingPower(deployer.address);
      
      console.log(\`\\n🗳️ Voting Power\`);
      console.log(\`   Account: \${deployer.address}\`);
      console.log(\`   Power: \${ethers.utils.formatEther(votingPower)} MNX\`);
      break;
      
    default:
      console.log("Available commands:");
      console.log("  propose <targets> <values> <signatures> <calldatas> <description>");
      console.log("  vote <proposalId> <support>");
      console.log("  execute <proposalId>");
      console.log("  info <proposalId>");
      console.log("  delegate <delegatee>");
      console.log("  power");
  }
}

main().catch(console.error);
`;

  fs.writeFileSync(
    path.join(daoDir, "governance-manager.ts"),
    governanceScript
  );
  
  // DAO package.json
  const packageJson = {
    name: "manix-ai-dao",
    version: "1.0.0",
    description: "MANI X AI DAO Governance Framework",
    scripts: {
      "governance": "ts-node governance-manager.ts",
      "deploy": "hardhat run scripts/deploy-dao.ts",
      "test": "hardhat test test/dao.test.ts"
    },
    dependencies: {
      "hardhat": "^2.19.0",
      "ethers": "^5.7.2",
      "ts-node": "^10.9.1",
      "typescript": "^4.9.5"
    }
  };
  
  fs.writeFileSync(
    path.join(daoDir, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );
  
  console.log("✅ Governance scripts generated");
}

async function main() {
  console.log("🏛️ Setting up MANI X AI DAO and Governance Framework");
  console.log("====================================================");
  
  try {
    // Deploy MNX token
    const mnxTokenAddress = await deployMNXToken();
    
    // Deploy governance contracts
    const contracts = await deployGovernanceContracts(mnxTokenAddress);
    contracts.mnxToken = mnxTokenAddress;
    
    // Set up token distribution
    await setupTokenDistribution(mnxTokenAddress, contracts);
    
    // Set up vesting schedules
    await setupVestingSchedules(mnxTokenAddress, contracts.vesting);
    
    // Generate DAO documentation
    await generateDAODocumentation(contracts);
    
    // Generate governance scripts
    await generateGovernanceScripts(contracts);
    
    // Save DAO configuration
    const daoConfig = {
      timestamp: new Date().toISOString(),
      contracts: contracts,
      config: DAO_CONFIG,
      deployment: {
        network: "mainnet",
        deployer: (await ethers.getSigners())[0].address
      }
    };
    
    const daoDir = path.join(__dirname, "../../dao");
    fs.writeFileSync(
      path.join(daoDir, "dao-config.json"),
      JSON.stringify(daoConfig, null, 2)
    );
    
    console.log("\n✅ DAO and governance framework setup completed!");
    console.log("\n📋 Next steps:");
    console.log("1. Review DAO configuration");
    console.log("2. Set up multi-signature wallets");
    console.log("3. Configure governance parameters");
    console.log("4. Begin community governance");
    console.log("5. Implement governance proposals");
    
  } catch (error) {
    console.error("❌ DAO setup failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });
