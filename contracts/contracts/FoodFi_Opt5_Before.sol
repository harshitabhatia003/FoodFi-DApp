// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FoodFi_Opt5_Before {

    address public owner;

    mapping(address => uint256)
        public totalFoodSaved;

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
     * BEFORE:
     * Uses a require statement with
     * a string error message.
     */
    function recordFoodSaving(
        uint256 amount
    ) external onlyOwner {

        require(
            amount > 0,
            "Amount must be greater than zero"
        );

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