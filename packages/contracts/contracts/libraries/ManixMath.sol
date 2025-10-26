// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ManixMath
 * @dev Mathematical utilities for MANI X AI contracts
 */
library ManixMath {
    uint256 constant BASIS_POINTS = 10000;
    uint256 constant MAX_FEE = 2500; // 25% maximum fee

    /**
     * @dev Calculates percentage of amount with basis points precision
     * @param amount The base amount
     * @param basisPoints The percentage in basis points (e.g., 200 = 2%)
     */
    function calculatePercentage(uint256 amount, uint256 basisPoints) 
        internal 
        pure 
        returns (uint256) 
    {
        require(basisPoints <= BASIS_POINTS, "Invalid basis points");
        return (amount * basisPoints) / BASIS_POINTS;
    }

    /**
     * @dev Calculates compound interest over time
     * @param principal Initial amount
     * @param rate Annual interest rate (in basis points)
     * @param time Elapsed time in seconds
     */
    function compoundInterest(
        uint256 principal,
        uint256 rate,
        uint256 time
    ) internal pure returns (uint256) {
        if (time == 0 || rate == 0) return principal;
        
        // Simplified compound interest calculation
        // For production, consider using more precise calculations
        uint256 timeYears = time / 365 days;
        return principal + calculatePercentage(principal, rate * timeYears);
    }

    /**
     * @dev Calculates shares from assets with proper rounding
     * @param assets Amount of assets
     * @param totalAssets Total assets in vault
     * @param totalShares Total shares in vault
     */
    function calculateShares(
        uint256 assets,
        uint256 totalAssets,
        uint256 totalShares
    ) internal pure returns (uint256) {
        if (totalShares == 0) {
            return assets;
        }
        
        // Round up to avoid precision loss
        return (assets * totalShares + totalAssets - 1) / totalAssets;
    }

    /**
     * @dev Calculates assets from shares with proper rounding
     * @param shares Amount of shares
     * @param totalAssets Total assets in vault
     * @param totalShares Total shares in vault
     */
    function calculateAssets(
        uint256 shares,
        uint256 totalAssets,
        uint256 totalShares
    ) internal pure returns (uint256) {
        if (totalShares == 0) {
            return 0;
        }
        
        return (shares * totalAssets) / totalShares;
    }

    /**
     * @dev Validates fee is within acceptable range
     */
    function validateFee(uint256 fee) internal pure {
        require(fee <= MAX_FEE, "Fee too high");
    }
}


