// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract FoodFiOrders is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Order {
        address customer;
        uint256 amountPaid;
        bytes32 orderHash;
        uint64 placedAt;
    }

    address public immutable merchant;
    IERC20 public immutable rewardToken;
    uint256 public immutable rewardPerOrder;
    uint256 public nextOrderId = 1;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256) public orderCount;

    event OrderPlaced(
        uint256 indexed orderId,
        address indexed customer,
        uint256 amountPaid,
        bytes32 orderHash
    );
    event OrderRewardPaid(uint256 indexed orderId, address indexed customer, uint256 amount);

    error InvalidAddress();
    error InvalidOrder();
    error PaymentFailed();

    constructor(address merchant_, address rewardToken_, uint256 rewardPerOrder_) {
        if (merchant_ == address(0)) revert InvalidAddress();
        if ((rewardToken_ == address(0)) != (rewardPerOrder_ == 0)) revert InvalidAddress();

        merchant = merchant_;
        rewardToken = IERC20(rewardToken_);
        rewardPerOrder = rewardPerOrder_;
    }

    function placeOrder(bytes32 orderHash) external payable nonReentrant returns (uint256 orderId) {
        if (msg.value == 0 || orderHash == bytes32(0)) revert InvalidOrder();

        orderId = nextOrderId++;
        orders[orderId] = Order({
            customer: msg.sender,
            amountPaid: msg.value,
            orderHash: orderHash,
            placedAt: uint64(block.timestamp)
        });
        orderCount[msg.sender]++;

        (bool paid,) = payable(merchant).call{value: msg.value}("");
        if (!paid) revert PaymentFailed();

        emit OrderPlaced(orderId, msg.sender, msg.value, orderHash);
        if (rewardPerOrder > 0) {
            rewardToken.safeTransfer(msg.sender, rewardPerOrder);
            emit OrderRewardPaid(orderId, msg.sender, rewardPerOrder);
        }
    }
}
