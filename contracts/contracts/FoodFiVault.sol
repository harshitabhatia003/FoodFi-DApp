// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts@4.9.6/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/extensions/ERC4626.sol";

contract FoodFiVault is ERC4626 {

    mapping(address => uint256) public foodSaved;

    constructor(IERC20 asset)
        ERC20("FoodFi Vault Share", "FFVS")
        ERC4626(asset)
    {}

    function recordFoodSaving(uint256 kg) external {
        foodSaved[msg.sender] += kg;
    }
}