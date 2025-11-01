// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IOVaultComposer
 * @dev Interface for LayerZero OVault Composer functionality
 */
interface IOVaultComposer {
    struct SendParam {
        uint32 dstEid;
        uint256 amountLD;
        address recipient;
        address refundTo;
        bytes composeMsg;
        bytes oftCmd;
    }

    struct MessagingFee {
        uint256 nativeFee;
        uint256 lzTokenFee;
    }

    struct LzCall {
        address sender;
        uint32 srcEid;
        bytes message;
        bytes extraData;
        address paymaster;
    }

    /**
     * @dev Send assets to another chain
     */
    function send(
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) external payable returns (MessagingFee memory, bytes memory);

    /**
     * @dev Quote the fee for sending assets cross-chain
     */
    function quoteSend(
        SendParam calldata _sendParam,
        bool _payInLzToken
    ) external view returns (MessagingFee memory);

    /**
     * @dev Receive assets from another chain
     */
    function lzCompose(
        address _from,
        address _to,
        bytes32 _guid,
        bytes calldata _message
    ) external payable;
}
