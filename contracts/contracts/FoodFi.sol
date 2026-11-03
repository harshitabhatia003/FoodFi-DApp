// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFOODToken {
    function transfer(
        address to,
        uint256 amount
    ) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function balanceOf(
        address account
    ) external view returns (uint256);
}

contract FoodFi {
    IFOODToken public foodToken;
    address public owner;

    // 10 FOOD per kg saved
    uint256 public rewardPerKg = 10 ether;

    mapping(address => uint256) public totalFoodSaved;
    mapping(address => uint256) public totalRewardsEarned;

    event FoodSavingRecorded(
        address indexed participant,
        uint256 foodSavedKg,
        uint256 rewardAmount
    );

    event RewardsDeposited(
        address indexed depositor,
        uint256 amount
    );

    constructor(address tokenAddress) {
        owner = msg.sender;
        foodToken = IFOODToken(tokenAddress);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // Owner deposits FOOD into the reward pool.
    function depositRewards(
        uint256 amount
    ) external onlyOwner {
        require(amount > 0, "Amount must be greater than zero");

        bool success = foodToken.transferFrom(
            msg.sender,
            address(this),
            amount
        );

        require(success, "FOOD transfer failed");

        emit RewardsDeposited(msg.sender, amount);
    }

    // Simulated food-waste verification.
    function recordFoodSaving(
        address participant,
        uint256 foodSavedKg
    ) external onlyOwner {
        require(
            participant != address(0),
            "Invalid participant"
        );

        require(
            foodSavedKg > 0,
            "Food saved must be greater than zero"
        );

        uint256 reward = (foodSavedKg * rewardPerKg) / 1 ether;

        require(
            foodToken.balanceOf(address(this)) >= reward,
            "Insufficient FOOD reward pool"
        );

        totalFoodSaved[participant] += foodSavedKg;
        totalRewardsEarned[participant] += reward;

        bool success = foodToken.transfer(
            participant,
            reward
        );

        require(
            success,
            "FOOD transfer failed"
        );

        emit FoodSavingRecorded(
            participant,
            foodSavedKg,
            reward
        );
    }

    function setRewardRate(
        uint256 newRewardPerKg
    ) external onlyOwner {
        require(
            newRewardPerKg > 0,
            "Invalid reward rate"
        );

        rewardPerKg = newRewardPerKg;
    }

    function getParticipantStats(
        address participant
    )
        external
        view
        returns (
            uint256 foodSavedKg,
            uint256 rewardsEarned,
            uint256 foodBalance
        )
    {
        return (
            totalFoodSaved[participant],
            totalRewardsEarned[participant],
            foodToken.balanceOf(participant)
        );
    }
}