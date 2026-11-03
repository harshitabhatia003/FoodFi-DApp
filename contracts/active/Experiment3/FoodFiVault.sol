// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract FoodFiVault is ERC4626 {
    constructor(IERC20 asset_)
        ERC20("FoodFi Vault Share", "FFVS")
        ERC4626(asset_)
    {}
}
