import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { Contract, Signer } from 'ethers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('MANI X AI Vault Composer Deployment Integration', function () {
  // Test configuration
  const MONAD_CHAIN_ID = 123456789;
  const ETHEREUM_CHAIN_ID = 1;
  const MONAD_EID = 10143;
  const ETHEREUM_EID = 30101;

  interface DeploymentFixture {
    deployer: Signer;
    user: Signer;
    hubVault: Contract;
    spokeVault: Contract;
    hubComposer: Contract;
    spokeComposer: Contract;
    hubAssetOFT: Contract;
    spokeAssetOFT: Contract;
    hubShareOFT: Contract;
    spokeShareOFT: Contract;
    dvnValidator: Contract;
    layerZeroEndpoint: string;
  }

  async function deployFixture(): Promise<DeploymentFixture> {
    const [deployer, user] = await ethers.getSigners();
    
    // Mock LayerZero endpoint for testing
    const layerZeroEndpoint = '0x1a44076050125825900e736c501f859c50fE728c';

    // Deploy DVN Validator
    const MockDVNValidator = await ethers.getContractFactory('MockDVNValidator');
    const dvnValidator = await MockDVNValidator.deploy();
    await dvnValidator.deployed();

    // Deploy Asset OFTs
    const AssetOFT = await ethers.getContractFactory('AssetOFT');
    const hubAssetOFT = await AssetOFT.deploy(
      'MANI X AI Asset Hub',
      'MANIXA',
      layerZeroEndpoint,
      await deployer.getAddress()
    );
    await hubAssetOFT.deployed();

    const spokeAssetOFT = await AssetOFT.deploy(
      'MANI X AI Asset Spoke',
      'MANIXA-SPOKE',
      layerZeroEndpoint,
      await deployer.getAddress()
    );
    await spokeAssetOFT.deployed();

    // Deploy Share OFTs
    const ShareOFT = await ethers.getContractFactory('ShareOFT');
    const hubShareOFT = await ShareOFT.deploy(
      'MANI X AI Share Hub',
      'MANIXS',
      layerZeroEndpoint,
      await deployer.getAddress()
    );
    await hubShareOFT.deployed();

    const spokeShareOFT = await ShareOFT.deploy(
      'MANI X AI Share Spoke',
      'MANIXS-SPOKE',
      layerZeroEndpoint,
      await deployer.getAddress()
    );
    await spokeShareOFT.deployed();

    // Deploy Hub Vault
    const ManixVault = await ethers.getContractFactory('ManixVault');
    const hubVaultImpl = await ManixVault.deploy();
    await hubVaultImpl.deployed();

    const ProxyAdmin = await ethers.getContractFactory('ProxyAdmin');
    const hubProxyAdmin = await ProxyAdmin.deploy();
    await hubProxyAdmin.deployed();

    const hubInitData = ManixVault.interface.encodeFunctionData('initialize', [
      hubAssetOFT.address,
      'MANI X AI Cross-Chain Vault Hub',
      'MANIXHUB',
      await deployer.getAddress(),
      layerZeroEndpoint,
      dvnValidator.address,
      true, // isHubVault
    ]);

    const TransparentUpgradeableProxy = await ethers.getContractFactory('TransparentUpgradeableProxy');
    const hubVaultProxy = await TransparentUpgradeableProxy.deploy(
      hubVaultImpl.address,
      hubProxyAdmin.address,
      hubInitData
    );
    await hubVaultProxy.deployed();

    const hubVault = ManixVault.attach(hubVaultProxy.address);

    // Deploy Spoke Vault
    const spokeVaultImpl = await ManixVault.deploy();
    await spokeVaultImpl.deployed();

    const spokeProxyAdmin = await ProxyAdmin.deploy();
    await spokeProxyAdmin.deployed();

    const spokeInitData = ManixVault.interface.encodeFunctionData('initialize', [
      spokeAssetOFT.address,
      'MANI X AI Cross-Chain Vault Spoke',
      'MANIXSPOKE',
      await deployer.getAddress(),
      layerZeroEndpoint,
      dvnValidator.address,
      false, // isHubVault
    ]);

    const spokeVaultProxy = await TransparentUpgradeableProxy.deploy(
      spokeVaultImpl.address,
      spokeProxyAdmin.address,
      spokeInitData
    );
    await spokeVaultProxy.deployed();

    const spokeVault = ManixVault.attach(spokeVaultProxy.address);

    // Deploy OVault Composers
    const OVaultComposer = await ethers.getContractFactory('OVaultComposer');
    const hubComposer = await OVaultComposer.deploy(
      layerZeroEndpoint,
      await deployer.getAddress()
    );
    await hubComposer.deployed();

    const spokeComposer = await OVaultComposer.deploy(
      layerZeroEndpoint,
      await deployer.getAddress()
    );
    await spokeComposer.deployed();

    // Configure Composers
    await hubComposer.setHubVault(hubVaultProxy.address);
    await hubComposer.setDVNValidator(dvnValidator.address);
    await spokeComposer.setDVNValidator(dvnValidator.address);

    // Link composers to vaults
    await hubVault.setComposer(hubComposer.address);
    await spokeVault.setComposer(spokeComposer.address);

    // Configure peers
    const hubAddressBytes32 = ethers.utils.hexZeroPad(hubVaultProxy.address, 32);
    const spokeAddressBytes32 = ethers.utils.hexZeroPad(spokeVaultProxy.address, 32);

    await hubComposer.setPeer(ETHEREUM_EID, spokeAddressBytes32);
    await spokeComposer.setPeer(MONAD_EID, hubAddressBytes32);

    await hubComposer.setWhitelistedChain(ETHEREUM_EID, true);
    await spokeComposer.setWhitelistedChain(MONAD_EID, true);

    // Configure OFT peers
    const hubAssetBytes32 = ethers.utils.hexZeroPad(hubAssetOFT.address, 32);
    const spokeAssetBytes32 = ethers.utils.hexZeroPad(spokeAssetOFT.address, 32);
    const hubShareBytes32 = ethers.utils.hexZeroPad(hubShareOFT.address, 32);
    const spokeShareBytes32 = ethers.utils.hexZeroPad(spokeShareOFT.address, 32);

    await hubAssetOFT.setPeer(ETHEREUM_EID, spokeAssetBytes32);
    await spokeAssetOFT.setPeer(MONAD_EID, hubAssetBytes32);
    await hubShareOFT.setPeer(ETHEREUM_EID, spokeShareBytes32);
    await spokeShareOFT.setPeer(MONAD_EID, hubShareBytes32);

    // Mint initial assets for testing
    await hubAssetOFT.mint(await user.getAddress(), ethers.utils.parseEther('1000'));
    await spokeAssetOFT.mint(await user.getAddress(), ethers.utils.parseEther('1000'));

    return {
      deployer,
      user,
      hubVault,
      spokeVault,
      hubComposer,
      spokeComposer,
      hubAssetOFT,
      spokeAssetOFT,
      hubShareOFT,
      spokeShareOFT,
      dvnValidator,
      layerZeroEndpoint,
    };
  }

  describe('Deployment Verification', function () {
    it('Should deploy all contracts successfully', async function () {
      const fixture = await loadFixture(deployFixture);
      
      expect(fixture.hubVault.address).to.not.equal(ethers.constants.AddressZero);
      expect(fixture.spokeVault.address).to.not.equal(ethers.constants.AddressZero);
      expect(fixture.hubComposer.address).to.not.equal(ethers.constants.AddressZero);
      expect(fixture.spokeComposer.address).to.not.equal(ethers.constants.AddressZero);
      expect(fixture.hubAssetOFT.address).to.not.equal(ethers.constants.AddressZero);
      expect(fixture.spokeAssetOFT.address).to.not.equal(ethers.constants.AddressZero);
      expect(fixture.hubShareOFT.address).to.not.equal(ethers.constants.AddressZero);
      expect(fixture.spokeShareOFT.address).to.not.equal(ethers.constants.AddressZero);
      expect(fixture.dvnValidator.address).to.not.equal(ethers.constants.AddressZero);
    });

    it('Should configure hub vault correctly', async function () {
      const fixture = await loadFixture(deployFixture);
      
      expect(await fixture.hubVault.name()).to.equal('MANI X AI Cross-Chain Vault Hub');
      expect(await fixture.hubVault.symbol()).to.equal('MANIXHUB');
      expect(await fixture.hubVault.asset()).to.equal(fixture.hubAssetOFT.address);
      expect(await fixture.hubVault.composer()).to.equal(fixture.hubComposer.address);
    });

    it('Should configure spoke vault correctly', async function () {
      const fixture = await loadFixture(deployFixture);
      
      expect(await fixture.spokeVault.name()).to.equal('MANI X AI Cross-Chain Vault Spoke');
      expect(await fixture.spokeVault.symbol()).to.equal('MANIXSPOKE');
      expect(await fixture.spokeVault.asset()).to.equal(fixture.spokeAssetOFT.address);
      expect(await fixture.spokeVault.composer()).to.equal(fixture.spokeComposer.address);
    });

    it('Should emit PeerSet events when configuring peers', async function () {
      const fixture = await loadFixture(deployFixture);
      
      // Test peer configuration events
      const tx1 = await fixture.hubComposer.setPeer(ETHEREUM_EID, ethers.utils.hexZeroPad(fixture.spokeVault.address, 32));
      await expect(tx1).to.emit(fixture.hubComposer, 'PeerSet').withArgs(ETHEREUM_EID, ethers.utils.hexZeroPad(fixture.spokeVault.address, 32));

      const tx2 = await fixture.spokeComposer.setPeer(MONAD_EID, ethers.utils.hexZeroPad(fixture.hubVault.address, 32));
      await expect(tx2).to.emit(fixture.spokeComposer, 'PeerSet').withArgs(MONAD_EID, ethers.utils.hexZeroPad(fixture.hubVault.address, 32));
    });
  });

  describe('DVN Validation', function () {
    it('Should validate DVN proofs correctly', async function () {
      const fixture = await loadFixture(deployFixture);
      
      const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test message'));
      const dvnProof = ethers.utils.toUtf8Bytes('valid proof');
      
      // Test valid DVN proof
      expect(await fixture.dvnValidator.verifyWithDVN(messageHash, dvnProof, MONAD_EID)).to.be.true;
      
      // Test invalid DVN proof
      await fixture.dvnValidator.setValid(false);
      expect(await fixture.dvnValidator.verifyWithDVN(messageHash, dvnProof, MONAD_EID)).to.be.false;
    });

    it('Should reject lzCompose calls with invalid DVN', async function () {
      const fixture = await loadFixture(deployFixture);
      
      // Set DVN validator to invalid
      await fixture.dvnValidator.setValid(false);
      
      // Create test message
      const testMessage = ethers.utils.defaultAbiCoder.encode(
        ['uint8', 'bytes32', 'address', 'uint256', 'uint256', 'uint32', 'uint32', 'bytes'],
        [
          12, // MSG_TYPE_SPOKE_DEPOSIT
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-tx')),
          await fixture.user.getAddress(),
          ethers.utils.parseEther('1'),
          0,
          ETHEREUM_EID,
          MONAD_EID,
          '0x'
        ]
      );

      // Mock LayerZero endpoint call
      await expect(
        fixture.hubComposer.connect(fixture.user).lzCompose(
          fixture.spokeVault.address,
          fixture.hubVault.address,
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-guid')),
          testMessage,
          { value: ethers.utils.parseEther('0.1') }
        )
      ).to.be.revertedWith('DVN invalid');
    });
  });

  describe('Hub-and-Spoke Deposit Flow', function () {
    it('Should process hub-spoke deposit correctly', async function () {
      const fixture = await loadFixture(deployFixture);
      
      const userAddress = await fixture.user.getAddress();
      const depositAmount = ethers.utils.parseEther('100');
      const transactionId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-deposit-tx'));

      // Create hub-spoke deposit message
      const depositMessage = ethers.utils.defaultAbiCoder.encode(
        ['uint8', 'bytes32', 'address', 'uint256', 'uint256', 'uint32', 'uint32', 'bytes'],
        [
          12, // MSG_TYPE_SPOKE_DEPOSIT
          transactionId,
          userAddress,
          depositAmount,
          0,
          ETHEREUM_EID,
          MONAD_EID,
          '0x'
        ]
      );

      // Mock LayerZero endpoint call to hub composer
      await expect(
        fixture.hubComposer.connect(fixture.user).lzCompose(
          fixture.spokeVault.address,
          fixture.hubVault.address,
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-guid')),
          depositMessage,
          { value: ethers.utils.parseEther('0.1') }
        )
      ).to.emit(fixture.hubVault, 'HubDepositReceived')
        .withArgs(transactionId, userAddress, depositAmount, depositAmount, ETHEREUM_EID, await ethers.provider.getBlockNumber());

      // Verify shares were minted
      const userShares = await fixture.hubVault.balanceOf(userAddress);
      expect(userShares).to.equal(depositAmount);
    });

    it('Should prevent duplicate transaction processing', async function () {
      const fixture = await loadFixture(deployFixture);
      
      const userAddress = await fixture.user.getAddress();
      const depositAmount = ethers.utils.parseEther('100');
      const transactionId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('duplicate-tx'));

      const depositMessage = ethers.utils.defaultAbiCoder.encode(
        ['uint8', 'bytes32', 'address', 'uint256', 'uint256', 'uint32', 'uint32', 'bytes'],
        [
          12, // MSG_TYPE_SPOKE_DEPOSIT
          transactionId,
          userAddress,
          depositAmount,
          0,
          ETHEREUM_EID,
          MONAD_EID,
          '0x'
        ]
      );

      // First call should succeed
      await fixture.hubComposer.connect(fixture.user).lzCompose(
        fixture.spokeVault.address,
        fixture.hubVault.address,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-guid-1')),
        depositMessage,
        { value: ethers.utils.parseEther('0.1') }
      );

      // Second call with same transaction ID should fail
      await expect(
        fixture.hubComposer.connect(fixture.user).lzCompose(
          fixture.spokeVault.address,
          fixture.hubVault.address,
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-guid-2')),
          depositMessage,
          { value: ethers.utils.parseEther('0.1') }
        )
      ).to.be.revertedWith('already processed');
    });
  });

  describe('AI Sync Flow', function () {
    it('Should process AI recommendation sync correctly', async function () {
      const fixture = await loadFixture(deployFixture);
      
      const userAddress = await fixture.user.getAddress();
      const recommendationId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('ai-recommendation'));
      
      // Create AI recommendation data
      const aiData = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'uint256', 'uint256', 'bytes32', 'uint32'],
        [
          userAddress,
          'REBALANCE',
          8500, // 85% confidence
          1500, // 15% expected return
          recommendationId,
          MONAD_EID
        ]
      );

      const aiSyncMessage = ethers.utils.defaultAbiCoder.encode(
        ['uint8', 'bytes32', 'address', 'uint256', 'uint256', 'uint32', 'uint32', 'bytes'],
        [
          14, // MSG_TYPE_AI_SYNC_HUB
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes('ai-sync-tx')),
          userAddress,
          0,
          0,
          MONAD_EID,
          ETHEREUM_EID,
          aiData
        ]
      );

      // Mock LayerZero endpoint call
      await expect(
        fixture.spokeComposer.connect(fixture.user).lzCompose(
          fixture.hubVault.address,
          fixture.spokeVault.address,
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes('ai-sync-guid')),
          aiSyncMessage,
          { value: ethers.utils.parseEther('0.1') }
        )
      ).to.emit(fixture.spokeVault, 'AIRecommendationSpokeSync')
        .withArgs(recommendationId, userAddress, 'REBALANCE', 8500, MONAD_EID, await ethers.provider.getBlockNumber());
    });

    it('Should call composerAISync hook correctly', async function () {
      const fixture = await loadFixture(deployFixture);
      
      const userAddress = await fixture.user.getAddress();
      const recommendationId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('ai-hook-test'));
      
      const aiData = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'uint256', 'uint256', 'bytes32', 'uint32'],
        [
          userAddress,
          'REBALANCE',
          9000, // 90% confidence
          2000, // 20% expected return
          recommendationId,
          MONAD_EID
        ]
      );

      const aiSyncMessage = ethers.utils.defaultAbiCoder.encode(
        ['uint8', 'bytes32', 'address', 'uint256', 'uint256', 'uint32', 'uint32', 'bytes'],
        [
          14, // MSG_TYPE_AI_SYNC_HUB
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes('ai-hook-tx')),
          userAddress,
          0,
          0,
          MONAD_EID,
          ETHEREUM_EID,
          aiData
        ]
      );

      // Test direct composerAISync call
      await expect(
        fixture.spokeVault.connect(fixture.deployer).composerAISync(aiSyncMessage)
      ).to.emit(fixture.spokeVault, 'AIRecommendationSpokeSync')
        .withArgs(recommendationId, userAddress, 'REBALANCE', 9000, MONAD_EID, await ethers.provider.getBlockNumber());
    });
  });

  describe('Fee Quoting', function () {
    it('Should quote LayerZero fees correctly', async function () {
      const fixture = await loadFixture(deployFixture);
      
      const testMessage = ethers.utils.toUtf8Bytes('test message');
      const testOptions = ethers.utils.toUtf8Bytes('test options');
      
      const [nativeFee, lzTokenFee, dvnValid] = await fixture.hubComposer.quoteLayerZeroFees(
        ETHEREUM_EID,
        testMessage,
        testOptions,
        true
      );

      expect(nativeFee).to.be.gt(0);
      expect(lzTokenFee).to.be.gte(0);
      expect(dvnValid).to.be.true;
    });

    it('Should reject quotes for unsupported chains', async function () {
      const fixture = await loadFixture(deployFixture);
      
      const testMessage = ethers.utils.toUtf8Bytes('test message');
      const testOptions = ethers.utils.toUtf8Bytes('test options');
      const unsupportedEid = 99999;
      
      await expect(
        fixture.hubComposer.quoteLayerZeroFees(
          unsupportedEid,
          testMessage,
          testOptions,
          true
        )
      ).to.be.revertedWith('unsupported chain');
    });
  });

  describe('Access Control', function () {
    it('Should restrict composer hook calls to authorized composer only', async function () {
      const fixture = await loadFixture(deployFixture);
      
      const userAddress = await fixture.user.getAddress();
      const depositAmount = ethers.utils.parseEther('100');
      const transactionId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('unauthorized-tx'));

      // Non-composer should not be able to call composer hooks
      await expect(
        fixture.hubVault.connect(fixture.user).composerDeposit(
          userAddress,
          depositAmount,
          transactionId,
          ETHEREUM_EID
        )
      ).to.be.revertedWith('not composer');
    });

    it('Should allow only admin to set composer', async function () {
      const fixture = await loadFixture(deployFixture);
      
      // Non-admin should not be able to set composer
      await expect(
        fixture.hubVault.connect(fixture.user).setComposer(fixture.spokeComposer.address)
      ).to.be.revertedWith('AccessControl: account');
    });
  });

  describe('OFT Integration', function () {
    it('Should configure OFT peers correctly', async function () {
      const fixture = await loadFixture(deployFixture);
      
      // Test Asset OFT peer configuration
      const hubAssetPeer = await fixture.hubAssetOFT.peers(ETHEREUM_EID);
      const spokeAssetPeer = await fixture.spokeAssetOFT.peers(MONAD_EID);
      
      expect(hubAssetPeer).to.equal(ethers.utils.hexZeroPad(fixture.spokeAssetOFT.address, 32));
      expect(spokeAssetPeer).to.equal(ethers.utils.hexZeroPad(fixture.hubAssetOFT.address, 32));
    });

    it('Should mint and burn OFT tokens correctly', async function () {
      const fixture = await loadFixture(deployFixture);
      
      const userAddress = await fixture.user.getAddress();
      const mintAmount = ethers.utils.parseEther('100');
      
      // Test minting
      await fixture.hubAssetOFT.connect(fixture.deployer).mint(userAddress, mintAmount);
      expect(await fixture.hubAssetOFT.balanceOf(userAddress)).to.equal(mintAmount);
      
      // Test burning
      await fixture.hubAssetOFT.connect(fixture.deployer).burn(userAddress, mintAmount);
      expect(await fixture.hubAssetOFT.balanceOf(userAddress)).to.equal(0);
    });
  });

  describe('End-to-End Integration', function () {
    it('Should complete full hub-spoke deposit flow', async function () {
      const fixture = await loadFixture(deployFixture);
      
      const userAddress = await fixture.user.getAddress();
      const depositAmount = ethers.utils.parseEther('50');
      
      // 1. User deposits on spoke vault
      await fixture.spokeAssetOFT.connect(fixture.user).approve(fixture.spokeVault.address, depositAmount);
      await fixture.spokeVault.connect(fixture.user).deposit(depositAmount, userAddress);
      
      // Verify shares were minted on spoke
      const spokeShares = await fixture.spokeVault.balanceOf(userAddress);
      expect(spokeShares).to.be.gt(0);
      
      // 2. Simulate cross-chain transfer via composer
      const transactionId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('e2e-test'));
      const depositMessage = ethers.utils.defaultAbiCoder.encode(
        ['uint8', 'bytes32', 'address', 'uint256', 'uint256', 'uint32', 'uint32', 'bytes'],
        [
          12, // MSG_TYPE_SPOKE_DEPOSIT
          transactionId,
          userAddress,
          depositAmount,
          0,
          ETHEREUM_EID,
          MONAD_EID,
          '0x'
        ]
      );

      // 3. Hub processes the deposit
      await fixture.hubComposer.connect(fixture.user).lzCompose(
        fixture.spokeVault.address,
        fixture.hubVault.address,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes('e2e-guid')),
        depositMessage,
        { value: ethers.utils.parseEther('0.1') }
      );

      // 4. Verify shares were minted on hub
      const hubShares = await fixture.hubVault.balanceOf(userAddress);
      expect(hubShares).to.equal(depositAmount);
      
      // 5. Verify events were emitted
      const events = await fixture.hubVault.queryFilter(
        fixture.hubVault.filters.HubDepositReceived(transactionId)
      );
      expect(events.length).to.equal(1);
    });
  });
});
