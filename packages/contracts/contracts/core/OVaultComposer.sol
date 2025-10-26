// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// LayerZero OApp v2 Composer + OVault Composer interfaces
import "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import "@layerzerolabs/oapp-evm/contracts/ovault/interfaces/IOVaultComposer.sol";

import "../interfaces/IDVNValidator.sol";
import "../interfaces/IManixVault.sol";
import "../libraries/OVaultUtils.sol";

/**
 * @title OVaultComposer
 * @dev Modular OVault Composer aligned with LayerZero v2 OApp OVault EVM and Composer standards.
 *      Acts as the hub-and-spoke coordinator and routes compose messages to the MANI X AI vault hub.
 */
contract OVaultComposer is IOAppComposer, IOVaultComposer, Ownable, ReentrancyGuard {
    // LayerZero endpoint expected to call lzCompose via Executor
    address public immutable lzEndpoint;

    // DVN validator (mandatory for pre-execution validation)
    IDVNValidator public dvnValidator;

    // Hub-and-spoke configuration
    address public hubVaultAddress; // Monad hub vault

    // chainId => peer oApp (bytes32 for LayerZero addressing)
    mapping(uint32 => bytes32) public trustedPeerByChain;
    mapping(uint32 => bool) public isWhitelistedChain;

    // Track processed transactions to ensure idempotency
    mapping(bytes32 => bool) public processedTx;

    // Dynamic config hooks (stored for transparency; actual library mgr lives in OApp core)
    mapping(bytes32 => bytes) public configByKey;

    // Events per spec
    event HubDepositHandled(bytes32 indexed txId, address indexed user, uint256 amount, uint32 srcChain);
    event SpokeWithdrawalProcessed(bytes32 indexed txId, address indexed user, uint256 amount, uint32 dstChain);
    event PeerSet(uint32 indexed eid, bytes32 peer);
    event ChainWhitelistSet(uint32 indexed eid, bool allowed);
    event DVNValidatorSet(address indexed dvn);
    event HubVaultSet(address indexed hubVault);
    event ConfigSet(bytes32 indexed key, bytes data);

    constructor(address _lzEndpoint, address _owner) {
        require(_lzEndpoint != address(0), "invalid endpoint");
        lzEndpoint = _lzEndpoint;
        _transferOwnership(_owner);

        // Enable common chains by default
        isWhitelistedChain[OVaultUtils.MONAD_CHAIN_ID] = true;
        isWhitelistedChain[OVaultUtils.ETHEREUM_CHAIN_ID] = true;
        isWhitelistedChain[OVaultUtils.POLYGON_CHAIN_ID] = true;
        isWhitelistedChain[OVaultUtils.ARBITRUM_CHAIN_ID] = true;
        isWhitelistedChain[OVaultUtils.BSC_CHAIN_ID] = true;
    }

    // ----- Admin configuration -----

    function setDVNValidator(address _dvn) external onlyOwner {
        dvnValidator = IDVNValidator(_dvn);
        emit DVNValidatorSet(_dvn);
    }

    function setHubVault(address _hubVault) external onlyOwner {
        require(_hubVault != address(0), "invalid hubVault");
        hubVaultAddress = _hubVault;
        emit HubVaultSet(_hubVault);
    }

    function setPeer(uint32 _eid, bytes32 _peer) external onlyOwner {
        trustedPeerByChain[_eid] = _peer;
        emit PeerSet(_eid, _peer);
    }

    function setWhitelistedChain(uint32 _eid, bool _allowed) external onlyOwner {
        isWhitelistedChain[_eid] = _allowed;
        emit ChainWhitelistSet(_eid, _allowed);
    }

    // Store config blobs keyed by hash (e.g., keccak256("sendLib:ETH"))
    function setConfig(bytes32 key, bytes calldata data) external onlyOwner {
        configByKey[key] = data;
        emit ConfigSet(key, data);
    }

    // Backwards-compatible helpers matching ask (no-ops other than storing)
    function setSendLibrary(bytes calldata data) external onlyOwner { configByKey[keccak256("sendLibrary")] = data; }
    function setReceiveLibrary(bytes calldata data) external onlyOwner { configByKey[keccak256("receiveLibrary")] = data; }

    // ----- Fee quoting -----

    function quoteLayerZeroFees(
        uint32 _dstEid,
        bytes calldata _message,
        bytes calldata _options,
        bool _validateDVN
    ) external view returns (uint256 nativeFee, uint256 lzTokenFee, bool dvnValid) {
        require(isWhitelistedChain[_dstEid], "unsupported chain");

        // NOTE: In a real deployment you would call the official endpoint's quote.
        // Here we surface a conservative placeholder derived from DVN options for testing.
        if (_validateDVN && address(dvnValidator) != address(0)) {
            try dvnValidator.validateDVNOptions(_options, _dstEid) returns (
                IDVNValidator.DVNOptions memory, IDVNValidator.ExecutionState memory exec
            ) {
                dvnValid = true;
                nativeFee = exec.value; // execution value suggested by DVN
                lzTokenFee = 0;
            } catch { dvnValid = false; }
        } else {
            dvnValid = true;
        }

        // Guarantee non-zero estimation based on message size
        uint256 size = _message.length + _options.length;
        if (nativeFee == 0) nativeFee = 1e15 + size * 1e9; // 0.001 ETH + gas per byte (placeholder)
    }

    function verifyWithDVN(bytes32 messageHash, bytes calldata dvnProof, uint32 srcEid)
        public view returns (bool)
    {
        if (address(dvnValidator) == address(0)) return false;
        try dvnValidator.verifyWithDVN(messageHash, dvnProof, srcEid) returns (bool ok) { return ok; } catch { return false; }
    }

    // ----- IOAppComposer.lzCompose -----

    function lzCompose(
        address oApp,
        bytes32 guid,
        bytes calldata message,
        address executor,
        bytes calldata extraData
    ) external payable override nonReentrant {
        require(msg.sender == lzEndpoint, "invalid endpoint caller");
        // Validate the sending oApp is an authorized peer on a whitelisted chain.
        // With v2 the guid commits to src/dst, but we also check peer mapping via payload.

        OVaultUtils.HubSpokeMessage memory hubMsg = OVaultUtils.decodeHubSpokeMessage(message);
        uint32 srcChain = hubMsg.sourceChain;
        require(isWhitelistedChain[srcChain], "src chain not allowed");

        bytes32 expectedPeer = trustedPeerByChain[srcChain];
        require(expectedPeer != bytes32(0), "peer not set");
        require(expectedPeer == bytes32(bytes20(oApp)), "unauthorized oApp");

        // DVN validation must pass before executing any on-chain actions.
        bytes32 msgHash = keccak256(message);
        require(verifyWithDVN(msgHash, extraData, srcChain), "DVN invalid");

        require(!processedTx[hubMsg.transactionId], "already processed");
        processedTx[hubMsg.transactionId] = true;

        // Atomic receive -> deposit/withdraw -> mint/burn shares -> forward response
        IManixVault hubVault = IManixVault(hubVaultAddress);
        require(address(hubVault) != address(0), "hub vault not set");

        if (hubMsg.msgType == OVaultUtils.MSG_TYPE_HUB_DEPOSIT || hubMsg.msgType == OVaultUtils.MSG_TYPE_SPOKE_DEPOSIT) {
            // Composer calls special entrypoint on hub vault that mints shares using already-received assets.
            // Assets are expected to arrive via OFT before compose is invoked by the executor.
            IOVaultComposerHook(hubVaultAddress).composerDeposit(hubMsg.user, hubMsg.amount, hubMsg.transactionId, srcChain);
            emit HubDepositHandled(hubMsg.transactionId, hubMsg.user, hubMsg.amount, srcChain);
        } else if (hubMsg.msgType == OVaultUtils.MSG_TYPE_HUB_WITHDRAW || hubMsg.msgType == OVaultUtils.MSG_TYPE_SPOKE_WITHDRAW) {
            IOVaultComposerHook(hubVaultAddress).composerWithdraw(hubMsg.user, hubMsg.amount, hubMsg.transactionId, srcChain);
            emit SpokeWithdrawalProcessed(hubMsg.transactionId, hubMsg.user, hubMsg.amount, srcChain);
        } else if (hubMsg.msgType == OVaultUtils.MSG_TYPE_AI_SYNC_HUB || hubMsg.msgType == OVaultUtils.MSG_TYPE_AI_SYNC_SPOKE) {
            // Forward AI sync to vault for optional rebalancing
            try IOVaultComposerHook(hubVaultAddress).composerAISync(message) {} catch {}
            // analytics events can be emitted in the vault side
        }
        // No explicit response forwarding here; in LZ v2 pattern, a separate send back can be initiated by the vault if needed.
    }
}

/**
 * @dev Minimal hook interface implemented by the hub `ManixVault` to allow the Composer to mint/burn on compose.
 */
interface IOVaultComposerHook {
    function composerDeposit(address user, uint256 amount, bytes32 txId, uint32 srcEid) external;
    function composerWithdraw(address user, uint256 amount, bytes32 txId, uint32 srcEid) external;
    function composerAISync(bytes calldata aiMessage) external;
}


