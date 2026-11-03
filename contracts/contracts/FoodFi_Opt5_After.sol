// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FoodFi_Opt5_After {

    address public owner;

    mapping(address => uint256)
        public totalFoodSaved;

    // Custom error
    error InvalidAmount();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only owner"
        );
        _;
    }

    /*
     * AFTER:
     * Uses a custom error instead of
     * a string-based require message.
     */
    function recordFoodSaving(
        uint256 amount
    ) external onlyOwner {

        if (amount == 0) {
            revert InvalidAmount();
        }

        totalFoodSaved[msg.sender] += amount;
    }

    function getTotalFoodSaved(
        address participant
    )
        external
        view
        returns (uint256)
    {
        return totalFoodSaved[participant];
    }
}