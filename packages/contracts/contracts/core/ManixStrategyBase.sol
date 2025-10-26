// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/IManixStrategy.sol";
import "../interfaces/IManixVault.sol";
import "../interfaces/ILayerZeroReceiver.sol";
import "../libraries/LayerZeroUtils.sol";

/**
 * @title ManixStrategyBase
 * @dev Base strategy contract with AI integration capabilities
 */
abstract contract ManixStrategyBase is 
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IManixStrategy,
    ILayerZeroReceiver
{
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant AI_ROLE = keccak256("AI_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    // Core state variables
    IERC20 public want;
    IManixVault public vault;
    
    // Risk management
    uint256 public maxDrawdown;
    uint256 public maxVolatility;
    uint256 public rebalanceThreshold;
    bool public autoCompoundEnabled;
    
    // AI integration
    uint256 public lastConfidence;
    string public lastAction;
    uint256 public lastAIUpdate;
    
    // LayerZero cross-chain state
    mapping(uint32 => bytes) public trustedRemoteLookup;
    mapping(bytes32 => bool) public processedTransactions;
    
    uint256 private constant BASIS_POINTS = 10000;
    
    // Events
    event RiskParametersUpdated(uint256 maxDrawdown, uint256 maxVolatility, uint256 timestamp);
    event AIRecommendationUpdated(uint256 confidence, string action, uint256 timestamp);
    event RebalanceThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event AutoCompoundToggled(bool enabled, uint256 timestamp);
    event EmergencyWithdrawExecuted(uint256 amount, uint256 timestamp);

    // LayerZero Cross-Chain Strategy Events
    event CrossChainAIRecommendationReceived(
        uint32 sourceChain,
        address indexed user,
        string action,
        uint256 confidence,
        uint256 expectedReturn,
        bytes32 recommendationId
    );
    event CrossChainStrategySync(
        uint32 sourceChain,
        uint256 strategyAssets,
        uint256 apy,
        bytes32 strategyHash
    );
    event LayerZeroMessageReceivedStrategy(
        uint32 sourceChain,
        bytes32 origin,
        bytes message
    );

    modifier onlyVault() {
        require(msg.sender == address(vault), "Only vault");
        _;
    }

    modifier onlyAI() {
        require(hasRole(AI_ROLE, msg.sender), "Only AI");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the strategy
     */
    function initialize(
        address _want,
        address _vault,
        address _admin,
        uint256 _maxDrawdown,
        uint256 _maxVolatility
    ) external initializer {
        require(_want != address(0), "Invalid want token");
        require(_vault != address(0), "Invalid vault");
        require(_admin != address(0), "Invalid admin");

        __Pausable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        want = IERC20(_want);
        vault = IManixVault(_vault);
        
        maxDrawdown = _maxDrawdown;
        maxVolatility = _maxVolatility;
        rebalanceThreshold = 500; // 5% default
        autoCompoundEnabled = true;
        
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
        _setupRole(ADMIN_ROLE, _admin);
        _setupRole(VAULT_ROLE, _vault);

        // Approve vault to spend strategy tokens for deposits
        want.safeApprove(_vault, type(uint256).max);
    }

    // Abstract functions to be implemented by specific strategies

    function name() public pure virtual override returns (string memory);

    function estimatedReturn() public view virtual override returns (uint256);

    function balanceOf() public view virtual override returns (uint256);

    function harvest() public virtual override;

    // Standard strategy implementation

    function want() external view override returns (address) {
        return address(want);
    }

    function paused() public view override(PausableUpgradeable, IStrategy) returns (bool) {
        return PausableUpgradeable.paused();
    }

    function deposit(uint256 amount) external override onlyVault whenNotPaused {
        require(amount > 0, "Zero amount");
        _deposit(amount);
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external override onlyVault nonReentrant returns (uint256) {
        require(amount > 0, "Zero amount");
        
        uint256 available = want.balanceOf(address(this));
        uint256 toWithdraw = amount;
        
        if (available < amount) {
            toWithdraw = _withdrawFromProtocols(amount - available);
            available = want.balanceOf(address(this));
            toWithdraw = available < amount ? available : amount;
        }
        
        want.safeTransfer(address(vault), toWithdraw);
        return toWithdraw;
    }

    // Risk Management

    function setRiskParameters(uint256 _maxDrawdown, uint256 _maxVolatility) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        require(_maxDrawdown <= BASIS_POINTS, "Invalid max drawdown");
        require(_maxVolatility <= BASIS_POINTS * 10, "Invalid max volatility");
        
        maxDrawdown = _maxDrawdown;
        maxVolatility = _maxVolatility;
        
        emit RiskParametersUpdated(_maxDrawdown, _maxVolatility, block.timestamp);
    }

    function riskParameters() external view override returns (uint256, uint256) {
        return (maxDrawdown, maxVolatility);
    }

    // Threshold Management

    function setRebalanceThreshold(uint256 newThreshold) external override onlyRole(ADMIN_ROLE) {
        require(newThreshold <= BASIS_POINTS, "Invalid threshold");
        uint256 oldThreshold = rebalanceThreshold;
        rebalanceThreshold = newThreshold;
        emit RebalanceThresholdUpdated(oldThreshold, newThreshold);
    }

    function rebalanceThreshold() external view override returns (uint256) {
        return rebalanceThreshold;
    }

    // Auto-compound Management

    function setAutoCompound(bool enabled) external override onlyRole(ADMIN_ROLE) {
        autoCompoundEnabled = enabled;
        emit AutoCompoundToggled(enabled, block.timestamp);
    }

    function autoCompoundEnabled() external view override returns (bool) {
        return autoCompoundEnabled;
    }

    // AI Integration

    function processAIRecommendation(
        uint256 confidence,
        string calldata action,
        uint256 expectedReturn
    ) external override onlyAI whenNotPaused {
        require(confidence >= 7000, "Low confidence"); // 70% minimum
        require(bytes(action).length > 0, "Empty action");
        
        lastConfidence = confidence;
        lastAction = action;
        lastAIUpdate = block.timestamp;
        
        emit AIRecommendationUpdated(confidence, action, block.timestamp);
        
        // Execute AI recommendation based on action
        _executeAIRecommendation(action, expectedReturn, confidence);
    }

    function lastAIRecommendation() external view override returns (
        uint256,
        string memory,
        uint256
    ) {
        return (lastConfidence, lastAction, lastAIUpdate);
    }

    // Emergency Functions

    function emergencyWithdraw() external override onlyRole(ADMIN_ROLE) {
        uint256 totalBalance = balanceOf();
        if (totalBalance > 0) {
            _emergencyWithdrawFromProtocols();
        }
        
        uint256 finalBalance = want.balanceOf(address(this));
        if (finalBalance > 0) {
            want.safeTransfer(address(vault), finalBalance);
        }
        
        emit EmergencyWithdrawExecuted(finalBalance, block.timestamp);
    }

    function pause() external override onlyRole(ADMIN_ROLE) {
        _pause();
        emit StrategyPaused();
    }

    function unpause() external override onlyRole(ADMIN_ROLE) {
        _unpause();
        emit StrategyUnpaused();
    }

    // Internal functions to be implemented by specific strategies

    function _deposit(uint256 amount) internal virtual;

    function _withdrawFromProtocols(uint256 amount) internal virtual returns (uint256);

    function _executeAIRecommendation(string calldata action, uint256 expectedReturn, uint256 confidence) internal virtual;

    function _emergencyWithdrawFromProtocols() internal virtual;

    // LayerZero Cross-Chain Functions for Strategy

    /**
     * @dev Set trusted remote chain for cross-chain strategy operations
     */
    function setTrustedRemoteStrategy(uint32 _srcEid, bytes calldata _path) external onlyRole(ADMIN_ROLE) {
        trustedRemoteLookup[_srcEid] = _path;
    }

    /**
     * @dev LayerZero message receiver implementation for strategy
     */
    function lzReceive(
        bytes32 _origin,
        uint32 _srcEid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable override {
        require(trustedRemoteLookup[_srcEid].length > 0, "Source chain not trusted");

        emit LayerZeroMessageReceivedStrategy(_srcEid, _origin, _message);

        // Process cross-chain message
        _processCrossChainStrategyMessage(_srcEid, _message);
    }

    /**
     * @dev Process incoming cross-chain messages for strategy
     */
    function _processCrossChainStrategyMessage(uint32 _srcEid, bytes calldata _message) internal {
        uint8 messageType = uint8(_message[0]);

        if (messageType == LayerZeroUtils.MSG_TYPE_AI_RECOMMENDATION) {
            _handleCrossChainAIRecommendation(_srcEid, _message);
        } else if (messageType == LayerZeroUtils.MSG_TYPE_YIELD_SYNC) {
            _handleCrossChainStrategySync(_srcEid, _message);
        }
    }

    /**
     * @dev Handle cross-chain AI recommendation for strategy
     */
    function _handleCrossChainAIRecommendation(uint32 _srcEid, bytes calldata _message) internal {
        LayerZeroUtils.AIRecommendationMessage memory messageData = LayerZeroUtils.decodeAIRecommendationMessage(_message);
        
        require(!processedTransactions[messageData.recommendationId], "Recommendation already processed");
        processedTransactions[messageData.recommendationId] = true;

        // Update AI recommendation state
        lastConfidence = messageData.confidence;
        lastAction = messageData.action;
        lastAIUpdate = block.timestamp;

        emit AIRecommendationUpdated(messageData.confidence, messageData.action, block.timestamp);

        // Execute AI recommendation if confidence is sufficient
        if (messageData.confidence >= 7000) {
            _executeAIRecommendation(
                messageData.action,
                messageData.expectedReturn,
                messageData.confidence
            );
        }

        emit CrossChainAIRecommendationReceived(
            _srcEid,
            messageData.user,
            messageData.action,
            messageData.confidence,
            messageData.expectedReturn,
            messageData.recommendationId
        );
    }

    /**
     * @dev Handle cross-chain strategy synchronization
     */
    function _handleCrossChainStrategySync(uint32 _srcEid, bytes calldata _message) internal {
        LayerZeroUtils.YieldSyncMessage memory messageData = LayerZeroUtils.decodeYieldSyncMessage(_message);
        
        // Update strategy state based on cross-chain sync
        // This allows strategies to coordinate across chains
        _processCrossChainStrategyUpdate(
            messageData.totalAssets,
            messageData.totalShares,
            messageData.apy,
            messageData.strategyHash
        );

        emit CrossChainStrategySync(
            _srcEid,
            messageData.totalAssets,
            messageData.apy,
            messageData.strategyHash
        );
    }

    /**
     * @dev Process cross-chain strategy updates - to be implemented by specific strategies
     */
    function _processCrossChainStrategyUpdate(
        uint256 _totalAssets,
        uint256 _totalShares,
        uint256 _apy,
        bytes32 _strategyHash
    ) internal virtual {
        // Default implementation - specific strategies can override
        // This could trigger rebalancing, parameter updates, etc.
    }

    // UUPS Upgrade

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // View functions

    function getStrategyInfo() external view returns (
        string memory strategyName,
        address wantToken,
        address vaultAddress,
        uint256 balance,
        uint256 estimatedAPR,
        uint256 lastHarvest,
        bool isPaused,
        bool autoCompound,
        uint256 confidence
    ) {
        return (
            name(),
            address(want),
            address(vault),
            balanceOf(),
            estimatedReturn(),
            0, // Would be implemented per strategy
            paused(),
            autoCompoundEnabled,
            lastConfidence
        );
    }
}


