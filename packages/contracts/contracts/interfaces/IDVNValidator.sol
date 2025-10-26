// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IDVNValidator
 * @dev Interface for Data Verification Network validation in LayerZero
 */
interface IDVNValidator {
    struct DVNOptions {
        uint32 gas;
        uint256 multiplier;
        uint256 pricePerGas;
    }

    struct ExecutionState {
        uint256 gas;
        uint256 value;
    }

    /**
     * @dev Validate DVN options and get execution parameters
     */
    function validateDVNOptions(
        bytes calldata _options,
        uint32 _dstEid
    ) external view returns (DVNOptions memory dvnOptions, ExecutionState memory executionState);

    /**
     * @dev Verify message with DVN
     */
    function verifyWithDVN(
        bytes32 _messageHash,
        bytes calldata _dvnProof,
        uint32 _srcEid
    ) external view returns (bool isValid);

    /**
     * @dev Get DVN configuration for a specific endpoint
     */
    function getDVNConfig(
        uint32 _eid
    ) external view returns (address dvn, DVNOptions memory options);
}
