// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../core/ManixStrategyBase.sol";

// Example interfaces for DeFi protocols
interface IERC20Extended is IERC20 {
    function mint(uint256 amount) external;
    function burn(uint256 amount) external;
}

interface IYieldProtocol {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function claimRewards() external;
    function getRewardTokens() external view returns (address[] memory);
    function getStakedAmount(address user) external view returns (uint256);
}

/**
 * @title YieldFarmingStrategy
 * @dev AI-optimized yield farming strategy with automated rebalancing
 */
contract YieldFarmingStrategy is ManixStrategyBase {
    using SafeERC20 for IERC20;

    // Protocol integrations
    IYieldProtocol public yieldProtocol;
    IERC20[] public rewardTokens;
    mapping(address => bool) public isRewardToken;

    // Performance tracking
    uint256 public lastProtocolBalance;
    uint256 public totalRewardsClaimed;

    // Events
    event ProtocolUpdated(address indexed oldProtocol, address indexed newProtocol);
    event RewardsClaimed(address indexed token, uint256 amount, uint256 timestamp);
    event RebalanceExecuted(uint256 oldBalance, uint256 newBalance, uint256 timestamp);

    function initialize(
        address _want,
        address _vault,
        address _admin,
        address _yieldProtocol,
        address[] calldata _rewardTokens,
        uint256 _maxDrawdown,
        uint256 _maxVolatility
    ) external initializer {
        require(_yieldProtocol != address(0), "Invalid protocol");
        
        __ManixStrategyBase_init(_want, _vault, _admin, _maxDrawdown, _maxVolatility);
        
        yieldProtocol = IYieldProtocol(_yieldProtocol);
        
        // Initialize reward tokens
        for (uint256 i = 0; i < _rewardTokens.length; i++) {
            rewardTokens.push(IERC20(_rewardTokens[i]));
            isRewardToken[_rewardTokens[i]] = true;
        }
        
        // Approve yield protocol to spend want tokens
        want.safeApprove(_yieldProtocol, type(uint256).max);
        
        lastProtocolBalance = 0;
    }

    function name() public pure override returns (string memory) {
        return "MANI X AI Yield Farming Strategy";
    }

    function balanceOf() public view override returns (uint256) {
        if (address(yieldProtocol) == address(0)) {
            return want.balanceOf(address(this));
        }
        
        uint256 protocolBalance = yieldProtocol.getStakedAmount(address(this));
        uint256 contractBalance = want.balanceOf(address(this));
        
        return protocolBalance + contractBalance;
    }

    function estimatedReturn() public view override returns (uint256) {
        // This would be calculated based on current APRs from the yield protocol
        // For now, returning a placeholder value
        return 1500; // 15% APR in basis points
    }

    function harvest() public override onlyVault whenNotPaused {
        if (address(yieldProtocol) == address(0)) {
            return;
        }

        uint256 totalBalanceBefore = balanceOf();
        
        // Claim rewards from protocol
        yieldProtocol.claimRewards();
        
        // Process reward tokens
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            IERC20 rewardToken = rewardTokens[i];
            uint256 rewardBalance = rewardToken.balanceOf(address(this));
            
            if (rewardBalance > 0) {
                totalRewardsClaimed += rewardBalance;
                
                // If reward token is the same as want token, keep it
                if (address(rewardToken) == address(want)) {
                    continue;
                }
                
                // For other reward tokens, sell them for want token
                // This is a simplified example - in production, use proper DEX integration
                _swapRewardToWant(address(rewardToken), rewardBalance);
                
                emit RewardsClaimed(address(rewardToken), rewardBalance, block.timestamp);
            }
        }
        
        // If auto-compound is enabled, reinvest immediately
        if (autoCompoundEnabled) {
            uint256 available = want.balanceOf(address(this));
            if (available > 0) {
                _deposit(available);
            }
        }
        
        uint256 totalBalanceAfter = balanceOf();
        
        emit HarvestExecuted(msg.sender, totalBalanceAfter, totalBalanceAfter - totalBalanceBefore, block.timestamp);
    }

    function _deposit(uint256 amount) internal override {
        if (address(yieldProtocol) != address(0) && amount > 0) {
            yieldProtocol.deposit(amount);
            lastProtocolBalance = yieldProtocol.getStakedAmount(address(this));
        }
    }

    function _withdrawFromProtocols(uint256 amount) internal override returns (uint256) {
        if (address(yieldProtocol) == address(0)) {
            return 0;
        }
        
        uint256 currentBalance = want.balanceOf(address(this));
        if (currentBalance >= amount) {
            return 0;
        }
        
        uint256 neededFromProtocol = amount - currentBalance;
        uint256 protocolBalance = yieldProtocol.getStakedAmount(address(this));
        
        if (neededFromProtocol > protocolBalance) {
            neededFromProtocol = protocolBalance;
        }
        
        if (neededFromProtocol > 0) {
            yieldProtocol.withdraw(neededFromProtocol);
            lastProtocolBalance = yieldProtocol.getStakedAmount(address(this));
        }
        
        return neededFromProtocol;
    }

    function _executeAIRecommendation(
        string calldata action,
        uint256 expectedReturn,
        uint256 confidence
    ) internal override {
        // Parse AI action and execute accordingly
        if (keccak256(bytes(action)) == keccak256(bytes("REBALANCE"))) {
            _executeRebalance();
        } else if (keccak256(bytes(action)) == keccak256(bytes("HARVEST"))) {
            harvest();
        } else if (keccak256(bytes(action)) == keccak256(bytes("INCREASE_ALLOCATION"))) {
            _increaseAllocation();
        } else if (keccak256(bytes(action)) == keccak256(bytes("DECREASE_ALLOCATION"))) {
            _decreaseAllocation();
        }
    }

    function _emergencyWithdrawFromProtocols() internal override {
        if (address(yieldProtocol) != address(0)) {
            uint256 protocolBalance = yieldProtocol.getStakedAmount(address(this));
            if (protocolBalance > 0) {
                yieldProtocol.withdraw(protocolBalance);
            }
        }
        
        lastProtocolBalance = 0;
    }

    // Internal helper functions

    function _swapRewardToWant(address rewardToken, uint256 amount) internal {
        // Placeholder for DEX integration
        // In production, integrate with Uniswap, SushiSwap, etc.
        // This is where you'd implement the actual swap logic
    }

    function _executeRebalance() internal {
        uint256 currentBalance = balanceOf();
        if (lastProtocolBalance > 0) {
            // Calculate if rebalancing is needed based on threshold
            uint256 balanceChange = currentBalance > lastProtocolBalance 
                ? currentBalance - lastProtocolBalance 
                : lastProtocolBalance - currentBalance;
                
            uint256 changePercent = (balanceChange * 10000) / lastProtocolBalance;
            
            if (changePercent > rebalanceThreshold) {
                // Execute rebalancing logic
                emit RebalanceExecuted(lastProtocolBalance, currentBalance, block.timestamp);
            }
        }
    }

    function _increaseAllocation() internal {
        uint256 available = want.balanceOf(address(this));
        if (available > 0 && address(yieldProtocol) != address(0)) {
            _deposit(available);
        }
    }

    function _decreaseAllocation() internal {
        if (address(yieldProtocol) != address(0)) {
            uint256 protocolBalance = yieldProtocol.getStakedAmount(address(this));
            uint256 withdrawAmount = protocolBalance / 4; // Withdraw 25%
            
            if (withdrawAmount > 0) {
                _withdrawFromProtocols(withdrawAmount);
            }
        }
    }

    // Admin functions

    function updateProtocol(address newProtocol) external onlyRole(ADMIN_ROLE) {
        require(newProtocol != address(0), "Invalid protocol");
        
        // Withdraw from old protocol first
        if (address(yieldProtocol) != address(0)) {
            _emergencyWithdrawFromProtocols();
            want.safeApprove(address(yieldProtocol), 0);
        }
        
        address oldProtocol = address(yieldProtocol);
        yieldProtocol = IYieldProtocol(newProtocol);
        
        // Approve new protocol
        want.safeApprove(newProtocol, type(uint256).max);
        
        emit ProtocolUpdated(oldProtocol, newProtocol);
    }

    function addRewardToken(address token) external onlyRole(ADMIN_ROLE) {
        require(token != address(0), "Invalid token");
        require(!isRewardToken[token], "Token already added");
        
        rewardTokens.push(IERC20(token));
        isRewardToken[token] = true;
    }

    // View functions

    function getRewardTokens() external view returns (address[] memory) {
        address[] memory tokens = new address[](rewardTokens.length);
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            tokens[i] = address(rewardTokens[i]);
        }
        return tokens;
    }

    function getProtocolInfo() external view returns (
        address protocolAddress,
        uint256 stakedAmount,
        uint256 contractBalance,
        uint256 totalRewards,
        bool isActive
    ) {
        uint256 staked = address(yieldProtocol) != address(0) 
            ? yieldProtocol.getStakedAmount(address(this)) 
            : 0;
            
        return (
            address(yieldProtocol),
            staked,
            want.balanceOf(address(this)),
            totalRewardsClaimed,
            address(yieldProtocol) != address(0)
        );
    }
}


