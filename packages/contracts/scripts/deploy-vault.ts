import { ethers } from 'hardhat';
import { Contract, ContractFactory } from 'ethers';

interface VaultConfig {
  name: string;
  symbol: string;
  asset: string;
  admin: string;
  performanceFee: number;
  managementFee: number;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', (await deployer.getBalance()).toString());

  // Vault configuration
  const vaultConfig: VaultConfig = {
    name: 'MANI X AI Vault',
    symbol: 'MANIX',
    asset: process.env.ASSET_ADDRESS || ethers.constants.AddressZero, // Update with actual token address
    admin: deployer.address,
    performanceFee: 200, // 2%
    managementFee: 50,   // 0.5%
  };

  // Deploy vault implementation
  console.log('\nDeploying ManixVault implementation...');
  const ManixVault = await ethers.getContractFactory('ManixVault');
  const vaultImplementation = await ManixVault.deploy();
  await vaultImplementation.deployed();
  console.log('Vault implementation deployed to:', vaultImplementation.address);

  // Deploy proxy admin (if using OpenZeppelin)
  const ProxyAdmin = await ethers.getContractFactory('ProxyAdmin');
  const proxyAdmin = await ProxyAdmin.deploy();
  await proxyAdmin.deployed();
  console.log('Proxy admin deployed to:', proxyAdmin.address);

  // Deploy vault proxy
  const vaultInterface = ManixVault.interface;
  const initData = vaultInterface.encodeFunctionData('initialize', [
    vaultConfig.asset,
    vaultConfig.name,
    vaultConfig.symbol,
    vaultConfig.admin,
  ]);

  const TransparentUpgradeableProxy = await ethers.getContractFactory('TransparentUpgradeableProxy');
  const vaultProxy = await TransparentUpgradeableProxy.deploy(
    vaultImplementation.address,
    proxyAdmin.address,
    initData
  );
  await vaultProxy.deployed();
  console.log('Vault proxy deployed to:', vaultProxy.address);

  // Get vault instance through proxy
  const vault = ManixVault.attach(vaultProxy.address);

  // Set initial fees
  console.log('\nSetting initial fees...');
  await vault.setPerformanceFee(vaultConfig.performanceFee);
  await vault.setManagementFee(vaultConfig.managementFee);

  // Verify deployment
  console.log('\nVerifying deployment...');
  console.log('Vault name:', await vault.name());
  console.log('Vault symbol:', await vault.symbol());
  console.log('Vault asset:', await vault.asset());
  console.log('Performance fee:', await vault.performanceFee());
  console.log('Management fee:', await vault.managementFee());
  console.log('Admin role:', await vault.hasRole(await vault.DEFAULT_ADMIN_ROLE(), deployer.address));

  // Save deployment info
  const deploymentInfo = {
    network: await deployer.provider.getNetwork(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      vaultImplementation: vaultImplementation.address,
      proxyAdmin: proxyAdmin.address,
      vault: vaultProxy.address,
    },
    config: vaultConfig,
  };

  console.log('\nDeployment completed successfully!');
  console.log('Deployment info:', JSON.stringify(deploymentInfo, null, 2));

  // Instructions for verification
  console.log('\n--- Verification Instructions ---');
  console.log('To verify contracts on Etherscan, run:');
  console.log(`npx hardhat verify --network <network> ${vaultImplementation.address}`);
  console.log(`npx hardhat verify --network <network> ${proxyAdmin.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


