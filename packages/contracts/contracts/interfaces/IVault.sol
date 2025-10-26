// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IVault {
    /**
     * @dev Deposits underlying tokens and mints vault shares to the caller
     * @param amount Amount of underlying tokens to deposit
     * @return shares Amount of vault shares minted
     */
    function deposit(uint256 amount) external returns (uint256 shares);

    /**
     * @dev Withdraws underlying tokens by burning vault shares
     * @param shares Amount of vault shares to burn
     * @return amount Amount of underlying tokens withdrawn
     */
    function withdraw(uint256 shares) external returns (uint256 amount);

    /**
     * @dev Returns the total value locked in the vault
     * @return Total assets managed by the vault
     */
    function totalAssets() external view returns (uint256);

    /**
     * @dev Returns the total supply of vault shares
     * @return Total shares minted
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Converts vault shares to underlying token amount
     * @param shares Amount of shares to convert
     * @return amount Equivalent amount of underlying tokens
     */
    function convertToAssets(uint256 shares) external view returns (uint256);

    /**
     * @dev Converts underlying token amount to vault shares
     * @param amount Amount of underlying tokens to convert
     * @return shares Equivalent amount of vault shares
     */
    function convertToShares(uint256 amount) external view returns (uint256);

    /**
     * @dev Returns the address of the underlying token
     */
    function asset() external view returns (address);

    /**
     * @dev Returns the current strategy address
     */
    function strategy() external view returns (address);

    /**
     * @dev Updates the strategy for the vault (only by owner)
     * @param newStrategy Address of the new strategy contract
     */
    function setStrategy(address newStrategy) external;

    event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
    event StrategyUpdated(address indexed oldStrategy, address indexed newStrategy);
}
