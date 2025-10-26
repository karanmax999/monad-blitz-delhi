// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/ILayerZeroEndpoint.sol";

/**
 * @title MockLayerZeroEndpoint
 * @dev Mock LayerZero endpoint for testing purposes
 */
contract MockLayerZeroEndpoint is ILayerZeroEndpoint {
    address public vault;
    
    struct MockMessagingParams {
        uint32 dstEid;
        bytes32 receiver;
        bytes message;
        bytes options;
        bool payInLzToken;
    }

    mapping(bytes32 => MockMessagingReceipt) public receipts;
    
    event MockMessageSent(
        address indexed sender,
        uint32 dstEid,
        bytes32 receiver,
        bytes message,
        uint256 value
    );

    function setVault(address _vault) external {
        vault = _vault;
    }

    function send(MessagingParams calldata _params, address _refundAddress) 
        external 
        payable 
        override 
        returns (MessagingReceipt memory receipt) 
    {
        require(msg.sender == vault, "Only vault can send messages");
        
        bytes32 receiptId = keccak256(
            abi.encodePacked(
                _params.dstEid,
                _params.receiver,
                _params.message,
                block.timestamp
            )
        );

        receipt = MessagingReceipt({
            guid: receiptId,
            nonce: uint64(block.timestamp),
            fee: MessagingFee({
                nativeFee: msg.value,
                lzTokenFee: 0
            })
        });

        receipts[receiptId] = receipt;

        emit MockMessageSent(
            msg.sender,
            _params.dstEid,
            _params.receiver,
            _params.message,
            msg.value
        );

        return receipt;
    }

    function quote(MessagingParams calldata _params, address _sender) 
        external 
        view 
        override 
        returns (MessagingFee memory fee) 
    {
        require(_sender != address(0), "Invalid sender");
        
        return MessagingFee({
            nativeFee: 0.001 ether, // Mock fee
            lzTokenFee: 0
        });
    }

    function getReceipt(bytes32 _receiptId) external view returns (MessagingReceipt memory) {
        return receipts[_receiptId];
    }
}
