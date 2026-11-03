// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FoodFi_Opt4_After {

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
     * AFTER:
     * Calculate the final value locally,
     * then perform only ONE storage write.
     */
    function recordBatchFoodSaving(
        uint256[] calldata foodSaved
    ) external onlyOwner {

        uint256 newTotal =
            totalFoodSaved[msg.sender];

        for (
            uint256 i = 0;
            i < foodSaved.length;
            i++
        ) {
            newTotal += foodSaved[i];
        }

        totalFoodSaved[msg.sender] =
            newTotal;
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