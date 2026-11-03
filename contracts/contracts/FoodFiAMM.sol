// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract FoodFiAMM is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable tokenA;
    IERC20 public immutable tokenB;

    uint256 public reserveA;
    uint256 public reserveB;

    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    event LiquidityAdded(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 lpShares
    );

    event LiquidityRemoved(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 lpShares
    );

    event Swap(
        address indexed trader,
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut
    );

    event Sync(uint256 reserveA, uint256 reserveB);

    error IdenticalTokens();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientInitialLiquidity();
    error InsufficientLiquidityMinted();
    error InsufficientLPBalance();
    error InsufficientRedemption();
    error NoLiquidity();
    error InsufficientOutputAmount();
    error InsufficientPoolLiquidity();
    error InvalidReserves();

    constructor(address _tokenA, address _tokenB)
        ERC20("FoodFi AMM LP Share", "FFI-LP")
    {
        if (_tokenA == address(0) || _tokenB == address(0)) {
            revert ZeroAddress();
        }

        if (_tokenA == _tokenB) {
            revert IdenticalTokens();
        }

        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    function addLiquidity(
        uint256 amountA,
        uint256 amountB
    ) external nonReentrant returns (uint256 lpShares) {

        if (amountA == 0 || amountB == 0) {
            revert ZeroAmount();
        }

        uint256 _totalSupply = totalSupply();

        if (_totalSupply == 0) {
            lpShares = _sqrt(amountA * amountB);

            if (lpShares <= MINIMUM_LIQUIDITY) {
                revert InsufficientInitialLiquidity();
            }

            lpShares -= MINIMUM_LIQUIDITY;

            _mint(address(this), MINIMUM_LIQUIDITY);
        } else {
            uint256 shareA =
                (amountA * _totalSupply) / reserveA;

            uint256 shareB =
                (amountB * _totalSupply) / reserveB;

            lpShares = shareA < shareB ? shareA : shareB;
        }

        if (lpShares == 0) {
            revert InsufficientLiquidityMinted();
        }

        reserveA += amountA;
        reserveB += amountB;

        _mint(msg.sender, lpShares);

        tokenA.safeTransferFrom(
            msg.sender,
            address(this),
            amountA
        );

        tokenB.safeTransferFrom(
            msg.sender,
            address(this),
            amountB
        );

        emit LiquidityAdded(
            msg.sender,
            amountA,
            amountB,
            lpShares
        );

        emit Sync(reserveA, reserveB);
    }

    function removeLiquidity(
        uint256 lpAmount
    )
        external
        nonReentrant
        returns (uint256 amountA, uint256 amountB)
    {
        if (lpAmount == 0) {
            revert ZeroAmount();
        }

        if (balanceOf(msg.sender) < lpAmount) {
            revert InsufficientLPBalance();
        }

        uint256 _totalSupply = totalSupply();

        amountA = (lpAmount * reserveA) / _totalSupply;
        amountB = (lpAmount * reserveB) / _totalSupply;

        if (amountA == 0 || amountB == 0) {
            revert InsufficientRedemption();
        }

        reserveA -= amountA;
        reserveB -= amountB;

        _burn(msg.sender, lpAmount);

        tokenA.safeTransfer(msg.sender, amountA);
        tokenB.safeTransfer(msg.sender, amountB);

        emit LiquidityRemoved(
            msg.sender,
            amountA,
            amountB,
            lpAmount
        );

        emit Sync(reserveA, reserveB);
    }

    function swapAForB(
        uint256 amountAIn
    )
        external
        nonReentrant
        returns (uint256 amountBOut)
    {
        if (amountAIn == 0) {
            revert ZeroAmount();
        }

        if (reserveA == 0 || reserveB == 0) {
            revert NoLiquidity();
        }

        amountBOut =
            getAmountOut(
                amountAIn,
                reserveA,
                reserveB
            );

        if (amountBOut == 0) {
            revert InsufficientOutputAmount();
        }

        if (amountBOut >= reserveB) {
            revert InsufficientPoolLiquidity();
        }

        reserveA += amountAIn;
        reserveB -= amountBOut;

        tokenA.safeTransferFrom(
            msg.sender,
            address(this),
            amountAIn
        );

        tokenB.safeTransfer(
            msg.sender,
            amountBOut
        );

        emit Swap(
            msg.sender,
            address(tokenA),
            amountAIn,
            address(tokenB),
            amountBOut
        );

        emit Sync(reserveA, reserveB);
    }

    function swapBForA(
        uint256 amountBIn
    )
        external
        nonReentrant
        returns (uint256 amountAOut)
    {
        if (amountBIn == 0) {
            revert ZeroAmount();
        }

        if (reserveA == 0 || reserveB == 0) {
            revert NoLiquidity();
        }

        amountAOut =
            getAmountOut(
                amountBIn,
                reserveB,
                reserveA
            );

        if (amountAOut == 0) {
            revert InsufficientOutputAmount();
        }

        if (amountAOut >= reserveA) {
            revert InsufficientPoolLiquidity();
        }

        reserveB += amountBIn;
        reserveA -= amountAOut;

        tokenB.safeTransferFrom(
            msg.sender,
            address(this),
            amountBIn
        );

        tokenA.safeTransfer(
            msg.sender,
            amountAOut
        );

        emit Swap(
            msg.sender,
            address(tokenB),
            amountBIn,
            address(tokenA),
            amountAOut
        );

        emit Sync(reserveA, reserveB);
    }

    function getReserves()
        external
        view
        returns (
            uint256 _reserveA,
            uint256 _reserveB
        )
    {
        return (reserveA, reserveB);
    }

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    )
        public
        pure
        returns (uint256 amountOut)
    {
        if (amountIn == 0) {
            revert ZeroAmount();
        }

        if (reserveIn == 0 || reserveOut == 0) {
            revert InvalidReserves();
        }

        uint256 newReserveIn =
            reserveIn + amountIn;

        uint256 newReserveOut =
            (reserveIn * reserveOut) /
            newReserveIn;

        amountOut =
            reserveOut - newReserveOut;
    }

    function _sqrt(
        uint256 y
    )
        internal
        pure
        returns (uint256 z)
    {
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