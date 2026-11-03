// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SimpleYieldFarm is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;
    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public lastUpdate;
    mapping(address => uint256) public pendingReward;
    uint256 public constant rewardRate = 1e15;

    event Staked(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event Withdrawn(address indexed user, uint256 amount);

    error InvalidAddress();
    error ZeroAmount();
    error InsufficientStake();
    error InsufficientRewardBalance();

    constructor(address stakingToken_, address rewardToken_) {
        if (stakingToken_ == address(0) || rewardToken_ == address(0)) revert InvalidAddress();
        stakingToken = IERC20(stakingToken_);
        rewardToken = IERC20(rewardToken_);
    }

    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        _updateReward(msg.sender);
        stakedBalance[msg.sender] += amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function earned(address user) public view returns (uint256 reward) {
        reward = pendingReward[user];
        if (stakedBalance[user] > 0 && lastUpdate[user] != 0) {
            reward += (stakedBalance[user] * rewardRate * (block.timestamp - lastUpdate[user])) / 1e18;
        }
    }

    function harvest() external nonReentrant {
        _claim(msg.sender);
    }

    function claimReward() external nonReentrant {
        _claim(msg.sender);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (stakedBalance[msg.sender] < amount) revert InsufficientStake();
        _updateReward(msg.sender);
        stakedBalance[msg.sender] -= amount;
        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function exit() external nonReentrant {
        _updateReward(msg.sender);
        uint256 amount = stakedBalance[msg.sender];
        stakedBalance[msg.sender] = 0;
        uint256 reward = pendingReward[msg.sender];
        pendingReward[msg.sender] = 0;
        if (amount > 0) {
            stakingToken.safeTransfer(msg.sender, amount);
            emit Withdrawn(msg.sender, amount);
        }
        if (reward > 0) {
            if (rewardToken.balanceOf(address(this)) < reward) revert InsufficientRewardBalance();
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function _claim(address user) private {
        _updateReward(user);
        _claimUpdated(user);
    }

    function _claimUpdated(address user) private {
        uint256 reward = pendingReward[user];
        if (reward == 0) revert ZeroAmount();
        if (rewardToken.balanceOf(address(this)) < reward) revert InsufficientRewardBalance();
        pendingReward[user] = 0;
        rewardToken.safeTransfer(user, reward);
        emit RewardPaid(user, reward);
    }

    function _updateReward(address user) private {
        uint256 updatedAt = block.timestamp;
        if (lastUpdate[user] != 0 && stakedBalance[user] > 0) {
            pendingReward[user] +=
                (stakedBalance[user] * rewardRate * (updatedAt - lastUpdate[user])) / 1e18;
        }
        lastUpdate[user] = updatedAt;
    }
}
