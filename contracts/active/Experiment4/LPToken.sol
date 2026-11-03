// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LPToken is ERC20, Ownable {
    address public pool;

    error NotPool();
    error PoolAlreadySet();

    constructor() ERC20("FoodFi AMM LP Token", "FFI-LP") Ownable(msg.sender) {}

    function setPool(address pool_) external onlyOwner {
        if (pool != address(0)) revert PoolAlreadySet();
        if (pool_ == address(0)) revert PoolAlreadySet();
        pool = pool_;
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != pool) revert NotPool();
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        if (msg.sender != pool) revert NotPool();
        _burn(from, amount);
    }
}
