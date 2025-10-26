// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/ILayerZeroEndpoint.sol";
import "../interfaces/ILayerZeroDVN.sol";

/**
 * @title LayerZeroUtils
 * @dev Utility functions for LayerZero cross-chain operations
 */
library LayerZeroUtils {
    // Message types for cross-chain communication
    uint8 public constant MSG_TYPE_CROSS_CHAIN_DEPOSIT = 1;
    uint8 public constant MSG_TYPE_CROSS_CHAIN_WITHDRAW = 2;
    uint8 public constant MSG_TYPE_YIELD_SYNC = 3;
    uint8 public constant MSG_TYPE_AI_RECOMMENDATION = 4;
    uint8 public constant MSG_TYPE_REBALANCE_UPDATE = 5;
    uint8 public constant MSG_TYPE_STATE_SYNC = 6;

    // Error codes
    uint8 public constant ERROR_NONE = 0;
    uint8 public constant ERROR_INVALID_SOURCE = 1;
    uint8 public constant ERROR_INVALID_AMOUNT = 2;
    uint8 public constant ERROR_INVALID_USER = 3;
    uint8 public constant ERROR_INSUFFICIENT_BALANCE = 4;
    uint8 public constant ERROR_STRATEGY_FAILED = 5;

    struct CrossChainMessage {
        uint8 msgType;
        bytes32 transactionId;
        address user;
        uint256 amount;
        uint32 targetChain;
        address targetVault;
        bytes data;
    }

    struct YieldSyncMessage {
        uint8 msgType;
        uint256 totalAssets;
        uint256 totalShares;
        uint256 apy;
        uint256 timestamp;
        bytes32 strategyHash;
    }

    struct AIRecommendationMessage {
        uint8 msgType;
        address user;
        string action;
        uint256 confidence;
        uint256 expectedReturn;
        bytes32 recommendationId;
    }

    /**
     * @dev Encodes a cross-chain deposit message
     */
    function encodeCrossChainDeposit(
        bytes32 _transactionId,
        address _user,
        uint256 _amount,
        uint32 _targetChain,
        address _targetVault
    ) internal pure returns (bytes memory) {
        CrossChainMessage memory message = CrossChainMessage({
            msgType: MSG_TYPE_CROSS_CHAIN_DEPOSIT,
            transactionId: _transactionId,
            user: _user,
            amount: _amount,
            targetChain: _targetChain,
            targetVault: _targetVault,
            data: ""
        });
        
        return abi.encode(message);
    }

    /**
     * @dev Encodes a cross-chain withdraw message
     */
    function encodeCrossChainWithdraw(
        bytes32 _transactionId,
        address _user,
        uint256 _amount,
        uint32 _targetChain,
        address _targetVault
    ) internal pure returns (bytes memory) {
        CrossChainMessage memory message = CrossChainMessage({
            msgType: MSG_TYPE_CROSS_CHAIN_WITHDRAW,
            transactionId: _transactionId,
            user: _user,
            amount: _amount,
            targetChain: _targetChain,
            targetVault: _targetVault,
            data: ""
        });
        
        return abi.encode(message);
    }

    /**
     * @dev Encodes a yield synchronization message
     */
    function encodeYieldSync(
        uint256 _totalAssets,
        uint256 _totalShares,
        uint256 _apy,
        bytes32 _strategyHash
    ) internal pure returns (bytes memory) {
        YieldSyncMessage memory message = YieldSyncMessage({
            msgType: MSG_TYPE_YIELD_SYNC,
            totalAssets: _totalAssets,
            totalShares: _totalShares,
            apy: _apy,
            timestamp: block.timestamp,
            strategyHash: _strategyHash
        });
        
        return abi.encode(message);
    }

    /**
     * @dev Encodes an AI recommendation message
     */
    function encodeAIRecommendation(
        address _user,
        string memory _action,
        uint256 _confidence,
        uint256 _expectedReturn,
        bytes32 _recommendationId
    ) internal pure returns (bytes memory) {
        AIRecommendationMessage memory message = AIRecommendationMessage({
            msgType: MSG_TYPE_AI_RECOMMENDATION,
            user: _user,
            action: _action,
            confidence: _confidence,
            expectedReturn: _expectedReturn,
            recommendationId: _recommendationId
        });
        
        return abi.encode(message);
    }

    /**
     * @dev Decodes a cross-chain message
     */
    function decodeCrossChainMessage(bytes memory _data) 
        internal 
        pure 
        returns (CrossChainMessage memory) 
    {
        return abi.decode(_data, (CrossChainMessage));
    }

    /**
     * @dev Decodes a yield sync message
     */
    function decodeYieldSyncMessage(bytes memory _data) 
        internal 
        pure 
        returns (YieldSyncMessage memory) 
    {
        return abi.decode(_data, (YieldSyncMessage));
    }

    /**
     * @dev Decodes an AI recommendation message
     */
    function decodeAIRecommendationMessage(bytes memory _data) 
        internal 
        pure 
        returns (AIRecommendationMessage memory) 
    {
        return abi.decode(_data, (AIRecommendationMessage));
    }

    /**
     * @dev Verifies message integrity and source chain
     */
    function verifyMessageIntegrity(
        bytes32 _origin,
        uint32 _srcEid,
        bytes memory _message
    ) internal pure returns (bool) {
        // Basic validation - in production, add cryptographic verification
        return _origin != bytes32(0) && _srcEid != 0 && _message.length > 0;
    }

    /**
     * @dev Creates LayerZero messaging options with DVN configuration
     */
    function createLzOptions(
        uint32 _gasLimit,
        bytes memory _dvnConfig
    ) internal pure returns (bytes memory) {
        // Standard LayerZero options format
        // This would be configured based on your DVN setup
        return abi.encodePacked(_gasLimit, _dvnConfig);
    }
}
