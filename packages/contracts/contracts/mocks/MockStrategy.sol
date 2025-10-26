// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IStrategy.sol";

/**
 * @title MockStrategy
 * @dev Mock strategy contract for testing
 */
contract MockStrategy is IStrategy, Ownable {
    IERC20 public want;
    
    uint256 private _balance;
    bool private _paused;
    string private _strategyName;

    constructor(address _want) {
        want = IERC20(_want);
        _strategyName = "Mock Strategy";
        _paused = false;
    }

    function name() external pure override returns (string memory) {
        return "Mock Strategy";
    }

    function estimatedReturn() external pure override returns (uint256) {
        return 1000; // 10% APR
    }

    function balanceOf() external view override returns (uint256) {
        return _balance;
    }

    function want() external view override returns (address) {
        return address(want);
    }

    function paused() external view override returns (bool) {
        return _paused;
    }

    function deposit(uint256 amount) external override onlyOwner {
        require(amount > 0, "Zero amount");
        _balance += amount;
        
        // Simulate some growth over time
        _balance = _balance + (amount / 1000); // 0.1% immediate growth
        
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external override onlyOwner {
        require(amount > 0, "Zero amount");
        require(_balance >= amount, "Insufficient balance");
        
        _balance -= amount;
        emit Withdrawn(msg.sender, amount);
    }

    function harvest() external override onlyOwner {
        // Simulate harvest with some profit
        uint256 profit = _balance / 100; // 1% profit
        _balance += profit;
        
        emit Harvested(profit, block.timestamp);
    }

    function pause() external override onlyOwner {
        _paused = true;
        emit StrategyPaused();
    }

    function unpause() external override onlyOwner {
        _paused = false;
        emit StrategyUnpaused();
    }

    // Test helper functions
    function setBalance(uint256 newBalance) external onlyOwner {
        _balance = newBalance;
    }
}


