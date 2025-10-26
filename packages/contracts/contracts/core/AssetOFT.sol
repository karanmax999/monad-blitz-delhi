// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@layerzerolabs/oapp-evm/contracts/oft/OFT.sol";

/**
 * @title AssetOFT
 * @dev ERC20 asset bound to LayerZero OFT v2 for omnichain transfers.
 */
contract AssetOFT is ERC20, Ownable, OFT {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _owner
    ) ERC20(_name, _symbol) OFT(_name, _symbol, _lzEndpoint, _owner) {
        _transferOwnership(_owner);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    function setPeer(uint32 remoteEID, bytes32 remotePeer) external onlyOwner {
        _setPeer(remoteEID, remotePeer);
    }
}


