/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FoodFi_Opt4_Before {

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
     * Storage is updated during every
     * iteration of the loop.
     */
    function recordBatchFoodSaving(
        uint256[] calldata foodSaved
    ) external onlyOwner {

        for (
            uint256 i = 0;
            i < foodSaved.length;
            i++
        ) {
            totalFoodSaved[msg.sender] +=
                foodSaved[i];
        }
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