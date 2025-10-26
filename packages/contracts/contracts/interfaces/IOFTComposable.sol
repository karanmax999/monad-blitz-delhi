// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";

/**
 * @title IOFTComposable
 * @dev Interface for composable OFT functionality with ERC4626 vault
 */
interface IOFTComposable is IERC20, IERC20Metadata {
    struct OFTReceipt {
        bytes32 guid;
        uint64 nonce;
        bytes32 srcEid;
        bytes32 cteit;
    }

    struct SendParam {
        uint32 dstEid;
        uint256 amountLD;
        bytes32 extraOptions;
        bytes composeMsg;
        bytes oftCmd;
    }

    struct MessagingFee {
        uint256 nativeFee;
        uint256 lzTokenFee;
    }

    struct CreditObj {
        uint256 credit;
        uint256 rate;
        uint256 cap;
    }

    /**
     * @dev Send tokens cross-chain via OFT
     */
    function send(
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) external payable returns (MessagingFee memory, bytes memory);

    /**
     * @dev Quote the fee for cross-chain transfer
     */
    function quoteSend(
        SendParam calldata _sendParam,
        bool _payInLzToken
    ) external view returns (MessagingFee memory);

    /**
     * @dev Get the minimum amount for cross-chain transfer
     */
    function getMinAmount(uint256 _amountLD) external view returns (uint256 minAmountLD);

    /**
     * @dev Estimate fees for cross-chain transfer
     */
    function estimateSendFee(
        uint32 _dstEid,
        bytes32 _toEid,
        uint256 _amountLD,
        bool _useZro,
        bytes calldata _adapterParams
    ) external view returns (uint256 nativeFee, uint256 lzTokenFee);

    /**
     * @dev Receive OFT tokens
     */
    function lzReceive(
        bytes32 _origin,
        uint32 _srcEid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable;

    event SendToChain(
        uint32 indexed dstEid,
        bytes32 indexed to,
        uint256 indexed amountLD
    );

    event ReceiveFromChain(
        uint32 indexed srcEid,
        bytes32 indexed to,
        uint256 indexed amountLD
    );
}
