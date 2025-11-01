// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ILayerZeroReceiver {
    function lzReceive(
        bytes32 _origin,
        uint32 _srcEid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable;
}
