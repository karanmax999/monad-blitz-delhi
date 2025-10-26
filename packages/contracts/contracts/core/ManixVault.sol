// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/IManixVault.sol";
import "../interfaces/IERC4626.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/IManixStrategy.sol";
import "../interfaces/ILayerZeroEndpoint.sol";
import "../interfaces/ILayerZeroReceiver.sol";
import "../interfaces/IOVaultComposer.sol";
import "../interfaces/IDVNValidator.sol";
import "../interfaces/IOFTComposable.sol";
import "../libraries/ManixMath.sol";
import "../libraries/LayerZeroUtils.sol";
import "../libraries/OVaultUtils.sol";

/**
 * @title ManixVault
 * @dev Upgradeable vault contract implementing ERC4626 standard with AI strategy integration
 */
contract ManixVault is 
    Initializable,
    ERC20Upgradeable,
    ERC20PermitUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IManixVault,
    ILayerZeroReceiver,
    IOVaultComposer
{
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant HARVESTER_ROLE = keccak256("HARVESTER_ROLE");
    bytes32 public constant STRATEGY_ROLE = keccak256("STRATEGY_ROLE");
    bytes32 public constant CROSS_CHAIN_ROLE = keccak256("CROSS_CHAIN_ROLE");
    bytes32 public constant AI_ROLE = keccak256("AI_ROLE");

    // State variables
    IERC20 public asset;
    IStrategy public strategy;
    IManixStrategy public manixStrategy;
    
    uint256 public performanceFee;
    uint256 public managementFee;
    uint256 public lastHarvest;
    uint256 public totalPerformanceFees;

    // LayerZero state variables
    ILayerZeroEndpoint public layerZeroEndpoint;
    mapping(uint32 => bytes) public trustedRemoteLookup;
    mapping(bytes32 => bool) public processedTransactions;
    mapping(address => uint256) public crossChainBalances;

    // OVault Composer state variables
    IDVNValidator public dvnValidator;
    mapping(uint32 => bool) public isSupportedChain;
    mapping(uint32 => bytes) public chainDVNOptions;
    bool public isHubVault;
    uint32 public hubChainId;
    mapping(bytes32 => bool) public hubSpokeTransactions;
    address public composer;
    
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MAX_FEE = 2500; // 25%
    
    // Events
    event StrategyUpdated(address indexed oldStrategy, address indexed newStrategy);
    event PerformanceFeeUpdated(uint256 oldFee, uint256 newFee);
    event ManagementFeeUpdated(uint256 oldFee, uint256 newFee);
    event HarvestExecuted(address indexed harvester, uint256 totalAssets, uint256 profit, uint256 timestamp);
    event EmergencyPause(address indexed caller, uint256 timestamp);
    event EmergencyUnpause(address indexed caller, uint256 timestamp);

    // LayerZero Cross-Chain Events
    event CrossChainDepositInitiated(
        bytes32 indexed transactionId,
        address indexed user,
        uint256 amount,
        uint32 targetChain,
        address targetVault
    );
    event CrossChainDepositExecuted(
        bytes32 indexed transactionId,
        address indexed user,
        uint256 amount,
        uint32 sourceChain
    );
    event CrossChainWithdrawInitiated(
        bytes32 indexed transactionId,
        address indexed user,
        uint256 amount,
        uint32 targetChain,
        address targetVault
    );
    event CrossChainWithdrawExecuted(
        bytes32 indexed transactionId,
        address indexed user,
        uint256 amount,
        uint32 sourceChain
    );
    event YieldSyncMessageSent(
        uint32 targetChain,
        uint256 totalAssets,
        uint256 totalShares,
        uint256 apy,
        bytes32 strategyHash
    );
    event YieldSyncMessageReceived(
        uint32 sourceChain,
        uint256 totalAssets,
        uint256 totalShares,
        uint256 apy,
        bytes32 strategyHash
    );
    event AIRecommendationCrossChain(
        address indexed user,
        string action,
        uint256 confidence,
        uint256 expectedReturn,
        bytes32 recommendationId,
        uint32 targetChain
    );
    event LayerZeroMessageReceived(
        uint32 sourceChain,
        bytes32 origin,
        bytes message
    );

    // OVault Composer Hub-and-Spoke Events
    event HubDepositInitiated(
        bytes32 indexed transactionId,
        address indexed user,
        uint256 amount,
        uint32 targetChain,
        uint256 timestamp
    );
    event HubDepositReceived(
        bytes32 indexed transactionId,
        address indexed user,
        uint256 amount,
        uint256 shares,
        uint32 sourceChain,
        uint256 timestamp
    );
    event SpokeDepositInitiated(
        bytes32 indexed transactionId,
        address indexed user,
        uint256 amount,
        uint32 hubChain,
        uint256 timestamp
    );
    event SpokeDepositReceived(
        bytes32 indexed transactionId,
        address indexed user,
        uint256 amount,
        uint256 shares,
        uint32 sourceChain,
        uint256 timestamp
    );
    event AIRecommendationHubSync(
        bytes32 indexed recommendationId,
        address indexed user,
        string action,
        uint256 confidence,
        uint32 sourceChain,
        uint256 timestamp
    );
    event AIRecommendationSpokeSync(
        bytes32 indexed recommendationId,
        address indexed user,
        string action,
        uint256 confidence,
        uint32 sourceChain,
        uint256 timestamp
    );
    event DVNValidationCompleted(
        bytes32 indexed messageHash,
        uint32 sourceChain,
        bool isValid,
        uint256 timestamp
    );
    event ComposerSet(address indexed composer);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the vault with OVault Composer support
     * @param _asset The underlying asset token
     * @param _name Vault token name
     * @param _symbol Vault token symbol
     * @param _admin Admin address
     * @param _layerZeroEndpoint LayerZero endpoint address
     * @param _dvnValidator DVN validator address
     * @param _isHubVault Whether this vault is a hub vault (Monad)
     */
    function initialize(
        address _asset,
        string memory _name,
        string memory _symbol,
        address _admin,
        address _layerZeroEndpoint,
        address _dvnValidator,
        bool _isHubVault
    ) external initializer {
        require(_asset != address(0), "Invalid asset");
        require(_admin != address(0), "Invalid admin");

        __ERC20_init(_name, _symbol);
        __ERC20Permit_init(_name);
        __Pausable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        asset = IERC20(_asset);
        layerZeroEndpoint = ILayerZeroEndpoint(_layerZeroEndpoint);
        
        // OVault Composer setup
        if (_dvnValidator != address(0)) {
            dvnValidator = IDVNValidator(_dvnValidator);
        }
        
        isHubVault = _isHubVault;
        hubChainId = _isHubVault ? OVaultUtils.MONAD_CHAIN_ID : OVaultUtils.ETHEREUM_CHAIN_ID;
        
        // Initialize supported chains
        _initializeSupportedChains();
        
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
        _setupRole(ADMIN_ROLE, _admin);
        _setupRole(CROSS_CHAIN_ROLE, _admin);
        _setupRole(AI_ROLE, _admin);

        // Set default fees (2% performance, 0.5% management)
        performanceFee = 200;
        managementFee = 50;
        
        lastHarvest = block.timestamp;
        composer = address(0);
    }

    /**
     * @dev Initialize supported chains and DVN options
     */
    function _initializeSupportedChains() internal {
        // Set supported chains
        isSupportedChain[OVaultUtils.ETHEREUM_CHAIN_ID] = true;
        isSupportedChain[OVaultUtils.POLYGON_CHAIN_ID] = true;
        isSupportedChain[OVaultUtils.ARBITRUM_CHAIN_ID] = true;
        isSupportedChain[OVaultUtils.BSC_CHAIN_ID] = true;
        if (OVaultUtils.MONAD_CHAIN_ID != 0) {
            isSupportedChain[OVaultUtils.MONAD_CHAIN_ID] = true;
        }
        
        // Set DVN options for each supported chain
        chainDVNOptions[OVaultUtils.POLYGON_CHAIN_ID] = OVaultUtils.createDVNOptions(OVaultUtils.POLYGON_CHAIN_ID, false);
        chainDVNOptions[OVaultUtils.ARBITRUM_CHAIN_ID] = OVaultUtils.createDVNOptions(OVaultUtils.ARBITRUM_CHAIN_ID, false);
        chainDVNOptions[OVaultUtils.ETHEREUM_CHAIN_ID] = OVaultUtils.createDVNOptions(OVaultUtils.ETHEREUM_CHAIN_ID, true);
        chainDVNOptions[OVaultUtils.BSC_CHAIN_ID] = OVaultUtils.createDVNOptions(OVaultUtils.BSC_CHAIN_ID, false);
    }

    // ERC4626 Implementation

    function decimals() public view override(ERC20Upgradeable, IERC20Metadata) returns (uint8) {
        return ERC20Upgradeable.decimals();
    }

    function asset() external view override returns (address) {
        return address(asset);
    }

    function totalAssets() public view override returns (uint256) {
        if (address(strategy) != address(0)) {
            return strategy.balanceOf();
        }
        return asset.balanceOf(address(this));
    }

    function convertToShares(uint256 assets) public view override returns (uint256) {
        return ManixMath.calculateShares(assets, totalAssets(), totalSupply());
    }

    function convertToAssets(uint256 shares) public view override returns (uint256) {
        return ManixMath.calculateAssets(shares, totalAssets(), totalSupply());
    }

    function maxDeposit(address) public view override returns (uint256) {
        return paused() ? 0 : type(uint256).max;
    }

    function previewDeposit(uint256 assets) public view override returns (uint256) {
        return convertToShares(assets);
    }

    function deposit(uint256 assets, address receiver) 
        external 
        override 
        nonReentrant 
        whenNotPaused 
        returns (uint256 shares) 
    {
        require(assets > 0, "Zero assets");
        require(receiver != address(0), "Invalid receiver");

        shares = previewDeposit(assets);
        require(shares > 0, "Zero shares");

        // Transfer assets from caller
        asset.safeTransferFrom(msg.sender, address(this), assets);
        
        // Deposit to strategy if available
        if (address(strategy) != address(0)) {
            _earn();
        }

        _mint(receiver, shares);

        emit Deposit(msg.sender, receiver, assets, shares);
    }

    function maxMint(address) public view override returns (uint256) {
        return paused() ? 0 : type(uint256).max;
    }

    function previewMint(uint256 shares) public view override returns (uint256) {
        return convertToAssets(shares);
    }

    function maxWithdraw(address owner) public view override returns (uint256) {
        return paused() ? 0 : convertToAssets(balanceOf(owner));
    }

    function previewWithdraw(uint256 assets) public view override returns (uint256) {
        return convertToShares(assets);
    }

    function withdraw(uint256 assets, address receiver, address owner) 
        external 
        override 
        nonReentrant 
        whenNotPaused 
        returns (uint256 shares) 
    {
        require(assets > 0, "Zero assets");
        require(receiver != address(0), "Invalid receiver");

        shares = previewWithdraw(assets);
        
        if (msg.sender != owner) {
            uint256 currentAllowance = allowance(owner, msg.sender);
            require(currentAllowance >= shares, "Insufficient allowance");
            _spendAllowance(owner, msg.sender, shares);
        }

        _burn(owner, shares);
        
        // Withdraw from strategy if needed
        uint256 available = asset.balanceOf(address(this));
        if (available < assets && address(strategy) != address(0)) {
            uint256 needed = assets - available;
            strategy.withdraw(needed);
        }

        asset.safeTransfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    function maxRedeem(address owner) public view override returns (uint256) {
        return paused() ? 0 : balanceOf(owner);
    }

    function previewRedeem(uint256 shares) public view override returns (uint256) {
        return convertToAssets(shares);
    }

    function redeem(uint256 shares, address receiver, address owner) 
        external 
        override 
        nonReentrant 
        whenNotPaused 
        returns (uint256 assets) 
    {
        require(shares > 0, "Zero shares");
        require(receiver != address(0), "Invalid receiver");

        assets = previewRedeem(shares);

        if (msg.sender != owner) {
            uint256 currentAllowance = allowance(owner, msg.sender);
            require(currentAllowance >= shares, "Insufficient allowance");
            _spendAllowance(owner, msg.sender, shares);
        }

        _burn(owner, shares);
        
        // Withdraw from strategy if needed
        uint256 available = asset.balanceOf(address(this));
        if (available < assets && address(strategy) != address(0)) {
            uint256 needed = assets - available;
            strategy.withdraw(needed);
        }

        asset.safeTransfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    // Strategy Management

    function setStrategy(address newStrategy) external onlyRole(ADMIN_ROLE) {
        address oldStrategy = address(strategy);
        strategy = IStrategy(newStrategy);
        manixStrategy = IManixStrategy(newStrategy);
        
        if (address(strategy) != address(0)) {
            _grantRole(STRATEGY_ROLE, address(strategy));
            asset.safeApprove(address(strategy), type(uint256).max);
        }
        
        emit StrategyUpdated(oldStrategy, address(strategy));
    }

    function _earn() internal {
        if (address(strategy) != address(0)) {
            uint256 balance = asset.balanceOf(address(this));
            if (balance > 0) {
                strategy.deposit(balance);
            }
        }
    }

    // Harvest Functionality

    function harvest() external override onlyRole(HARVESTER_ROLE) whenNotPaused {
        require(address(strategy) != address(0), "No strategy set");
        
        uint256 totalAssetsBefore = totalAssets();
        
        strategy.harvest();
        
        uint256 totalAssetsAfter = totalAssets();
        
        if (totalAssetsAfter > totalAssetsBefore) {
            uint256 profit = totalAssetsAfter - totalAssetsBefore;
            uint256 fee = ManixMath.calculatePercentage(profit, performanceFee);
            
            if (fee > 0) {
                totalPerformanceFees += fee;
                // Fee collection logic would go here
            }
            
            emit HarvestExecuted(msg.sender, totalAssetsAfter, profit, block.timestamp);
        }
        
        lastHarvest = block.timestamp;
    }

    // Fee Management

    function setPerformanceFee(uint256 newFee) external override onlyRole(ADMIN_ROLE) {
        ManixMath.validateFee(newFee);
        uint256 oldFee = performanceFee;
        performanceFee = newFee;
        emit PerformanceFeeUpdated(oldFee, newFee);
    }

    function setManagementFee(uint256 newFee) external override onlyRole(ADMIN_ROLE) {
        ManixMath.validateFee(newFee);
        uint256 oldFee = managementFee;
        managementFee = newFee;
        emit ManagementFeeUpdated(oldFee, newFee);
    }

    // Emergency Functions

    function emergencyPause() external override onlyRole(ADMIN_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender, block.timestamp);
    }

    function emergencyUnpause() external override onlyRole(ADMIN_ROLE) {
        _unpause();
        emit EmergencyUnpause(msg.sender, block.timestamp);
    }

    // View Functions

    function performanceFee() external view override returns (uint256) {
        return performanceFee;
    }

    function managementFee() external view override returns (uint256) {
        return managementFee;
    }

    function lastHarvest() external view override returns (uint256) {
        return lastHarvest;
    }

    function totalPerformanceFees() external view override returns (uint256) {
        return totalPerformanceFees;
    }

    function paused() public view override(PausableUpgradeable, IManixVault) returns (bool) {
        return PausableUpgradeable.paused();
    }

    // LayerZero Cross-Chain Functions

    /**
     * @dev Set LayerZero endpoint (admin only)
     */
    function setLayerZeroEndpoint(address _layerZeroEndpoint) external onlyRole(ADMIN_ROLE) {
        require(_layerZeroEndpoint != address(0), "Invalid endpoint");
        layerZeroEndpoint = ILayerZeroEndpoint(_layerZeroEndpoint);
    }

    /**
     * @dev Set trusted remote chain for cross-chain operations
     */
    function setTrustedRemote(uint32 _srcEid, bytes calldata _path) external onlyRole(ADMIN_ROLE) {
        trustedRemoteLookup[_srcEid] = _path;
    }

    /**
     * @dev Send cross-chain deposit to target chain
     */
    function sendCrossChainDeposit(
        uint32 _targetChain,
        address _targetVault,
        uint256 _amount,
        address _user,
        bytes memory _options
    ) external payable onlyRole(CROSS_CHAIN_ROLE) nonReentrant whenNotPaused {
        require(_amount > 0, "Invalid amount");
        require(_targetVault != address(0), "Invalid target vault");
        require(trustedRemoteLookup[_targetChain].length > 0, "Target chain not configured");

        bytes32 transactionId = keccak256(
            abi.encodePacked(
                msg.sender,
                _targetChain,
                _amount,
                block.timestamp,
                block.number
            )
        );

        // Ensure transaction ID is unique
        require(!processedTransactions[transactionId], "Duplicate transaction");

        processedTransactions[transactionId] = true;

        // Encode the cross-chain message
        bytes memory message = LayerZeroUtils.encodeCrossChainDeposit(
            transactionId,
            _user,
            _amount,
            _targetChain,
            _targetVault
        );

        // Send message via LayerZero
        ILayerZeroEndpoint.MessagingParams memory params = ILayerZeroEndpoint.MessagingParams({
            dstEid: _targetChain,
            receiver: abi.encodePacked(_targetVault),
            message: message,
            options: _options,
            payInLzToken: false
        });

        layerZeroEndpoint.send{value: msg.value}(
            params,
            msg.sender
        );

        emit CrossChainDepositInitiated(
            transactionId,
            _user,
            _amount,
            _targetChain,
            _targetVault
        );
    }

    /**
     * @dev Send cross-chain withdraw to target chain
     */
    function sendCrossChainWithdraw(
        uint32 _targetChain,
        address _targetVault,
        uint256 _amount,
        address _user,
        bytes memory _options
    ) external payable onlyRole(CROSS_CHAIN_ROLE) nonReentrant whenNotPaused {
        require(_amount > 0, "Invalid amount");
        require(_targetVault != address(0), "Invalid target vault");
        require(trustedRemoteLookup[_targetChain].length > 0, "Target chain not configured");
        require(balanceOf(_user) >= convertToShares(_amount), "Insufficient balance");

        bytes32 transactionId = keccak256(
            abi.encodePacked(
                msg.sender,
                _targetChain,
                _amount,
                block.timestamp,
                block.number
            )
        );

        require(!processedTransactions[transactionId], "Duplicate transaction");
        processedTransactions[transactionId] = true;

        // Encode the cross-chain message
        bytes memory message = LayerZeroUtils.encodeCrossChainWithdraw(
            transactionId,
            _user,
            _amount,
            _targetChain,
            _targetVault
        );

        // Send message via LayerZero
        ILayerZeroEndpoint.MessagingParams memory params = ILayerZeroEndpoint.MessagingParams({
            dstEid: _targetChain,
            receiver: abi.encodePacked(_targetVault),
            message: message,
            options: _options,
            payInLzToken: false
        });

        layerZeroEndpoint.send{value: msg.value}(
            params,
            msg.sender
        );

        emit CrossChainWithdrawInitiated(
            transactionId,
            _user,
            _amount,
            _targetChain,
            _targetVault
        );
    }

    /**
     * @dev Send yield synchronization to target chain
     */
    function sendCrossChainUpdate(
        uint32 _targetChain,
        address _targetVault,
        bytes memory _options
    ) external payable onlyRole(HARVESTER_ROLE) whenNotPaused {
        require(trustedRemoteLookup[_targetChain].length > 0, "Target chain not configured");

        uint256 currentAssets = totalAssets();
        uint256 currentShares = totalSupply();
        uint256 estimatedAPY = address(strategy) != address(0) ? strategy.estimatedReturn() : 0;
        bytes32 strategyHash = address(strategy) != address(0) ? 
            keccak256(abi.encodePacked(address(strategy), currentAssets)) : bytes32(0);

        bytes memory message = LayerZeroUtils.encodeYieldSync(
            currentAssets,
            currentShares,
            estimatedAPY,
            strategyHash
        );

        ILayerZeroEndpoint.MessagingParams memory params = ILayerZeroEndpoint.MessagingParams({
            dstEid: _targetChain,
            receiver: abi.encodePacked(_targetVault),
            message: message,
            options: _options,
            payInLzToken: false
        });

        layerZeroEndpoint.send{value: msg.value}(
            params,
            msg.sender
        );

        emit YieldSyncMessageSent(
            _targetChain,
            currentAssets,
            currentShares,
            estimatedAPY,
            strategyHash
        );
    }

    /**
     * @dev Send AI recommendation to target chain
     */
    function sendAIRecommendation(
        uint32 _targetChain,
        address _targetVault,
        address _user,
        string memory _action,
        uint256 _confidence,
        uint256 _expectedReturn,
        bytes memory _options
    ) external payable onlyRole(AI_ROLE) whenNotPaused {
        require(trustedRemoteLookup[_targetChain].length > 0, "Target chain not configured");
        require(_confidence >= 7000, "Low confidence"); // 70% minimum

        bytes32 recommendationId = keccak256(
            abi.encodePacked(
                _user,
                _action,
                _confidence,
                block.timestamp
            )
        );

        bytes memory message = LayerZeroUtils.encodeAIRecommendation(
            _user,
            _action,
            _confidence,
            _expectedReturn,
            recommendationId
        );

        ILayerZeroEndpoint.MessagingParams memory params = ILayerZeroEndpoint.MessagingParams({
            dstEid: _targetChain,
            receiver: abi.encodePacked(_targetVault),
            message: message,
            options: _options,
            payInLzToken: false
        });

        layerZeroEndpoint.send{value: msg.value}(
            params,
            msg.sender
        );

        emit AIRecommendationCrossChain(
            _user,
            _action,
            _confidence,
            _expectedReturn,
            recommendationId,
            _targetChain
        );
    }

    /**
     * @dev LayerZero message receiver implementation
     */
    function lzReceive(
        bytes32 _origin,
        uint32 _srcEid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable override {
        require(msg.sender == address(layerZeroEndpoint), "Invalid endpoint");
        require(trustedRemoteLookup[_srcEid].length > 0, "Source chain not trusted");

        emit LayerZeroMessageReceived(_srcEid, _origin, _message);

        // Decode and process the message
        _processCrossChainMessage(_srcEid, _message);
    }

    /**
     * @dev Process incoming cross-chain messages
     */
    function _processCrossChainMessage(uint32 _srcEid, bytes calldata _message) internal {
        // Decode the message type first
        uint8 messageType = uint8(_message[0]);

        if (messageType == LayerZeroUtils.MSG_TYPE_CROSS_CHAIN_DEPOSIT) {
            _handleCrossChainDeposit(_srcEid, _message);
        } else if (messageType == LayerZeroUtils.MSG_TYPE_CROSS_CHAIN_WITHDRAW) {
            _handleCrossChainWithdraw(_srcEid, _message);
        } else if (messageType == LayerZeroUtils.MSG_TYPE_YIELD_SYNC) {
            _handleYieldSync(_srcEid, _message);
        } else if (messageType == LayerZeroUtils.MSG_TYPE_AI_RECOMMENDATION) {
            _handleAIRecommendation(_srcEid, _message);
        }
    }

    /**
     * @dev Handle incoming cross-chain deposit
     */
    function _handleCrossChainDeposit(uint32 _srcEid, bytes calldata _message) internal {
        LayerZeroUtils.CrossChainMessage memory messageData = LayerZeroUtils.decodeCrossChainMessage(_message);
        
        require(!processedTransactions[messageData.transactionId], "Transaction already processed");
        processedTransactions[messageData.transactionId] = true;

        // Execute the cross-chain deposit
        uint256 shares = convertToShares(messageData.amount);
        if (shares > 0) {
            _mint(messageData.user, shares);
            crossChainBalances[messageData.user] += messageData.amount;
        }

        emit CrossChainDepositExecuted(
            messageData.transactionId,
            messageData.user,
            messageData.amount,
            _srcEid
        );
    }

    /**
     * @dev Handle incoming cross-chain withdraw
     */
    function _handleCrossChainWithdraw(uint32 _srcEid, bytes calldata _message) internal {
        LayerZeroUtils.CrossChainMessage memory messageData = LayerZeroUtils.decodeCrossChainMessage(_message);
        
        require(!processedTransactions[messageData.transactionId], "Transaction already processed");
        processedTransactions[messageData.transactionId] = true;

        // Verify user has sufficient balance
        uint256 userShares = balanceOf(messageData.user);
        uint256 requiredShares = convertToShares(messageData.amount);
        require(userShares >= requiredShares, "Insufficient balance");

        // Execute the cross-chain withdraw
        _burn(messageData.user, requiredShares);
        crossChainBalances[messageData.user] -= messageData.amount;

        emit CrossChainWithdrawExecuted(
            messageData.transactionId,
            messageData.user,
            messageData.amount,
            _srcEid
        );
    }

    /**
     * @dev Handle yield synchronization from source chain
     */
    function _handleYieldSync(uint32 _srcEid, bytes calldata _message) internal {
        LayerZeroUtils.YieldSyncMessage memory messageData = LayerZeroUtils.decodeYieldSyncMessage(_message);
        
        // Update strategy or vault state based on yield sync data
        // This could trigger rebalancing or strategy adjustments
        if (address(strategy) != address(0) && messageData.strategyHash != bytes32(0)) {
            // Process yield sync with strategy integration
            // Implementation would depend on specific strategy requirements
        }

        emit YieldSyncMessageReceived(
            _srcEid,
            messageData.totalAssets,
            messageData.totalShares,
            messageData.apy,
            messageData.strategyHash
        );
    }

    /**
     * @dev Handle AI recommendation from source chain
     */
    function _handleAIRecommendation(uint32 _srcEid, bytes calldata _message) internal {
        LayerZeroUtils.AIRecommendationMessage memory messageData = LayerZeroUtils.decodeAIRecommendationMessage(_message);
        
        // Process AI recommendation if strategy supports it
        if (address(manixStrategy) != address(0)) {
            try manixStrategy.processAIRecommendation(
                messageData.confidence,
                messageData.action,
                messageData.expectedReturn
            ) {
                // Successfully processed
            } catch {
                // Log error but don't revert to maintain cross-chain message flow
            }
        }

        emit AIRecommendationCrossChain(
            messageData.user,
            messageData.action,
            messageData.confidence,
            messageData.expectedReturn,
            messageData.recommendationId,
            _srcEid
        );
    }

    /**
     * @dev Quote layerZero fees for cross-chain operations
     */
    function quoteLayerZeroFee(
        uint32 _targetChain,
        bytes memory _message,
        bytes memory _options
    ) external view returns (uint256 nativeFee, uint256 lzTokenFee) {
        ILayerZeroEndpoint.MessagingParams memory params = ILayerZeroEndpoint.MessagingParams({
            dstEid: _targetChain,
            receiver: abi.encodePacked(address(this)),
            message: _message,
            options: _options,
            payInLzToken: false
        });

        ILayerZeroEndpoint.MessagingFee memory fee = layerZeroEndpoint.quote(params, address(this));
        return (fee.nativeFee, fee.lzTokenFee);
    }

    // OVault Composer Implementation

    /**
     * @dev Quote fees for OVault cross-chain operations with DVN validation
     */
    function quoteLayerZeroFees(
        uint32 _dstEid,
        bytes memory _message,
        bytes memory _options,
        bool _validateDVN
    ) external view returns (uint256 nativeFee, uint256 lzTokenFee, bool dvnValid) {
        require(isSupportedChain[_dstEid], "Unsupported chain");

        ILayerZeroEndpoint.MessagingParams memory params = ILayerZeroEndpoint.MessagingParams({
            dstEid: _dstEid,
            receiver: abi.encodePacked(address(this)),
            message: _message,
            options: _options,
            payInLzToken: false
        });

        ILayerZeroEndpoint.MessagingFee memory fee = layerZeroEndpoint.quote(params, address(this));
        
        // DVN validation if requested
        if (_validateDVN && address(dvnValidator) != address(0)) {
            try dvnValidator.validateDVNOptions(_options, _dstEid) returns (
                IDVNValidator.DVNOptions memory,
                IDVNValidator.ExecutionState memory
            ) {
                dvnValid = true;
            } catch {
                dvnValid = false;
            }
        } else {
            dvnValid = true;
        }

        return (fee.nativeFee, fee.lzTokenFee, dvnValid);
    }

    /**
     * @dev OVault Composer send function for hub-and-spoke deposits
     */
    function send(
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) external payable override onlyRole(CROSS_CHAIN_ROLE) nonReentrant whenNotPaused returns (MessagingFee memory, bytes memory) {
        require(isSupportedChain[_sendParam.dstEid], "Unsupported destination chain");
        require(_sendParam.amountLD > 0, "Invalid amount");

        // Generate unique transaction ID
        bytes32 transactionId = OVaultUtils.generateTransactionId(
            msg.sender,
            _sendParam.dstEid,
            _sendParam.dstEid,
            _sendParam.amountLD,
            uint8(_sendParam.composeMsg[0])
        );

        require(!hubSpokeTransactions[transactionId], "Transaction already processed");
        hubSpokeTransactions[transactionId] = true;

        // Transfer assets from user to vault for cross-chain transfer
        if (_sendParam.amountLD > 0) {
            asset.safeTransferFrom(msg.sender, address(this), _sendParam.amountLD);
        }

        // DVN validation
        if (address(dvnValidator) != address(0)) {
            bytes memory dvnOptions = chainDVNOptions[_sendParam.dstEid];
            if (dvnOptions.length > 0) {
                try dvnValidator.validateDVNOptions(dvnOptions, _sendParam.dstEid) returns (
                    IDVNValidator.DVNOptions memory,
                    IDVNValidator.ExecutionState memory execState
                ) {
                    // Use DVN validated execution state
                    if (execState.gas > 0) {
                        // Adjust fee based on DVN validation
                        _fee.nativeFee = execState.value;
                    }
                } catch {
                    revert("DVN validation failed");
                }
            }
        }

        // Create LayerZero message parameters
        ILayerZeroEndpoint.MessagingParams memory params = ILayerZeroEndpoint.MessagingParams({
            dstEid: _sendParam.dstEid,
            receiver: abi.encodePacked(_sendParam.recipient),
            message: _sendParam.composeMsg,
            options: _sendParam.composeMsg, // Using compose message as options
            payInLzToken: false
        });

        // Send via LayerZero
        ILayerZeroEndpoint.MessagingReceipt memory receipt = layerZeroEndpoint.send{value: msg.value}(
            params,
            _refundAddress
        );

        // Emit appropriate events based on hub/spoke configuration
        if (isHubVault) {
            emit HubDepositInitiated(transactionId, msg.sender, _sendParam.amountLD, _sendParam.dstEid, block.timestamp);
        } else {
            emit SpokeDepositInitiated(transactionId, msg.sender, _sendParam.amountLD, hubChainId, block.timestamp);
        }

        return (_fee, abi.encode(receipt.guid, receipt.nonce));
    }

    /**
     * @dev Quote send for OVault operations
     */
    function quoteSend(
        SendParam calldata _sendParam,
        bool _payInLzToken
    ) external view override returns (MessagingFee memory) {
        require(isSupportedChain[_sendParam.dstEid], "Unsupported destination chain");

        ILayerZeroEndpoint.MessagingParams memory params = ILayerZeroEndpoint.MessagingParams({
            dstEid: _sendParam.dstEid,
            receiver: abi.encodePacked(_sendParam.recipient),
            message: _sendParam.composeMsg,
            options: chainDVNOptions[_sendParam.dstEid],
            payInLzToken: _payInLzToken
        });

        ILayerZeroEndpoint.MessagingFee memory fee = layerZeroEndpoint.quote(params, address(this));
        return MessagingFee({
            nativeFee: fee.nativeFee,
            lzTokenFee: fee.lzTokenFee
        });
    }

    /**
     * @dev OVault Composer receive function
     */
    function lzCompose(
        address _from,
        address _to,
        bytes32 _guid,
        bytes calldata _message
    ) external payable override {
        require(msg.sender == address(layerZeroEndpoint), "Invalid endpoint");
        
        // Decode and process hub-spoke message
        OVaultUtils.HubSpokeMessage memory hubSpokeMsg = OVaultUtils.decodeHubSpokeMessage(_message);
        
        // Validate DVN if configured
        bool dvnValid = true;
        if (address(dvnValidator) != address(0)) {
            bytes32 messageHash = keccak256(_message);
            try dvnValidator.verifyWithDVN(messageHash, bytes(""), hubSpokeMsg.sourceChain) returns (bool isValid) {
                dvnValid = isValid;
            } catch {
                dvnValid = false;
            }
        }

        require(dvnValid, "DVN validation failed");
        emit DVNValidationCompleted(keccak256(_message), hubSpokeMsg.sourceChain, dvnValid, block.timestamp);

        // Process message based on type
        uint8 msgType = hubSpokeMsg.msgType;
        
        if (msgType == OVaultUtils.MSG_TYPE_HUB_DEPOSIT || msgType == OVaultUtils.MSG_TYPE_SPOKE_DEPOSIT) {
            _processHubSpokeDeposit(hubSpokeMsg);
        } else if (msgType == OVaultUtils.MSG_TYPE_HUB_WITHDRAW || msgType == OVaultUtils.MSG_TYPE_SPOKE_WITHDRAW) {
            _processHubSpokeWithdraw(hubSpokeMsg);
        } else if (msgType == OVaultUtils.MSG_TYPE_AI_SYNC_HUB || msgType == OVaultUtils.MSG_TYPE_AI_SYNC_SPOKE) {
            _processAISync(hubSpokeMsg);
        }
    }

    function setComposer(address _composer) external onlyRole(ADMIN_ROLE) {
        require(_composer != address(0), "Invalid composer");
        composer = _composer;
        emit ComposerSet(_composer);
    }

    function composerDeposit(address user, uint256 amount, bytes32 txId, uint32 srcEid) external {
        require(msg.sender == composer, "not composer");
        require(!hubSpokeTransactions[txId], "Transaction already processed");
        hubSpokeTransactions[txId] = true;

        uint256 shares = convertToShares(amount);
        if (shares > 0) {
            _mint(user, shares);
            crossChainBalances[user] += amount;
        }

        if (isHubVault) {
            emit HubDepositReceived(txId, user, amount, shares, srcEid, block.timestamp);
        } else {
            emit SpokeDepositReceived(txId, user, amount, shares, srcEid, block.timestamp);
        }
    }

    function composerWithdraw(address user, uint256 amount, bytes32 txId, uint32 srcEid) external {
        require(msg.sender == composer, "not composer");
        require(!hubSpokeTransactions[txId], "Transaction already processed");
        hubSpokeTransactions[txId] = true;

        uint256 requiredShares = convertToShares(amount);
        require(balanceOf(user) >= requiredShares, "Insufficient balance");

        _burn(user, requiredShares);
        crossChainBalances[user] = crossChainBalances[user] >= amount ? crossChainBalances[user] - amount : 0;

        if (isHubVault) {
            emit HubDepositReceived(txId, user, amount, requiredShares, srcEid, block.timestamp);
        } else {
            emit SpokeDepositReceived(txId, user, amount, requiredShares, srcEid, block.timestamp);
        }
    }

    function composerAISync(bytes calldata aiMessage) external {
        require(msg.sender == composer, "not composer");
        OVaultUtils.HubSpokeMessage memory hubMsg = OVaultUtils.decodeHubSpokeMessage(aiMessage);
        _processAISync(hubMsg);
    }

    /**
     * @dev Process hub-and-spoke deposit
     */
    function _processHubSpokeDeposit(OVaultUtils.HubSpokeMessage memory _msg) internal {
        require(!hubSpokeTransactions[_msg.transactionId], "Transaction already processed");
        hubSpokeTransactions[_msg.transactionId] = true;

        // Calculate shares based on current exchange rate
        uint256 shares = convertToShares(_msg.amount);
        
        // Mint shares to user
        _mint(_msg.user, shares);
        
        // Update cross-chain balance tracking
        crossChainBalances[_msg.user] += _msg.amount;

        // Emit appropriate event
        if (isHubVault) {
            emit HubDepositReceived(_msg.transactionId, _msg.user, _msg.amount, shares, _msg.sourceChain, block.timestamp);
        } else {
            emit SpokeDepositReceived(_msg.transactionId, _msg.user, _msg.amount, shares, _msg.sourceChain, block.timestamp);
        }
    }

    /**
     * @dev Process hub-and-spoke withdraw
     */
    function _processHubSpokeWithdraw(OVaultUtils.HubSpokeMessage memory _msg) internal {
        require(!hubSpokeTransactions[_msg.transactionId], "Transaction already processed");
        hubSpokeTransactions[_msg.transactionId] = true;

        uint256 userShares = balanceOf(_msg.user);
        uint256 requiredShares = convertToShares(_msg.amount);
        
        require(userShares >= requiredShares, "Insufficient balance");

        // Burn shares and update tracking
        _burn(_msg.user, requiredShares);
        crossChainBalances[_msg.user] = crossChainBalances[_msg.user] >= _msg.amount ? 
            crossChainBalances[_msg.user] - _msg.amount : 0;

        // Emit appropriate event
        if (isHubVault) {
            emit HubDepositReceived(_msg.transactionId, _msg.user, _msg.amount, requiredShares, _msg.sourceChain, block.timestamp);
        } else {
            emit SpokeDepositReceived(_msg.transactionId, _msg.user, _msg.amount, requiredShares, _msg.sourceChain, block.timestamp);
        }
    }

    /**
     * @dev Process AI sync between hub and spokes
     */
    function _processAISync(OVaultUtils.HubSpokeMessage memory _msg) internal {
        // Decode AI recommendation data
        OVaultUtils.AIRecommendationData memory aiData = abi.decode(_msg.aiData, (OVaultUtils.AIRecommendationData));
        
        // Forward to strategy if available
        if (address(manixStrategy) != address(0)) {
            try manixStrategy.processAIRecommendation(
                aiData.confidence,
                aiData.action,
                aiData.expectedReturn
            ) {
                // Successfully processed
            } catch {
                // Log error but don't revert to maintain cross-chain flow
            }
        }

        // Emit appropriate sync event
        if (_msg.msgType == OVaultUtils.MSG_TYPE_AI_SYNC_HUB) {
            emit AIRecommendationHubSync(
                aiData.recommendationId,
                aiData.user,
                aiData.action,
                aiData.confidence,
                _msg.sourceChain,
                block.timestamp
            );
        } else {
            emit AIRecommendationSpokeSync(
                aiData.recommendationId,
                aiData.user,
                aiData.action,
                aiData.confidence,
                _msg.sourceChain,
                block.timestamp
            );
        }
    }

    /**
     * @dev Send AI recommendation sync between hub and spokes
     */
    function sendAISyncToChains(
        address _user,
        string memory _action,
        uint256 _confidence,
        uint256 _expectedReturn,
        uint32[] memory _targetChains,
        bytes memory _options
    ) external payable onlyRole(AI_ROLE) whenNotPaused {
        require(_confidence >= 7000, "Low confidence");

        bytes32 recommendationId = keccak256(
            abi.encodePacked(_user, _action, _confidence, block.timestamp)
        );

        for (uint256 i = 0; i < _targetChains.length; i++) {
            require(isSupportedChain[_targetChains[i]], "Unsupported target chain");
            
            SendParam memory sendParam = OVaultUtils.createAISyncParams(
                _targetChains[i],
                _user,
                _action,
                _confidence,
                _expectedReturn,
                recommendationId,
                isHubVault
            );
            
            sendParam.recipient = address(this); // Target vault address
            
            MessagingFee memory fee = quoteSend(sendParam, false);
            
            send{value: msg.value / _targetChains.length}(
                sendParam,
                fee,
                msg.sender
            );
        }
    }

    /**
     * @dev Process hub-spoke transaction for testing purposes
     */
    function processHubSpokeTransaction(bytes32 _transactionId) external onlyRole(ADMIN_ROLE) {
        require(!hubSpokeTransactions[_transactionId], "Transaction already processed");
        hubSpokeTransactions[_transactionId] = true;
    }

    // UUPS Upgrade

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
