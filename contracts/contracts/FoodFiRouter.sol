// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFoodFiERC20 {
    function balanceOf(address account) external view returns (uint256);

    function transfer(
        address to,
        uint256 amount
    ) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function approve(
        address spender,
        uint256 amount
    ) external returns (bool);
}

interface IFoodFiFactory {
    function getPair(
        address tokenA,
        address tokenB
    ) external view returns (address pair);

    function createPair(
        address tokenA,
        address tokenB
    ) external returns (address pair);
}

interface IFoodFiPair {
    function token0() external view returns (address);

    function token1() external view returns (address);

    function reserve0() external view returns (uint112);

    function reserve1() external view returns (uint112);

    function totalSupply() external view returns (uint256);

    function balanceOf(
        address account
    ) external view returns (uint256);

    function mint(
        address to
    ) external returns (uint256 liquidity);

    function burn(
        address to
    ) external returns (uint256 amount0, uint256 amount1);

    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to
    ) external;

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

contract FoodFiRouter {
    address public immutable factory;

    constructor(address _factory) {
        require(_factory != address(0), "ZERO_FACTORY");
        factory = _factory;
    }

    // --------------------------------------------------
    // TOKEN ORDERING
    // --------------------------------------------------

    function sortTokens(
        address tokenA,
        address tokenB
    ) public pure returns (address token0, address token1) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        require(
            tokenA != address(0) && tokenB != address(0),
            "ZERO_ADDRESS"
        );

        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
    }

    // --------------------------------------------------
    // GET PAIR RESERVES
    // --------------------------------------------------

    function getReserves(
        address tokenA,
        address tokenB
    ) public view returns (uint256 reserveA, uint256 reserveB) {
        (address token0, ) = sortTokens(tokenA, tokenB);

        address pair = IFoodFiFactory(factory).getPair(
            tokenA,
            tokenB
        );

        require(pair != address(0), "PAIR_NOT_FOUND");

        uint256 reserve0 = IFoodFiPair(pair).reserve0();
        uint256 reserve1 = IFoodFiPair(pair).reserve1();

        (reserveA, reserveB) = tokenA == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
    }

    // --------------------------------------------------
    // QUOTE: CALCULATE RATIO-PRESERVING TOKEN AMOUNT
    // --------------------------------------------------

    function quote(
        uint256 amountA,
        uint256 reserveA,
        uint256 reserveB
    ) public pure returns (uint256 amountB) {
        require(amountA > 0, "INSUFFICIENT_AMOUNT");
        require(
            reserveA > 0 && reserveB > 0,
            "INSUFFICIENT_LIQUIDITY"
        );

        amountB = (amountA * reserveB) / reserveA;
    }

    // --------------------------------------------------
    // CALCULATE OUTPUT AMOUNT WITH 0.3% SWAP FEE
    // --------------------------------------------------

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "INSUFFICIENT_INPUT_AMOUNT");
        require(
            reserveIn > 0 && reserveOut > 0,
            "INSUFFICIENT_LIQUIDITY"
        );

        uint256 amountInWithFee = amountIn * 997;

        uint256 numerator = amountInWithFee * reserveOut;

        uint256 denominator =
            (reserveIn * 1000) + amountInWithFee;

        amountOut = numerator / denominator;
    }

    // --------------------------------------------------
    // CALCULATE OUTPUTS FOR A MULTI-HOP SWAP
    // --------------------------------------------------

    function getAmountsOut(
        uint256 amountIn,
        address[] memory path
    ) public view returns (uint256[] memory amounts) {
        require(path.length >= 2, "INVALID_PATH");
        require(amountIn > 0, "INSUFFICIENT_INPUT_AMOUNT");

        amounts = new uint256[](path.length);
        amounts[0] = amountIn;

        for (uint256 i = 0; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) =
                getReserves(path[i], path[i + 1]);

            amounts[i + 1] = getAmountOut(
                amounts[i],
                reserveIn,
                reserveOut
            );
        }
    }

    // --------------------------------------------------
    // SAFE TOKEN TRANSFER HELPERS
    // --------------------------------------------------

    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 amount
    ) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(
                IFoodFiERC20.transferFrom.selector,
                from,
                to,
                amount
            )
        );

        require(
            success &&
            (
                data.length == 0 ||
                (data.length >= 32 && abi.decode(data, (bool)))
            ),
            "TRANSFER_FROM_FAILED"
        );
    }

    function _safeTransfer(
        address token,
        address to,
        uint256 amount
    ) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(
                IFoodFiERC20.transfer.selector,
                to,
                amount
            )
        );

        require(
            success &&
            (
                data.length == 0 ||
                (data.length >= 32 && abi.decode(data, (bool)))
            ),
            "TRANSFER_FAILED"
        );
    }

    // --------------------------------------------------
    // ADD LIQUIDITY
    // --------------------------------------------------

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        require(block.timestamp <= deadline, "EXPIRED");
        require(to != address(0), "ZERO_RECIPIENT");
        require(
            amountADesired > 0 && amountBDesired > 0,
            "INSUFFICIENT_DESIRED_AMOUNT"
        );

        address pair = IFoodFiFactory(factory).getPair(
            tokenA,
            tokenB
        );

        if (pair == address(0)) {
            pair = IFoodFiFactory(factory).createPair(
                tokenA,
                tokenB
            );
        }

        (uint256 reserveA, uint256 reserveB) =
            getReserves(tokenA, tokenB);

        if (reserveA == 0 && reserveB == 0) {
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            uint256 amountBOptimal = quote(
                amountADesired,
                reserveA,
                reserveB
            );

            if (amountBOptimal <= amountBDesired) {
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint256 amountAOptimal = quote(
                    amountBDesired,
                    reserveB,
                    reserveA
                );

                amountA = amountAOptimal;
                amountB = amountBDesired;
            }
        }

        require(amountA >= amountAMin, "INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "INSUFFICIENT_B_AMOUNT");

        _safeTransferFrom(
            tokenA,
            msg.sender,
            pair,
            amountA
        );

        _safeTransferFrom(
            tokenB,
            msg.sender,
            pair,
            amountB
        );

        liquidity = IFoodFiPair(pair).mint(to);
    }

    // --------------------------------------------------
    // REMOVE LIQUIDITY
    // --------------------------------------------------

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        returns (uint256 amountA, uint256 amountB)
    {
        require(block.timestamp <= deadline, "EXPIRED");
        require(to != address(0), "ZERO_RECIPIENT");
        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY_BURNED");

        address pair = IFoodFiFactory(factory).getPair(
            tokenA,
            tokenB
        );

        require(pair != address(0), "PAIR_NOT_FOUND");

        // User must approve the Router to spend their LP tokens.
        _safeTransferFrom(
            pair,
            msg.sender,
            pair,
            liquidity
        );

        (uint256 amount0, uint256 amount1) =
            IFoodFiPair(pair).burn(to);

        (address token0, ) = sortTokens(tokenA, tokenB);

        (amountA, amountB) = tokenA == token0
            ? (amount0, amount1)
            : (amount1, amount0);

        require(amountA >= amountAMin, "INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "INSUFFICIENT_B_AMOUNT");
    }

    // --------------------------------------------------
    // SWAP EXACT TOKENS FOR TOKENS
    // Supports paths such as FOOD -> REWARD -> TOKEN C
    // --------------------------------------------------

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(block.timestamp <= deadline, "EXPIRED");
        require(to != address(0), "ZERO_RECIPIENT");
        require(path.length >= 2, "INVALID_PATH");
        require(amountIn > 0, "INSUFFICIENT_INPUT_AMOUNT");

        for (uint256 i = 0; i < path.length; i++) {
            require(path[i] != address(0), "ZERO_ADDRESS");

            if (i > 0) {
                require(
                    path[i] != path[i - 1],
                    "IDENTICAL_PATH_TOKENS"
                );
            }
        }

        amounts = getAmountsOut(amountIn, path);

        require(
            amounts[amounts.length - 1] >= amountOutMin,
            "INSUFFICIENT_OUTPUT_AMOUNT"
        );

        address firstPair = IFoodFiFactory(factory).getPair(
            path[0],
            path[1]
        );

        require(firstPair != address(0), "PAIR_NOT_FOUND");

        // Transfer the input tokens directly to the first Pair.
        _safeTransferFrom(
            path[0],
            msg.sender,
            firstPair,
            amounts[0]
        );

        // Execute each swap in the path.
        for (uint256 i = 0; i < path.length - 1; i++) {
            address input = path[i];
            address output = path[i + 1];

            address pair = IFoodFiFactory(factory).getPair(
                input,
                output
            );

            require(pair != address(0), "PAIR_NOT_FOUND");

            (address token0, ) = sortTokens(input, output);

            uint256 amountOut = amounts[i + 1];

            (
                uint256 amount0Out,
                uint256 amount1Out
            ) = input == token0
                ? (uint256(0), amountOut)
                : (amountOut, uint256(0));

            address recipient;

            if (i < path.length - 2) {
                recipient = IFoodFiFactory(factory).getPair(
                    output,
                    path[i + 2]
                );

                require(
                    recipient != address(0),
                    "PAIR_NOT_FOUND"
                );
            } else {
                recipient = to;
            }

            IFoodFiPair(pair).swap(
                amount0Out,
                amount1Out,
                recipient
            );
        }
    }
}
