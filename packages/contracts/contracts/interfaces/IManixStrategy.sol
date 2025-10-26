// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IStrategy.sol";

/**
 * @title IManixStrategy
 * @dev Extended strategy interface for MANI X AI with AI-specific functionality
 */
interface IManixStrategy is IStrategy {
    event RiskParametersUpdated(uint256 maxDrawdown, uint256 maxVolatility, uint256 timestamp);
    event AIRecommendationUpdated(uint256 confidence, string action, uint256 timestamp);
    event RebalanceThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event AutoCompoundToggled(bool enabled, uint256 timestamp);

    /**
     * @dev Returns the current risk parameters
     */
    function riskParameters() external view returns (uint256 maxDrawdown, uint256 maxVolatility);

    /**
     * @dev Returns the rebalance threshold in basis points
     */
    function rebalanceThreshold() external view returns (uint256);

    /**
     * @dev Returns whether auto-compound is enabled
     */
    function autoCompoundEnabled() external view returns (bool);

    /**
     * @dev Returns the last AI recommendation data
     */
    function lastAIRecommendation() external view returns (
        uint256 confidence,
        string memory action,
        uint256 timestamp
    );

    /**
     * @dev Updates risk parameters (admin only)
     */
    function setRiskParameters(uint256 maxDrawdown, uint256 maxVolatility) external;

    /**
     * @dev Updates rebalance threshold (admin only)
     */
    function setRebalanceThreshold(uint256 newThreshold) external;

    /**
     * @dev Toggles auto-compound feature
     */
    function setAutoCompound(bool enabled) external;

    /**
     * @dev Processes AI recommendation and executes if confident enough
     */
    function processAIRecommendation(
        uint256 confidence,
        string calldata action,
        uint256 expectedReturn
    ) external;

    /**
     * @dev Emergency withdraw all funds from strategy
     */
    function emergencyWithdraw() external;
}


