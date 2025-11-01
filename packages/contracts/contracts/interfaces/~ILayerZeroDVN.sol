// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ILayerZeroDVN {
    struct DVNOptions {
        uint32 gas;
        uint256 multiplier; // 10000 = 1x multiplier
    }

    function assign(bytes memory _options, uint32 _dstEid, uint32 _outboundProofType) external view returns (DVNOptions memory dvnOptions);
}
