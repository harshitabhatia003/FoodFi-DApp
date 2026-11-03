// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SimpleStaking is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;

    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public lastUpdate;
    mapping(address => uint256) public pendingReward;

    // 0.001 RWD per ABC per second
    // Stored with 18-decimal precision.
    uint256 public constant rewardRate = 1e15;

    event Staked(
        address indexed user,
        uint256 amount
    );

    event RewardClaimed(
        address indexed user,
        uint256 reward
    );

    event Unstaked(
        address indexed user,
        uint256 amount
    );

    error ZeroAmount();
    error InsufficientStake();
    error InsufficientRewardBalance();

    constructor(
        address _stakingToken,
        address _rewardToken
    ) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }

    function stake(uint256 amount)
        external
        nonReentrant
    {
        if (amount == 0) {
            revert ZeroAmount();
        }

        _updateReward(msg.sender);

        stakedBalance[msg.sender] += amount;

        stakingToken.safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        emit Staked(msg.sender, amount);
    }

    function earned(address user)
        public
        view
        returns (uint256)
    {
        uint256 reward = pendingReward[user];

        if (stakedBalance[user] > 0) {
            uint256 elapsed =
                block.timestamp - lastUpdate[user];

            reward +=
                stakedBalance[user] *
                rewardRate *
                elapsed /
                1e18;
        }

        return reward;
    }

    function claimReward()
        external
        nonReentrant
    {
        _updateReward(msg.sender);

        uint256 reward = pendingReward[msg.sender];

        if (reward == 0) {
            revert ZeroAmount();
        }

        if (
            rewardToken.balanceOf(address(this))
                < reward
        ) {
            revert InsufficientRewardBalance();
        }

        pendingReward[msg.sender] = 0;

        rewardToken.safeTransfer(
            msg.sender,
            reward
        );

        emit RewardClaimed(
            msg.sender,
            reward
        );
    }

    function unstake(uint256 amount)
        external
        nonReentrant
    {
        if (amount == 0) {
            revert ZeroAmount();
        }

        if (
            stakedBalance[msg.sender] < amount
        ) {
            revert InsufficientStake();
        }

        _updateReward(msg.sender);

        stakedBalance[msg.sender] -= amount;

        stakingToken.safeTransfer(
            msg.sender,
            amount
        );

        emit Unstaked(
            msg.sender,
            amount
        );
    }

    function exit()
        external
        nonReentrant
    {
        _updateReward(msg.sender);

        uint256 amount =
            stakedBalance[msg.sender];

        uint256 reward =
            pendingReward[msg.sender];

        stakedBalance[msg.sender] = 0;
        pendingReward[msg.sender] = 0;

        if (amount > 0) {
            stakingToken.safeTransfer(
                msg.sender,
                amount
            );

            emit Unstaked(
                msg.sender,
                amount
            );
        }

        if (reward > 0) {
            if (
                rewardToken.balanceOf(address(this))
                    < reward
            ) {
                revert InsufficientRewardBalance();
            }

            rewardToken.safeTransfer(
                msg.sender,
                reward
            );

            emit RewardClaimed(
                msg.sender,
                reward
            );
        }
    }

    function _updateReward(address user)
        internal
    {
        if (lastUpdate[user] == 0) {
            lastUpdate[user] =
                block.timestamp;

            return;
        }

        uint256 elapsed =
            block.timestamp - lastUpdate[user];

        if (stakedBalance[user] > 0) {
            pendingReward[user] +=
                stakedBalance[user] *
                rewardRate *
                elapsed /
                1e18;
        }

        lastUpdate[user] =
            block.timestamp;
    }
}