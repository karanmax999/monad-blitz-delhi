// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IDVNValidator.sol";

/**
 * @title MockDVNValidator
 * @dev Enhanced Mock DVN validator for testing OVault Composer functionality with multi-chain support
 */
contract MockDVNValidator is IDVNValidator {
    bool public isValid = true;
    address public owner;
    
    // Chain-specific validation states
    mapping(uint32 => bool) public chainValidationEnabled;
    mapping(uint32 => uint256) public chainValidationCount;
    mapping(bytes32 => bool) public processedProofs;
    
    // DVN configuration per chain
    mapping(uint32 => DVNOptions) public chainDVNOptions;
    mapping(uint32 => ExecutionState) public chainExecutionStates;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Initialize default DVN options for supported chains
        _initializeDefaultDVNOptions();
    }
    
    function _initializeDefaultDVNOptions() internal {
        // Monad (Hub) - EID 10143
        chainDVNOptions[10143] = DVNOptions({
            gas: 200000,
            multiplier: 120, // 1.2x base fee
            pricePerGas: 1000000000 // 1 gwei
        });
        
        chainExecutionStates[10143] = ExecutionState({
            gas: 200000,
            value: 1000000000000000000 // 1 ETH base fee
        });
        
        // Ethereum - EID 30101
        chainDVNOptions[30101] = DVNOptions({
            gas: 180000,
            multiplier: 115, // 1.15x base fee
            pricePerGas: 2000000000 // 2 gwei
        });
        
        chainExecutionStates[30101] = ExecutionState({
            gas: 180000,
            value: 2000000000000000000 // 2 ETH base fee
        });
        
        // Polygon - EID 30109
        chainDVNOptions[30109] = DVNOptions({
            gas: 150000,
            multiplier: 110, // 1.1x base fee
            pricePerGas: 500000000 // 0.5 gwei
        });
        
        chainExecutionStates[30109] = ExecutionState({
            gas: 150000,
            value: 500000000000000000 // 0.5 ETH base fee
        });
        
        // Arbitrum - EID 30110
        chainDVNOptions[30110] = DVNOptions({
            gas: 160000,
            multiplier: 112, // 1.12x base fee
            pricePerGas: 100000000 // 0.1 gwei
        });
        
        chainExecutionStates[30110] = ExecutionState({
            gas: 160000,
            value: 100000000000000000 // 0.1 ETH base fee
        });
        
        // BSC - EID 30102
        chainDVNOptions[30102] = DVNOptions({
            gas: 140000,
            multiplier: 108, // 1.08x base fee
            pricePerGas: 3000000000 // 3 gwei
        });
        
        chainExecutionStates[30102] = ExecutionState({
            gas: 140000,
            value: 300000000000000000 // 0.3 ETH base fee
        });
        
        // Enable validation for all chains by default
        chainValidationEnabled[10143] = true;
        chainValidationEnabled[30101] = true;
        chainValidationEnabled[30109] = true;
        chainValidationEnabled[30110] = true;
        chainValidationEnabled[30102] = true;
    }
    
    function setValid(bool _isValid) external onlyOwner {
        isValid = _isValid;
    }
    
    function setChainValidationEnabled(uint32 _eid, bool _enabled) external onlyOwner {
        chainValidationEnabled[_eid] = _enabled;
    }
    
    function setChainDVNOptions(uint32 _eid, DVNOptions memory _options) external onlyOwner {
        chainDVNOptions[_eid] = _options;
    }
    
    function setChainExecutionState(uint32 _eid, ExecutionState memory _state) external onlyOwner {
        chainExecutionStates[_eid] = _state;
    }
    
    function validateDVNOptions(bytes calldata _options, uint32 _dstEid) 
        external 
        view 
        override 
        returns (
            DVNOptions memory dvnOptions,
            ExecutionState memory executionState
        ) 
    {
        require(isValid, "DVN validation failed");
        require(chainValidationEnabled[_dstEid], "Chain validation disabled");
        
        dvnOptions = chainDVNOptions[_dstEid];
        executionState = chainExecutionStates[_dstEid];
        
        // Increment validation count (for testing purposes)
        // Note: This is a view function, so we can't actually modify state
        // In a real implementation, this would be tracked separately
    }
    
    function verifyWithDVN(
        bytes32 _messageHash, 
        bytes calldata _dvnProof, 
        uint32 _srcEid
    ) external view override returns (bool) {
        require(isValid, "DVN validation failed");
        require(chainValidationEnabled[_srcEid], "Chain validation disabled");
        require(_messageHash != bytes32(0), "Invalid message hash");
        require(_dvnProof.length > 0, "Invalid DVN proof");
        
        // Check if proof was already processed (prevent replay attacks)
        // Note: In a real implementation, this would be checked against a storage mapping
        // For testing, we'll allow the same proof to be used multiple times
        
        return true;
    }
    
    function verifyWithDVNStrict(
        bytes32 _messageHash, 
        bytes calldata _dvnProof, 
        uint32 _srcEid
    ) external returns (bool) {
        require(isValid, "DVN validation failed");
        require(chainValidationEnabled[_srcEid], "Chain validation disabled");
        require(_messageHash != bytes32(0), "Invalid message hash");
        require(_dvnProof.length > 0, "Invalid DVN proof");
        
        // Check for replay attacks
        bytes32 proofHash = keccak256(abi.encodePacked(_messageHash, _dvnProof, _srcEid));
        require(!processedProofs[proofHash], "Proof already processed");
        
        // Mark proof as processed
        processedProofs[proofHash] = true;
        chainValidationCount[_srcEid]++;
        
        return true;
    }
    
    function getDVNConfig(uint32 _eid) external view override returns (address dvn, DVNOptions memory options) {
        dvn = address(this);
        options = chainDVNOptions[_eid];
    }
    
    function getChainValidationStats(uint32 _eid) external view returns (
        bool enabled,
        uint256 count,
        DVNOptions memory options,
        ExecutionState memory state
    ) {
        enabled = chainValidationEnabled[_eid];
        count = chainValidationCount[_eid];
        options = chainDVNOptions[_eid];
        state = chainExecutionStates[_eid];
    }
    
    function resetValidationCount(uint32 _eid) external onlyOwner {
        chainValidationCount[_eid] = 0;
    }
    
    function resetAllValidationCounts() external onlyOwner {
        chainValidationCount[10143] = 0; // Monad
        chainValidationCount[30101] = 0; // Ethereum
        chainValidationCount[30109] = 0; // Polygon
        chainValidationCount[30110] = 0; // Arbitrum
        chainValidationCount[30102] = 0; // BSC
    }
}
