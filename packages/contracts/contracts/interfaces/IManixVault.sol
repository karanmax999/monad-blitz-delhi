// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IVault.sol";
import "./IERC4626.sol";

/**
 * @title IManixVault
 * @dev Extended vault interface for MANI X AI specific functionality
 */
interface IManixVault is IVault, IERC4626 {
    event PerformanceFeeUpdated(uint256 oldFee, uint256 newFee);
    event ManagementFeeUpdated(uint256 oldFee, uint256 newFee);
    event EmergencyPause(address indexed caller, uint256 timestamp);
    event EmergencyUnpause(address indexed caller, uint256 timestamp);
    event VaultReinitialized(address indexed strategy, uint256 totalAssets);
    event HarvestExecuted(address indexed harvester, uint256 totalAssets, uint256 profit, uint256 timestamp);

    /**
     * @dev Returns the performance fee in basis points (e.g., 200 = 2%)
     */
    function performanceFee() external view returns (uint256);

    /**
     * @dev Returns the management fee in basis points
     */
    function managementFee() external view returns (uint256);

    /**
     * @dev Returns the last harvest timestamp
     */
    function lastHarvest() external view returns (uint256);

    /**
     * @dev Returns the total performance fees collected
     */
    function totalPerformanceFees() external view returns (uint256);

    /**
     * @dev Returns whether the vault is in emergency pause mode
     */
    function paused() external view returns (bool);

    /**
     * @dev Pauses the vault in case of emergency
     */
    function emergencyPause() external;

    /**
     * @dev Unpauses the vault after emergency
     */
    function emergencyUnpause() external;

    /**
     * @dev Performs harvest operation to collect rewards and reinvest
     */
    function harvest() external;

    /**
     * @dev Updates performance fee (admin only)
     */
    function setPerformanceFee(uint256 newFee) external;

    /**
     * @dev Updates management fee (admin only)
     */
    function setManagementFee(uint256 newFee) external;
}


