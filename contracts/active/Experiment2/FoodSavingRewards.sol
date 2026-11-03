// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract FoodSavingRewards is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable foodToken;
    uint256 public rewardPerKg = 10 ether;

    struct ParticipantStats {
        uint256 foodSavedKg;
        uint256 rewardsEarned;
        uint256 participationCount;
    }

    mapping(address => ParticipantStats) public participantStats;

    event FoodSavingRecorded(address indexed participant, uint256 foodSavedKg, uint256 rewardsEarned);
    event RewardsDeposited(address indexed depositor, uint256 amount);
    event RewardRateUpdated(uint256 rewardPerKg);

    error InvalidAddress();
    error InvalidAmount();
    error InsufficientRewardBalance();

    constructor(address foodToken_) Ownable(msg.sender) {
        if (foodToken_ == address(0)) revert InvalidAddress();
        foodToken = IERC20(foodToken_);
    }

    function depositRewards(uint256 amount) external {
        if (amount == 0) revert InvalidAmount();
        foodToken.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardsDeposited(msg.sender, amount);
    }

    function recordFoodSaving(address participant, uint256 foodSavedKg) external onlyOwner {
        if (participant == address(0)) revert InvalidAddress();
        if (foodSavedKg == 0) revert InvalidAmount();

        uint256 reward = foodSavedKg * rewardPerKg;
        if (foodToken.balanceOf(address(this)) < reward) revert InsufficientRewardBalance();

        ParticipantStats storage stats = participantStats[participant];
        stats.foodSavedKg += foodSavedKg;
        stats.rewardsEarned += reward;
        stats.participationCount++;

        foodToken.safeTransfer(participant, reward);
        emit FoodSavingRecorded(participant, foodSavedKg, reward);
    }

    function setRewardRate(uint256 newRate) external onlyOwner {
        if (newRate == 0) revert InvalidAmount();
        rewardPerKg = newRate;
        emit RewardRateUpdated(newRate);
    }

    function getParticipantStats(address participant)
        external
        view
        returns (uint256 foodSavedKg, uint256 rewardsEarned, uint256 participationCount)
    {
        ParticipantStats storage stats = participantStats[participant];
        return (stats.foodSavedKg, stats.rewardsEarned, stats.participationCount);
    }
}
