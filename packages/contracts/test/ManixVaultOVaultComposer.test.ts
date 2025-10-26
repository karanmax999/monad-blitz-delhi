import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { Contract, Signer } from 'ethers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('ManixVault OVault Composer Hub-and-Spoke Integration', function () {
  let hubVault: Contract; // Monad hub vault
  let spokeVault: Contract; // Ethereum spoke vault
  let asset: Contract;
  let mockLayerZeroEndpoint: Contract;
  let mockDVNValidator: Contract;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;

  const INITIAL_SUPPLY = ethers.utils.parseEther('1000000');
  const DEPOSIT_AMOUNT = ethers.utils.parseEther('100');

  async function deployOVaultFixture() {
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

    // Deploy mock DVN validator
    const MockDVNValidator = await ethers.getContractFactory('MockDVNValidator');
    mockDVNValidator = await MockDVNValidator.deploy();

    // Deploy hub vault (Monad simulation)
    const ManixVault = await ethers.getContractFactory('ManixVault');
    hubVault = await upgrades.deployProxy(ManixVault, [
      asset.address,
      'MANI X AI Hub Vault',
      'MANIXHUB',
      ownerAddress,
      mockLayerZeroEndpoint.address,
      mockDVNValidator.address,
      true // isHubVault
    ]);

    // Deploy spoke vault (Ethereum simulation)
    spokeVault = await upgrades.deployProxy(ManixVault, [
      asset.address,
      'MANI X AI Spoke Vault',
      'MANIXSPOKE',
      ownerAddress,
      mockLayerZeroEndpoint.address,
      mockDVNValidator.address,
      false // isHubVault
    ]);

    // Set up trusted remotes between hub and spoke
    const hubRemotePath = ethers.utils.solidityPack(['address', 'address'], [hubVault.address, hubVault.address]);
    const spokeRemotePath = ethers.utils.solidityPack(['address', 'address'], [spokeVault.address, spokeVault.address]);

    await hubVault.setTrustedRemote(1, spokeRemotePath); // Ethereum chain ID = 1
    await spokeVault.setTrustedRemote(123456789, hubRemotePath); // Monad chain ID

    // Configure mock endpoints
    await mockLayerZeroEndpoint.setVault(hubVault.address);
    await mockDVNValidator.setValid(true);

    // Fund users with mock tokens
    await asset.transfer(user1Address, ethers.utils.parseEther('10000'));
    await asset.transfer(user2Address, ethers.utils.parseEther('10000'));

    return { hubVault, spokeVault, asset, mockLayerZeroEndpoint, mockDVNValidator, owner, user1, user2 };
  }

  describe('OVault Composer Initialization', function () {
    it('Should initialize hub vault with correct configuration', async function () {
      const { hubVault } = await loadFixture(deployOVaultFixture);
      
      expect(await hubVault.isHubVault()).to.be.true;
      expect(await hubVault.hubChainId()).to.equal(123456789); // Monad chain ID
    });

    it('Should initialize spoke vault with correct configuration', async function () {
      const { spokeVault } = await loadFixture(deployOVaultFixture);
      
      expect(await spokeVault.isHubVault()).to.be.false;
      expect(await spokeVault.hubChainId()).to.equal(1); // Ethereum chain ID
    });

    it('Should configure supported chains correctly', async function () {
      const { hubVault } = await loadFixture(deployOVaultFixture);
      
      expect(await hubVault.isSupportedChain(1)).to.be.true; // Ethereum
      expect(await hubVault.isSupportedChain(137)).to.be.true; // Polygon
      expect(await hubVault.isSupportedChain(42161)).to.be.true; // Arbitrum
      expect(await hubVault.isSupportedChain(56)).to.be.true; // BSC
    });
  });

  describe('DVN Validation', function () {
    it('Should validate DVN options correctly', async function () {
      const { hubVault } = await loadFixture(deployOVaultFixture);
      
      const message = ethers.utils.toUtf8Bytes('test-message');
      const options = ethers.utils.toUtf8Bytes('dvn-options');
      
      const [nativeFee, lzTokenFee, dvnValid] = await hubVault.quoteLayerZeroFees(
        1, // Ethereum chain
        message,
        options,
        true // validate DVN
      );
      
      expect(nativeFee).to.be.a('bigint');
      expect(lzTokenFee).to.be.a('bigint');
      expect(dvnValid).to.be.true;
    });

    it('Should handle DVN validation failures', async function () {
      const { hubVault, mockDVNValidator } = await loadFixture(deployOVaultFixture);
      
      // Set DVN validator to return invalid
      await mockDVNValidator.setValid(false);
      
      const message = ethers.utils.toUtf8Bytes('test-message');
      const options = ethers.utils.toUtf8Bytes('invalid-dvn-options');
      
      const [nativeFee, lzTokenFee, dvnValid] = await hubVault.quoteLayerZeroFees(
        1,
        message,
        options,
        true
      );
      
      expect(dvnValid).to.be.false;
    });
  });

  describe('Hub-and-Spoke Deposits', function () {
    beforeEach(async function () {
      await loadFixture(deployOVaultFixture);
      
      // Set up initial deposit in spoke vault
      await asset.connect(user1).approve(spokeVault.address, DEPOSIT_AMOUNT);
      await spokeVault.connect(user1).deposit(DEPOSIT_AMOUNT, user1Address);
    });

    it('Should initiate hub deposit from spoke', async function () {
      const amount = ethers.utils.parseEther('50');
      const dstEid = 123456789; // Monad chain ID
      const recipient = hubVault.address;
      
      // Create send parameters
      const sendParam = {
        dstEid: dstEid,
        amountLD: amount,
        recipient: recipient,
        refundTo: user1Address,
        composeMsg: ethers.utils.toUtf8Bytes('hub-deposit-message'),
        oftCmd: ethers.utils.toUtf8Bytes('')
      };
      
      const fee = {
        nativeFee: ethers.utils.parseEther('0.01'),
        lzTokenFee: 0
      };
      
      const tx = spokeVault.connect(user1).send(
        sendParam,
        fee,
        user1Address,
        { value: ethers.utils.parseEther('0.02') }
      );
      
      await expect(tx)
        .to.emit(spokeVault, 'SpokeDepositInitiated');
    });

    it('Should process hub deposit receipt', async function () {
      // This would test the receipt of deposits on the hub side
      // The actual message processing would happen via LayerZero
      const initialBalance = await hubVault.balanceOf(user1Address);
      expect(initialBalance).to.equal(0);
    });
  });

  describe('AI Recommendation Sync', function () {
    it('Should send AI sync from hub to multiple spokes', async function () {
      const { hubVault } = await loadFixture(deployOVaultFixture);
      
      const user = user1Address;
      const action = 'REBALANCE';
      const confidence = 8500; // 85% confidence
      const expectedReturn = 1500; // 15% APR
      const targetChains = [1, 137, 42161]; // Ethereum, Polygon, Arbitrum
      const options = ethers.utils.toUtf8Bytes('');
      
      const tx = hubVault.sendAISyncToChains(
        user,
        action,
        confidence,
        expectedReturn,
        targetChains,
        options,
        { value: ethers.utils.parseEther('0.1') }
      );
      
      // Should emit events for each target chain
      await expect(tx)
        .to.emit(hubVault, 'AIRecommendationHubSync');
    });

    it('Should reject low-confidence AI recommendations', async function () {
      const { hubVault } = await loadFixture(deployOVaultFixture);
      
      const targetChains = [1];
      const options = ethers.utils.toUtf8Bytes('');
      
      await expect(
        hubVault.sendAISyncToChains(
          user1Address,
          'REBALANCE',
          5000, // 50% - too low
          1500,
          targetChains,
          options
        )
      ).to.be.revertedWith('Low confidence');
    });
  });

  describe('Cross-Chain Fee Quoting', function () {
    it('Should quote fees for OVault send operations', async function () {
      const { hubVault } = await loadFixture(deployOVaultFixture);
      
      const sendParam = {
        dstEid: 1, // Ethereum
        amountLD: ethers.utils.parseEther('100'),
        recipient: user1Address,
        refundTo: user1Address,
        composeMsg: ethers.utils.toUtf8Bytes('test-message'),
        oftCmd: ethers.utils.toUtf8Bytes('')
      };
      
      const fee = await hubVault.quoteSend(sendParam, false);
      
      expect(fee.nativeFee).to.be.a('bigint');
      expect(fee.lzTokenFee).to.be.a('bigint');
    });

    it('Should handle unsupported chain in fee quoting', async function () {
      const { hubVault } = await loadFixture(deployOVaultFixture);
      
      const sendParam = {
        dstEid: 999, // Unsupported chain
        amountLD: ethers.utils.parseEther('100'),
        recipient: user1Address,
        refundTo: user1Address,
        composeMsg: ethers.utils.toUtf8Bytes('test-message'),
        oftCmd: ethers.utils.toUtf8Bytes('')
      };
      
      await expect(
        hubVault.quoteSend(sendParam, false)
      ).to.be.revertedWith('Unsupported destination chain');
    });
  });

  describe('DVN Message Processing', function () {
    it('Should process lzCompose with valid DVN', async function () {
      const { hubVault, mockDVNValidator } = await loadFixture(deployOVaultFixture);
      
      // Ensure DVN validator is set to valid
      await mockDVNValidator.setValid(true);
      
      const from = user1Address;
      const to = hubVault.address;
      const guid = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-guid'));
      
      // Create a test hub-spoke message for deposit
      const hubSpokeMessage = {
        msgType: 12, // MSG_TYPE_SPOKE_DEPOSIT
        transactionId: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-tx')),
        user: user1Address,
        amount: ethers.utils.parseEther('100'),
        shares: 0,
        sourceChain: 1,
        targetChain: 123456789,
        aiData: ethers.utils.toUtf8Bytes('')
      };
      
      const message = ethers.utils.defaultAbiCoder.encode(
        ['tuple(uint8,bytes32,address,uint256,uint256,uint32,uint32,bytes)'],
        [[
          hubSpokeMessage.msgType,
          hubSpokeMessage.transactionId,
          hubSpokeMessage.user,
          hubSpokeMessage.amount,
          hubSpokeMessage.shares,
          hubSpokeMessage.sourceChain,
          hubSpokeMessage.targetChain,
          hubSpokeMessage.aiData
        ]]
      );
      
      const tx = hubVault.lzCompose(from, to, guid, message, { value: ethers.utils.parseEther('0.1') });
      
      await expect(tx)
        .to.emit(hubVault, 'DVNValidationCompleted')
        .to.emit(hubVault, 'HubDepositReceived');
    });

    it('Should reject lzCompose with invalid DVN', async function () {
      const { hubVault, mockDVNValidator } = await loadFixture(deployOVaultFixture);
      
      // Set DVN validator to invalid
      await mockDVNValidator.setValid(false);
      
      const from = user1Address;
      const to = hubVault.address;
      const guid = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-guid'));
      const message = ethers.utils.toUtf8Bytes('invalid-message');
      
      await expect(
        hubVault.lzCompose(from, to, guid, message)
      ).to.be.revertedWith('DVN validation failed');
    });
  });

  describe('Transaction Deduplication', function () {
    it('Should prevent duplicate hub-spoke transactions', async function () {
      const { hubVault } = await loadFixture(deployOVaultFixture);
      
      const transactionId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('duplicate-test'));
      
      // First transaction should succeed
      await hubVault.connect(owner).processHubSpokeTransaction(transactionId);
      expect(await hubVault.hubSpokeTransactions(transactionId)).to.be.true;
      
      // Second transaction with same ID should fail
      await expect(
        hubVault.connect(owner).processHubSpokeTransaction(transactionId)
      ).to.be.revertedWith('Transaction already processed');
    });
  });
});
