// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IStrategy {
    /**
     * @dev Returns the name of the strategy
     */
    function name() external pure returns (string memory);

    /**
     * @dev Returns the estimated APR for this strategy
     */
    function estimatedReturn() external view returns (uint256);

    /**
     * @dev Harvests rewards and compounds them back into the strategy
     */
    function harvest() external;

    /**
     * @dev Deposit tokens into the strategy
     * @param amount Amount of tokens to deposit
     */
    function deposit(uint256 amount) external;

    /**
     * @dev Withdraw tokens from the strategy
     * @param amount Amount of tokens to withdraw
     */
    function withdraw(uint256 amount) external;

    /**
     * @dev Returns the total value locked in the strategy
     */
    function balanceOf() external view returns (uint256);

    /**
     * @dev Returns the underlying asset address
     */
    function want() external view returns (address);

    /**
     * @dev Emergency function to pause the strategy
     */
    function pause() external;

    /**
     * @dev Resume the strategy after pause
     */
    function unpause() external;

    /**
     * @dev Returns whether the strategy is paused
     */
    function paused() external view returns (bool);

    event Harvested(uint256 amount, uint256 timestamp);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event StrategyPaused();
    event StrategyUnpaused();
}
