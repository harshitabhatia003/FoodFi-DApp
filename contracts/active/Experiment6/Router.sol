// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRouterToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IRouterFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IRouterPair {
    function token0() external view returns (address);
    function reserve0() external view returns (uint112);
    function reserve1() external view returns (uint112);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function mint(address to) external returns (uint256 liquidity);
    function burn(address to) external returns (uint256 amount0, uint256 amount1);
    function swap(uint256 amount0Out, uint256 amount1Out, address to) external;
}

contract Router {
    address public immutable factory;

    error InvalidAddress();
    error IdenticalAddresses();
    error InvalidPath();
    error InsufficientAmount();
    error InsufficientLiquidity();
    error Expired();
    error InsufficientOutputAmount();
    error TransferFailed();

    constructor(address factory_) {
        if (factory_ == address(0)) revert InvalidAddress();
        factory = factory_;
    }

    function sortTokens(address tokenA, address tokenB) public pure returns (address token0, address token1) {
        if (tokenA == tokenB) revert IdenticalAddresses();
        if (tokenA == address(0) || tokenB == address(0)) revert InvalidAddress();
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }

    function getReserves(address tokenA, address tokenB) public view returns (uint256 reserveA, uint256 reserveB) {
        (address token0,) = sortTokens(tokenA, tokenB);
        address pair = IRouterFactory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) revert InsufficientLiquidity();
        uint256 reserve0 = IRouterPair(pair).reserve0();
        uint256 reserve1 = IRouterPair(pair).reserve1();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) public pure returns (uint256 amountB) {
        if (amountA == 0) revert InsufficientAmount();
        if (reserveA == 0 || reserveB == 0) revert InsufficientLiquidity();
        amountB = (amountA * reserveB) / reserveA;
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert InsufficientAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();
        uint256 amountInWithFee = amountIn * 997;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);
    }

    function getAmountsOut(uint256 amountIn, address[] memory path)
        public
        view
        returns (uint256[] memory amounts)
    {
        if (path.length < 2) revert InvalidPath();
        if (amountIn == 0) revert InsufficientAmount();
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        require(block.timestamp <= deadline, "EXPIRED");
        if (to == address(0)) revert InvalidAddress();
        if (amountADesired == 0 || amountBDesired == 0) revert InsufficientAmount();

        address pair = IRouterFactory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) pair = IRouterFactory(factory).createPair(tokenA, tokenB);
        (uint256 reserveA, uint256 reserveB) = getReserves(tokenA, tokenB);

        if (reserveA == 0 && reserveB == 0) {
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            uint256 amountBOptimal = quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                amountA = quote(amountBDesired, reserveB, reserveA);
                amountB = amountBDesired;
            }
        }
        if (amountA < amountAMin || amountB < amountBMin) revert InsufficientAmount();

        _safeTransferFrom(tokenA, msg.sender, pair, amountA);
        _safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = IRouterPair(pair).mint(to);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB) {
        require(block.timestamp <= deadline, "EXPIRED");
        if (to == address(0)) revert InvalidAddress();
        if (liquidity == 0) revert InsufficientAmount();
        address pair = IRouterFactory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) revert InsufficientLiquidity();
        _safeTransferFrom(pair, msg.sender, pair, liquidity);
        (uint256 amount0, uint256 amount1) = IRouterPair(pair).burn(to);
        (address token0,) = sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        if (amountA < amountAMin || amountB < amountBMin) revert InsufficientOutputAmount();
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(block.timestamp <= deadline, "EXPIRED");
        if (to == address(0)) revert InvalidAddress();
        if (path.length < 2) revert InvalidPath();
        for (uint256 i; i < path.length; i++) {
            if (path[i] == address(0)) revert InvalidAddress();
            if (i > 0 && path[i] == path[i - 1]) revert InvalidPath();
        }
        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");

        address firstPair = IRouterFactory(factory).getPair(path[0], path[1]);
        if (firstPair == address(0)) revert InsufficientLiquidity();
        _safeTransferFrom(path[0], msg.sender, firstPair, amounts[0]);

        for (uint256 i; i < path.length - 1; i++) {
            _swapHop(amounts, path, i, to);
        }
    }

    function _swapHop(uint256[] memory amounts, address[] calldata path, uint256 i, address to) private {
        address input = path[i];
        address output = path[i + 1];
        address pair = IRouterFactory(factory).getPair(input, output);
        (address token0,) = sortTokens(input, output);
        uint256 outputAmount = amounts[i + 1];
        (uint256 amount0Out, uint256 amount1Out) =
            input == token0 ? (uint256(0), outputAmount) : (outputAmount, uint256(0));
        address recipient = i < path.length - 2
            ? IRouterFactory(factory).getPair(output, path[i + 2])
            : to;
        if (recipient == address(0)) revert InsufficientLiquidity();
        IRouterPair(pair).swap(amount0Out, amount1Out, recipient);
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IRouterToken.transferFrom.selector, from, to, amount)
        );
        if (!success) {
            assembly {
                revert(add(data, 32), mload(data))
            }
        }
        if (data.length != 0 && !abi.decode(data, (bool))) revert TransferFailed();
    }
}
