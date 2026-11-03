// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LPToken.sol";

contract LiquidityPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable tokenA;
    IERC20 public immutable tokenB;
    LPToken public immutable lpToken;
    uint256 public reserveA;
    uint256 public reserveB;
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    address private constant LOCKED_LIQUIDITY = 0x000000000000000000000000000000000000dEaD;

    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event Swap(address indexed trader, address indexed tokenIn, uint256 amountIn, address indexed tokenOut, uint256 amountOut);
    event Sync(uint256 reserveA, uint256 reserveB);

    error InvalidAddress();
    error InvalidAmount();
    error InsufficientLiquidity();
    error InsufficientOutput();

    constructor(address tokenA_, address tokenB_, address lpToken_) {
        if (tokenA_ == address(0) || tokenB_ == address(0) || lpToken_ == address(0)) revert InvalidAddress();
        if (tokenA_ == tokenB_) revert InvalidAddress();
        tokenA = IERC20(tokenA_);
        tokenB = IERC20(tokenB_);
        lpToken = LPToken(lpToken_);
    }

    function addLiquidity(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) external nonReentrant returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        if (amountADesired == 0 || amountBDesired == 0) revert InvalidAmount();

        if (reserveA == 0 && reserveB == 0) {
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            uint256 amountBOptimal = (amountADesired * reserveB) / reserveA;
            if (amountBOptimal <= amountBDesired) {
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                amountA = (amountBDesired * reserveA) / reserveB;
                amountB = amountBDesired;
            }
        }

        if (amountA < amountAMin || amountB < amountBMin) revert InsufficientLiquidity();
        tokenA.safeTransferFrom(msg.sender, address(this), amountA);
        tokenB.safeTransferFrom(msg.sender, address(this), amountB);

        uint256 supply = lpToken.totalSupply();
        if (supply == 0) {
            uint256 root = _sqrt(amountA * amountB);
            if (root <= MINIMUM_LIQUIDITY) revert InsufficientLiquidity();
            lpToken.mint(LOCKED_LIQUIDITY, MINIMUM_LIQUIDITY);
            liquidity = root - MINIMUM_LIQUIDITY;
        } else {
            uint256 shareA = (amountA * supply) / reserveA;
            uint256 shareB = (amountB * supply) / reserveB;
            liquidity = shareA < shareB ? shareA : shareB;
        }
        if (liquidity == 0) revert InsufficientLiquidity();

        lpToken.mint(msg.sender, liquidity);
        _sync();
        emit LiquidityAdded(msg.sender, amountA, amountB, liquidity);
    }

    function removeLiquidity(uint256 liquidity)
        external
        nonReentrant
        returns (uint256 amountA, uint256 amountB)
    {
        if (liquidity == 0) revert InvalidAmount();
        uint256 supply = lpToken.totalSupply();
        if (supply == 0) revert InsufficientLiquidity();

        amountA = (liquidity * reserveA) / supply;
        amountB = (liquidity * reserveB) / supply;
        if (amountA == 0 || amountB == 0) revert InsufficientLiquidity();

        lpToken.burn(msg.sender, liquidity);
        tokenA.safeTransfer(msg.sender, amountA);
        tokenB.safeTransfer(msg.sender, amountB);
        _sync();
        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidity);
    }

    function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut, address to)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        if (amountIn == 0 || to == address(0)) revert InvalidAmount();

        bool aToB = tokenIn == address(tokenA);
        if (!aToB && tokenIn != address(tokenB)) revert InvalidAddress();
        uint256 reserveIn = aToB ? reserveA : reserveB;
        uint256 reserveOut = aToB ? reserveB : reserveA;
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();

        IERC20 input = aToB ? tokenA : tokenB;
        IERC20 output = aToB ? tokenB : tokenA;
        input.safeTransferFrom(msg.sender, address(this), amountIn);
        uint256 newReserveOut = (reserveIn * reserveOut) / (reserveIn + amountIn);
        amountOut = reserveOut - newReserveOut;
        if (amountOut == 0 || amountOut < minAmountOut) revert InsufficientOutput();

        output.safeTransfer(to, amountOut);
        _sync();
        emit Swap(msg.sender, tokenIn, amountIn, address(output), amountOut);
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserveA, reserveB);
    }

    function _sync() private {
        reserveA = tokenA.balanceOf(address(this));
        reserveB = tokenB.balanceOf(address(this));
        emit Sync(reserveA, reserveB);
    }

    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
