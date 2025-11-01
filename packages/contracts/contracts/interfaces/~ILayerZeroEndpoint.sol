// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ILayerZeroEndpoint {
    struct MessagingParams {
        uint32 dstEid;
        bytes32 receiver;
        bytes message;
        bytes options;
        bool payInLzToken;
    }

    struct MessagingReceipt {
        bytes32 guid;
        uint64 nonce;
        MessagingFee fee;
    }

    struct MessagingFee {
        uint256 nativeFee;
        uint256 lzTokenFee;
    }

    function quote(
        MessagingParams memory _params,
        address _sender
    ) external view returns (MessagingFee memory fee);

    function send(
        MessagingParams memory _params,
        address _refundAddress
    ) external payable returns (MessagingReceipt memory receipt);
}
