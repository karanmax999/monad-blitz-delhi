import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { Contract, Signer } from 'ethers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('ManixVault', function () {
  let vault: Contract;
  let asset: Contract;
  let strategy: Contract;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;

  const INITIAL_SUPPLY = ethers.utils.parseEther('1000000');
  const DEPOSIT_AMOUNT = ethers.utils.parseEther('100');
  const PERFORMANCE_FEE = 200; // 2%
  const MANAGEMENT_FEE = 50;   // 0.5%

  async function deployVaultFixture() {
    [owner, user1, user2] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();

    // Deploy mock ERC20 asset
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    asset = await MockERC20.deploy('Mock Token', 'MTK', INITIAL_SUPPLY);

    // Deploy vault
    const ManixVault = await ethers.getContractFactory('ManixVault');
    vault = await upgrades.deployProxy(ManixVault, [
      asset.address,
      'MANI X AI Vault',
      'MANIX',
      ownerAddress
    ]);

    // Set initial fees
    await vault.setPerformanceFee(PERFORMANCE_FEE);
    await vault.setManagementFee(MANAGEMENT_FEE);

    // Fund users with mock tokens
    await asset.transfer(user1Address, ethers.utils.parseEther('10000'));
    await asset.transfer(user2Address, ethers.utils.parseEther('10000'));

    return { vault, asset, owner, user1, user2 };
  }

  describe('Deployment', function () {
    it('Should deploy with correct initial values', async function () {
      const { vault, asset } = await loadFixture(deployVaultFixture);

      expect(await vault.name()).to.equal('MANI X AI Vault');
      expect(await vault.symbol()).to.equal('MANIX');
      expect(await vault.asset()).to.equal(asset.address);
      expect(await vault.performanceFee()).to.equal(PERFORMANCE_FEE);
      expect(await vault.managementFee()).to.equal(MANAGEMENT_FEE);
      expect(await vault.paused()).to.be.false;
    });

    it('Should set correct roles', async function () {
      const { vault } = await loadFixture(deployVaultFixture);
      const DEFAULT_ADMIN_ROLE = await vault.DEFAULT_ADMIN_ROLE();
      const ADMIN_ROLE = await vault.ADMIN_ROLE();

      expect(await vault.hasRole(DEFAULT_ADMIN_ROLE, ownerAddress)).to.be.true;
      expect(await vault.hasRole(ADMIN_ROLE, ownerAddress)).to.be.true;
    });
  });

  describe('Deposit', function () {
    it('Should allow deposits and mint shares correctly', async function () {
      const { vault, asset } = await loadFixture(deployVaultFixture);
      
      await asset.connect(user1).approve(vault.address, DEPOSIT_AMOUNT);
      
      const tx = vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1Address);
      
      await expect(tx)
        .to.emit(vault, 'Deposit')
        .withArgs(user1Address, user1Address, DEPOSIT_AMOUNT, DEPOSIT_AMOUNT);

      expect(await vault.balanceOf(user1Address)).to.equal(DEPOSIT_AMOUNT);
      expect(await vault.totalSupply()).to.equal(DEPOSIT_AMOUNT);
      expect(await vault.totalAssets()).to.equal(DEPOSIT_AMOUNT);
    });

    it('Should prevent deposits when paused', async function () {
      const { vault, asset } = await loadFixture(deployVaultFixture);
      
      await vault.emergencyPause();
      await asset.connect(user1).approve(vault.address, DEPOSIT_AMOUNT);
      
      await expect(
        vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1Address)
      ).to.be.revertedWith('Pausable: paused');
    });

    it('Should prevent zero amount deposits', async function () {
      const { vault } = await loadFixture(deployVaultFixture);
      
      await expect(
        vault.connect(user1).deposit(0, user1Address)
      ).to.be.revertedWith('Zero assets');
    });
  });

  describe('Withdraw', function () {
    beforeEach(async function () {
      const { vault, asset } = await loadFixture(deployVaultFixture);
      
      // Setup initial deposit
      await asset.connect(user1).approve(vault.address, DEPOSIT_AMOUNT);
      await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1Address);
    });

    it('Should allow withdrawals and burn shares correctly', async function () {
      const { vault, asset } = await loadFixture(deployVaultFixture);
      
      const withdrawAmount = ethers.utils.parseEther('50');
      const expectedShares = await vault.previewWithdraw(withdrawAmount);
      
      const tx = vault.connect(user1).withdraw(withdrawAmount, user1Address, user1Address);
      
      await expect(tx)
        .to.emit(vault, 'Withdraw')
        .withArgs(user1Address, user1Address, user1Address, withdrawAmount, expectedShares);
    });

    it('Should prevent withdrawals when paused', async function () {
      const { vault } = await loadFixture(deployVaultFixture);
      
      await vault.emergencyPause();
      
      await expect(
        vault.connect(user1).withdraw(ethers.utils.parseEther('10'), user1Address, user1Address)
      ).to.be.revertedWith('Pausable: paused');
    });
  });

  describe('Fee Management', function () {
    it('Should allow admin to update performance fee', async function () {
      const { vault } = await loadFixture(deployVaultFixture);
      
      const newFee = 300;
      const tx = vault.setPerformanceFee(newFee);
      
      await expect(tx)
        .to.emit(vault, 'PerformanceFeeUpdated')
        .withArgs(PERFORMANCE_FEE, newFee);
      
      expect(await vault.performanceFee()).to.equal(newFee);
    });

    it('Should prevent non-admin from updating fees', async function () {
      const { vault } = await loadFixture(deployVaultFixture);
      
      await expect(
        vault.connect(user1).setPerformanceFee(400)
      ).to.be.revertedWith(/AccessControl/);
    });

    it('Should prevent setting fees too high', async function () {
      const { vault } = await loadFixture(deployVaultFixture);
      
      await expect(
        vault.setPerformanceFee(3000) // 30%
      ).to.be.revertedWith('Fee too high');
    });
  });

  describe('Strategy Management', function () {
    it('Should allow admin to set strategy', async function () {
      const { vault } = await loadFixture(deployVaultFixture);
      
      // Deploy mock strategy
      const MockStrategy = await ethers.getContractFactory('MockStrategy');
      const mockStrategy = await MockStrategy.deploy();
      
      const tx = vault.setStrategy(mockStrategy.address);
      
      await expect(tx)
        .to.emit(vault, 'StrategyUpdated')
        .withArgs(ethers.constants.AddressZero, mockStrategy.address);
      
      expect(await vault.strategy()).to.equal(mockStrategy.address);
    });

    it('Should prevent non-admin from setting strategy', async function () {
      const { vault } = await loadFixture(deployVaultFixture);
      
      const MockStrategy = await ethers.getContractFactory('MockStrategy');
      const mockStrategy = await MockStrategy.deploy();
      
      await expect(
        vault.connect(user1).setStrategy(mockStrategy.address)
      ).to.be.revertedWith(/AccessControl/);
    });
  });

  describe('Emergency Functions', function () {
    it('Should allow admin to pause and unpause', async function () {
      const { vault } = await loadFixture(deployVaultFixture);
      
      // Pause
      const pauseTx = vault.emergencyPause();
      await expect(pauseTx)
        .to.emit(vault, 'EmergencyPause')
        .withArgs(ownerAddress, await ethers.provider.getBlock('latest').then(b => b.timestamp));
      
      expect(await vault.paused()).to.be.true;
      
      // Unpause
      const unpauseTx = vault.emergencyUnpause();
      await expect(unpauseTx)
        .to.emit(vault, 'EmergencyUnpause')
        .withArgs(ownerAddress, await ethers.provider.getBlock('latest').then(b => b.timestamp));
      
      expect(await vault.paused()).to.be.false;
    });
  });

  describe('ERC4626 Compliance', function () {
    it('Should correctly convert between assets and shares', async function () {
      const { vault, asset } = await loadFixture(deployVaultFixture);
      
      // Initial deposit to establish 1:1 ratio
      await asset.connect(user1).approve(vault.address, DEPOSIT_AMOUNT);
      await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1Address);
      
      const testAmount = ethers.utils.parseEther('50');
      
      expect(await vault.convertToShares(testAmount)).to.equal(testAmount);
      expect(await vault.convertToAssets(testAmount)).to.equal(testAmount);
    });

    it('Should report correct maximum values', async function () {
      const { vault } = await loadFixture(deployVaultFixture);
      
      expect(await vault.maxDeposit(user1Address)).to.equal(ethers.constants.MaxUint256);
      expect(await vault.maxMint(user1Address)).to.equal(ethers.constants.MaxUint256);
    });
  });
});


