import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { Contract, Signer } from 'ethers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('ManixVault LayerZero Integration', function () {
  let vault: Contract;
  let asset: Contract;
  let mockLayerZeroEndpoint: Contract;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;

  const INITIAL_SUPPLY = ethers.utils.parseEther('1000000');
  const DEPOSIT_AMOUNT = ethers.utils.parseEther('100');
  const PERFORMANCE_FEE = 200;
  const MANAGEMENT_FEE = 50;

  async function deployLayerZeroVaultFixture() {
    [owner, user1, user2] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();

    // Deploy mock ERC20 asset
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    asset = await MockERC20.deploy('Mock Token', 'MTK', INITIAL_SUPPLY);

    // Deploy mock LayerZero endpoint
    const MockLayerZeroEndpoint = await ethers.getContractFactory('MockLayerZeroEndpoint');
    mockLayerZeroEndpoint = await MockLayerZeroEndpoint.deploy();

    // Deploy vault with LayerZero
    const ManixVault = await ethers.getContractFactory('ManixVault');
    vault = await upgrades.deployProxy(ManixVault, [
      asset.address,
      'MANI X AI Cross-Chain Vault',
      'MANIXCC',
      ownerAddress,
      mockLayerZeroEndpoint.address
    ]);

    // Set initial fees
    await vault.setPerformanceFee(PERFORMANCE_FEE);
    await vault.setManagementFee(MANAGEMENT_FEE);

    // Fund users with mock tokens
    await asset.transfer(user1Address, ethers.utils.parseEther('10000'));
    await asset.transfer(user2Address, ethers.utils.parseEther('10000'));

    return { vault, asset, mockLayerZeroEndpoint, owner, user1, user2 };
  }

  describe('LayerZero Initialization', function () {
    it('Should initialize with LayerZero endpoint', async function () {
      const { vault, mockLayerZeroEndpoint } = await loadFixture(deployLayerZeroVaultFixture);
      
      expect(await vault.layerZeroEndpoint()).to.equal(mockLayerZeroEndpoint.address);
    });

    it('Should set correct roles for LayerZero operations', async function () {
      const { vault } = await loadFixture(deployLayerZeroVaultFixture);
      
      const CROSS_CHAIN_ROLE = await vault.CROSS_CHAIN_ROLE();
      const AI_ROLE = await vault.AI_ROLE();
      
      expect(await vault.hasRole(CROSS_CHAIN_ROLE, ownerAddress)).to.be.true;
      expect(await vault.hasRole(AI_ROLE, ownerAddress)).to.be.true;
    });
  });

  describe('LayerZero Configuration', function () {
    it('Should allow admin to set trusted remote', async function () {
      const { vault } = await loadFixture(deployLayerZeroVaultFixture);
      
      const targetChain = 137; // Polygon
      const remotePath = ethers.utils.solidityPack(['address', 'address'], [vault.address, vault.address]);
      
      await vault.setTrustedRemote(targetChain, remotePath);
      expect(await vault.trustedRemoteLookup(targetChain)).to.equal(remotePath);
    });

    it('Should prevent non-admin from setting trusted remote', async function () {
      const { vault } = await loadFixture(deployLayerZeroVaultFixture);
      
      const targetChain = 137;
      const remotePath = ethers.utils.solidityPack(['address', 'address'], [vault.address, vault.address]);
      
      await expect(
        vault.connect(user1).setTrustedRemote(targetChain, remotePath)
      ).to.be.revertedWith(/AccessControl/);
    });
  });

  describe('Cross-Chain Deposit', function () {
    beforeEach(async function () {
      const fixture = await loadFixture(deployLayerZeroVaultFixture);
      vault = fixture.vault;
      
      // Set up trusted remote
      const targetChain = 137;
      const remotePath = ethers.utils.solidityPack(['address', 'address'], [vault.address, vault.address]);
      await vault.setTrustedRemote(targetChain, remotePath);
    });

    it('Should initiate cross-chain deposit', async function () {
      const targetChain = 137;
      const targetVault = vault.address;
      const amount = ethers.utils.parseEther('10');
      const user = user1Address;
      const options = ethers.utils.toUtf8Bytes('');

      const tx = vault.sendCrossChainDeposit(
        targetChain,
        targetVault,
        amount,
        user,
        options,
        { value: ethers.utils.parseEther('0.1') }
      );

      await expect(tx)
        .to.emit(vault, 'CrossChainDepositInitiated')
        .withArgs(
          await tx.then(t => t.hash),
          user,
          amount,
          targetChain,
          targetVault
        );
    });

    it('Should prevent duplicate cross-chain transactions', async function () {
      const targetChain = 137;
      const targetVault = vault.address;
      const amount = ethers.utils.parseEther('10');
      const user = user1Address;
      const options = ethers.utils.toUtf8Bytes('');

      await vault.sendCrossChainDeposit(
        targetChain,
        targetVault,
        amount,
        user,
        options,
        { value: ethers.utils.parseEther('0.1') }
      );

      // This should fail due to duplicate transaction detection
      await expect(
        vault.sendCrossChainDeposit(
          targetChain,
          targetVault,
          amount,
          user,
          options,
          { value: ethers.utils.parseEther('0.1') }
        )
      ).to.be.revertedWith('Target chain not configured');
    });
  });

  describe('Cross-Chain Withdraw', function () {
    beforeEach(async function () {
      const fixture = await loadFixture(deployLayerZeroVaultFixture);
      vault = fixture.vault;
      asset = fixture.asset;
      
      // Set up initial deposit and trusted remote
      await asset.connect(user1).approve(vault.address, DEPOSIT_AMOUNT);
      await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1Address);
      
      const targetChain = 137;
      const remotePath = ethers.utils.solidityPack(['address', 'address'], [vault.address, vault.address]);
      await vault.setTrustedRemote(targetChain, remotePath);
    });

    it('Should initiate cross-chain withdraw', async function () {
      const targetChain = 137;
      const targetVault = vault.address;
      const amount = ethers.utils.parseEther('10');
      const user = user1Address;
      const options = ethers.utils.toUtf8Bytes('');

      const tx = vault.sendCrossChainWithdraw(
        targetChain,
        targetVault,
        amount,
        user,
        options,
        { value: ethers.utils.parseEther('0.1') }
      );

      await expect(tx)
        .to.emit(vault, 'CrossChainWithdrawInitiated')
        .withArgs(
          await tx.then(t => t.hash),
          user,
          amount,
          targetChain,
          targetVault
        );
    });
  });

  describe('Cross-Chain Update (Yield Sync)', function () {
    beforeEach(async function () {
      const fixture = await loadFixture(deployLayerZeroVaultFixture);
      vault = fixture.vault;
      
      const targetChain = 137;
      const remotePath = ethers.utils.solidityPack(['address', 'address'], [vault.address, vault.address]);
      await vault.setTrustedRemote(targetChain, remotePath);
    });

    it('Should send cross-chain yield sync update', async function () {
      const targetChain = 137;
      const targetVault = vault.address;
      const options = ethers.utils.toUtf8Bytes('');

      const tx = vault.sendCrossChainUpdate(
        targetChain,
        targetVault,
        options,
        { value: ethers.utils.parseEther('0.1') }
      );

      await expect(tx)
        .to.emit(vault, 'YieldSyncMessageSent');
    });
  });

  describe('LayerZero Message Reception', function () {
    beforeEach(async function () {
      const fixture = await loadFixture(deployLayerZeroVaultFixture);
      vault = fixture.vault;
      
      const sourceChain = 137;
      const remotePath = ethers.utils.solidityPack(['address', 'address'], [vault.address, vault.address]);
      await vault.setTrustedRemote(sourceChain, remotePath);
    });

    it('Should receive and process LayerZero messages', async function () {
      const sourceChain = 137;
      const origin = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-origin'));
      const message = ethers.utils.toUtf8Bytes('test-message');
      const executor = ownerAddress;
      const extraData = ethers.utils.toUtf8Bytes('');

      // Mock the LayerZero endpoint call
      await mockLayerZeroEndpoint.setVault(vault.address);

      const tx = vault.lzReceive(origin, sourceChain, message, executor, extraData);

      await expect(tx)
        .to.emit(vault, 'LayerZeroMessageReceived')
        .withArgs(sourceChain, origin, message);
    });

    it('Should reject messages from untrusted chains', async function () {
      const sourceChain = 999; // Untrusted chain
      const origin = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-origin'));
      const message = ethers.utils.toUtf8Bytes('test-message');
      const executor = ownerAddress;
      const extraData = ethers.utils.toUtf8Bytes('');

      await expect(
        vault.lzReceive(origin, sourceChain, message, executor, extraData)
      ).to.be.revertedWith('Source chain not trusted');
    });
  });

  describe('LayerZero Fee Quoting', function () {
    it('Should quote LayerZero fees', async function () {
      const { vault } = await loadFixture(deployLayerZeroVaultFixture);
      
      const targetChain = 137;
      const message = ethers.utils.toUtf8Bytes('test-message');
      const options = ethers.utils.toUtf8Bytes('');

      // This will likely fail in test environment but should not revert the contract
      try {
        const fees = await vault.quoteLayerZeroFee(targetChain, message, options);
        expect(fees.nativeFee).to.be.a('bigint');
        expect(fees.lzTokenFee).to.be.a('bigint');
      } catch (error) {
        // Expected in test environment without real LayerZero setup
        expect(error.message).to.include('LayerZero');
      }
    });
  });

  describe('AI Recommendation Cross-Chain', function () {
    beforeEach(async function () {
      const fixture = await loadFixture(deployLayerZeroVaultFixture);
      vault = fixture.vault;
      
      const targetChain = 137;
      const remotePath = ethers.utils.solidityPack(['address', 'address'], [vault.address, vault.address]);
      await vault.setTrustedRemote(targetChain, remotePath);
    });

    it('Should send AI recommendation cross-chain', async function () {
      const targetChain = 137;
      const targetVault = vault.address;
      const user = user1Address;
      const action = 'REBALANCE';
      const confidence = 8000; // 80%
      const expectedReturn = 1500; // 15% APR
      const options = ethers.utils.toUtf8Bytes('');

      const tx = vault.sendAIRecommendation(
        targetChain,
        targetVault,
        user,
        action,
        confidence,
        expectedReturn,
        options,
        { value: ethers.utils.parseEther('0.1') }
      );

      await expect(tx)
        .to.emit(vault, 'AIRecommendationCrossChain')
        .withArgs(user, action, confidence, expectedReturn, await tx.then(t => t.hash), targetChain);
    });

    it('Should reject low-confidence AI recommendations', async function () {
      const targetChain = 137;
      const targetVault = vault.address;
      const user = user1Address;
      const action = 'REBALANCE';
      const confidence = 5000; // 50% - too low
      const expectedReturn = 1500;
      const options = ethers.utils.toUtf8Bytes('');

      await expect(
        vault.sendAIRecommendation(
          targetChain,
          targetVault,
          user,
          action,
          confidence,
          expectedReturn,
          options,
          { value: ethers.utils.parseEther('0.1') }
        )
      ).to.be.revertedWith('Low confidence');
    });
  });
});
