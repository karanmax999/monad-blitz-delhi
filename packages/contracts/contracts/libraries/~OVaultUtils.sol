// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IOVaultComposer.sol";
import "../interfaces/IDVNValidator.sol";

/**
 * @title OVaultUtils
 * @dev Utility functions for LayerZero OVault Composer operations
 */
library OVaultUtils {
    // Hub and spoke configuration
    uint32 public constant MONAD_CHAIN_ID = 123456789; // Monad as hub
    uint32 public constant ETHEREUM_CHAIN_ID = 1;
    uint32 public constant POLYGON_CHAIN_ID = 137;
    uint32 public constant ARBITRUM_CHAIN_ID = 42161;
    uint32 public constant BSC_CHAIN_ID = 56;

    // DVN configuration
    bytes32 public constant DVN_POLYGON = keccak256("DVN_POLYGON");
    bytes32 public constant DVN_ARBITRUM = keccak256("DVN_ARBITRUM");
    bytes32 public constant DVN_GUARDIAN = keccak256("DVN_GUARDIAN");

    // Message types for hub-and-spoke communication
    uint8 public constant MSG_TYPE_HUB_DEPOSIT = 10;
    uint8 public constant MSG_TYPE_HUB_WITHDRAW = 11;
    uint8 public constant MSG_TYPE_SPOKE_DEPOSIT = 12;
    uint8 public constant MSG_TYPE_SPOKE_WITHDRAW = 13;
    uint8 public constant MSG_TYPE_AI_SYNC_HUB = 14;
    uint8 public constant MSG_TYPE_AI_SYNC_SPOKE = 15;
    uint8 public constant MSG_TYPE_YIELD_SYNC = 16;

    struct HubSpokeMessage {
        uint8 msgType;
        bytes32 transactionId;
        address user;
        uint256 amount;
        uint256 shares;
        uint32 sourceChain;
        uint32 targetChain;
        bytes aiData;
    }

    struct AIRecommendationData {
        address user;
        string action;
        uint256 confidence;
        uint256 expectedReturn;
        bytes32 recommendationId;
        uint32 hubChainId;
    }

    /**
     * @dev Create OVault send parameters for hub-and-spoke deposits
     */
    function createHubDepositParams(
        uint32 _dstEid,
        uint256 _amountLD,
        address _recipient,
        bytes32 _transactionId,
        address _user
    ) internal pure returns (IOVaultComposer.SendParam memory) {
        HubSpokeMessage memory message = HubSpokeMessage({
            msgType: MSG_TYPE_HUB_DEPOSIT,
            transactionId: _transactionId,
            user: _user,
            amount: _amountLD,
            shares: 0, // shares will be calculated on destination
            sourceChain: uint32(0), // source chain
            targetChain: _dstEid,
            aiData: ""
        });
        
        bytes memory composeMsg = abi.encode(message);

        return IOVaultComposer.SendParam({
            dstEid: _dstEid,
            amountLD: _amountLD,
            recipient: _recipient,
            refundTo: _user,
            composeMsg: composeMsg,
            oftCmd: ""
        });
    }

    /**
     * @dev Create OVault send parameters for spoke deposits
     */
    function createSpokeDepositParams(
        uint32 _hubEid,
        uint256 _amountLD,
        address _recipient,
        bytes32 _transactionId,
        address _user,
        uint32 _sourceChain
    ) internal pure returns (IOVaultComposer.SendParam memory) {
        HubSpokeMessage memory message = HubSpokeMessage({
            msgType: MSG_TYPE_SPOKE_DEPOSIT,
            transactionId: _transactionId,
            user: _user,
            amount: _amountLD,
            shares: 0, // shares will be calculated on hub
            sourceChain: _sourceChain,
            targetChain: _hubEid,
            aiData: ""
        });
        
        bytes memory composeMsg = abi.encode(message);

        return IOVaultComposer.SendParam({
            dstEid: _hubEid,
            amountLD: _amountLD,
            recipient: _recipient,
            refundTo: _user,
            composeMsg: composeMsg,
            oftCmd: ""
        });
    }

    /**
     * @dev Create AI recommendation sync parameters
     */
    function createAISyncParams(
        uint32 _dstEid,
        address _user,
        string memory _action,
        uint256 _confidence,
        uint256 _expectedReturn,
        bytes32 _recommendationId,
        bool _isFromHub
    ) internal pure returns (IOVaultComposer.SendParam memory) {
        AIRecommendationData memory aiData = AIRecommendationData({
            user: _user,
            action: _action,
            confidence: _confidence,
            expectedReturn: _expectedReturn,
            recommendationId: _recommendationId,
            hubChainId: MONAD_CHAIN_ID
        });

        HubSpokeMessage memory message = HubSpokeMessage({
            msgType: _isFromHub ? MSG_TYPE_AI_SYNC_HUB : MSG_TYPE_AI_SYNC_SPOKE,
            transactionId: bytes32(0), // transactionId
            user: _user,
            amount: 0, // amount
            shares: 0, // shares
            sourceChain: uint32(0), // source chain
            targetChain: _dstEid,
            aiData: abi.encode(aiData)
        });
        
        bytes memory composeMsg = abi.encode(message);

        return IOVaultComposer.SendParam({
            dstEid: _dstEid,
            amountLD: 0, // AI sync doesn't transfer tokens
            recipient: address(0), // Will be set to vault address
            refundTo: _user,
            composeMsg: composeMsg,
            oftCmd: ""
        });
    }

    /**
     * @dev Decode hub-and-spoke message
     */
    function decodeHubSpokeMessage(bytes calldata _message) 
        internal 
        pure 
        returns (HubSpokeMessage memory) 
    {
        return abi.decode(_message, (HubSpokeMessage));
    }

    /**
     * @dev Check if chain is a hub (Monad)
     */
    function isHubChain(uint32 _chainId) internal pure returns (bool) {
        return _chainId == MONAD_CHAIN_ID;
    }

    /**
     * @dev Check if chain is a spoke
     */
    function isSpokeChain(uint32 _chainId) internal pure returns (bool) {
        return _chainId == ETHEREUM_CHAIN_ID || 
               _chainId == POLYGON_CHAIN_ID || 
               _chainId == ARBITRUM_CHAIN_ID || 
               _chainId == BSC_CHAIN_ID;
    }

    /**
     * @dev Create DVN options for specific chain
     */
    function createDVNOptions(
        uint32 _dstEid,
        bool _useGuardianDVN
    ) internal pure returns (bytes memory) {
        IDVNValidator.DVNOptions memory dvnOptions;
        
        if (_useGuardianDVN) {
            dvnOptions = IDVNValidator.DVNOptions({
                gas: 200000,
                multiplier: 120, // 1.2x base fee
                pricePerGas: 0
            });
        } else {
            // Chain-specific DVN configuration
            if (_dstEid == POLYGON_CHAIN_ID) {
                dvnOptions = IDVNValidator.DVNOptions({
                    gas: 150000,
                    multiplier: 110, // 1.1x base fee
                    pricePerGas: 0
                });
            } else if (_dstEid == ARBITRUM_CHAIN_ID) {
                dvnOptions = IDVNValidator.DVNOptions({
                    gas: 180000,
                    multiplier: 115, // 1.15x base fee
                    pricePerGas: 0
                });
            } else {
                dvnOptions = IDVNValidator.DVNOptions({
                    gas: 200000,
                    multiplier: 120, // 1.2x base fee
                    pricePerGas: 0
                });
            }
        }

        return abi.encode(dvnOptions, DVN_POLYGON, _dstEid);
    }

    /**
     * @dev Generate unique transaction ID for hub-and-spoke operations
     */
    function generateTransactionId(
        address _user,
        uint32 _srcChain,
        uint32 _dstChain,
        uint256 _amount,
        uint8 _msgType
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                _user,
                _srcChain,
                _dstChain,
                _amount,
                _msgType,
                block.timestamp,
                block.number
            )
        );
    }

    /**
     * @dev Validate DVN proof for cross-chain message
     */
    function validateDVNProof(
        bytes32 _messageHash,
        bytes calldata _dvnProof,
        uint32 _srcEid
    ) internal pure returns (bool) {
        // This would integrate with actual DVN validation
        // For now, return true for valid proof format
        return _dvnProof.length > 0 && _messageHash != bytes32(0);
    }
}
