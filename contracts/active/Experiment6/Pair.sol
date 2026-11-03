// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20.sol";

interface IPairToken {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract Pair is ERC20 {
    address public immutable factory;
    address public token0;
    address public token1;
    uint112 public reserve0;
    uint112 public reserve1;
    uint32 public blockTimestampLast;

    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    address private constant LOCKED_LIQUIDITY = 0x000000000000000000000000000000000000dEaD;
    uint256 private unlocked = 1;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    error Forbidden();
    error InvalidTokens();
    error Initialized();
    error Locked();
    error InvalidAmount();
    error InsufficientLiquidity();
    error InsufficientInput();
    error InvalidRecipient();
    error TransferFailed();
    error ReserveOverflow();
    error Invariant();

    constructor() ERC20("FoodFi DEX LP Token", "FFI-DEX-LP") {
        factory = msg.sender;
    }

    modifier lock() {
        if (unlocked != 1) revert Locked();
        unlocked = 0;
        _;
        unlocked = 1;
    }

    function initialize(address token0_, address token1_) external {
        if (msg.sender != factory) revert Forbidden();
        if (token0 != address(0) || token1 != address(0)) revert Initialized();
        if (token0_ == address(0) || token1_ == address(0) || token0_ == token1_) {
            revert InvalidTokens();
        }
        token0 = token0_;
        token1 = token1_;
    }

    function mint(address to) external lock returns (uint256 liquidity) {
        if (to == address(0)) revert InvalidRecipient();
        uint256 balance0 = IPairToken(token0).balanceOf(address(this));
        uint256 balance1 = IPairToken(token1).balanceOf(address(this));
        if (balance0 < reserve0 || balance1 < reserve1) revert InvalidAmount();

        uint256 amount0 = balance0 - reserve0;
        uint256 amount1 = balance1 - reserve1;
        uint256 supply = totalSupply;
        if (supply == 0) {
            uint256 root = _sqrt(amount0 * amount1);
            if (root <= MINIMUM_LIQUIDITY) revert InsufficientLiquidity();
            _mint(LOCKED_LIQUIDITY, MINIMUM_LIQUIDITY);
            liquidity = root - MINIMUM_LIQUIDITY;
        } else {
            if (reserve0 == 0 || reserve1 == 0) revert InsufficientLiquidity();
            uint256 liquidity0 = (amount0 * supply) / reserve0;
            uint256 liquidity1 = (amount1 * supply) / reserve1;
            liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
        }
        if (liquidity == 0) revert InsufficientLiquidity();
        _mint(to, liquidity);
        _update(balance0, balance1);
        emit Mint(msg.sender, amount0, amount1);
    }

    function burn(address to) external lock returns (uint256 amount0, uint256 amount1) {
        if (to == address(0) || to == token0 || to == token1) revert InvalidRecipient();
        uint256 liquidity = balanceOf[address(this)];
        uint256 supply = totalSupply;
        if (liquidity == 0 || supply == 0) revert InsufficientLiquidity();

        uint256 balance0 = IPairToken(token0).balanceOf(address(this));
        uint256 balance1 = IPairToken(token1).balanceOf(address(this));
        amount0 = (liquidity * balance0) / supply;
        amount1 = (liquidity * balance1) / supply;
        if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidity();

        _burn(address(this), liquidity);
        _safeTransfer(token0, to, amount0);
        _safeTransfer(token1, to, amount1);
        _update(IPairToken(token0).balanceOf(address(this)), IPairToken(token1).balanceOf(address(this)));
        emit Burn(msg.sender, amount0, amount1, to);
    }

    function swap(uint256 amount0Out, uint256 amount1Out, address to) external lock {
        require(amount0Out > 0 || amount1Out > 0, "INSUFFICIENT_OUTPUT_AMOUNT");
        uint112 _reserve0 = reserve0;
        uint112 _reserve1 = reserve1;
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "INSUFFICIENT_LIQUIDITY");
        if (to == address(0) || to == token0 || to == token1) revert InvalidRecipient();

        if (amount0Out > 0) _safeTransfer(token0, to, amount0Out);
        if (amount1Out > 0) _safeTransfer(token1, to, amount1Out);
        uint256 balance0 = IPairToken(token0).balanceOf(address(this));
        uint256 balance1 = IPairToken(token1).balanceOf(address(this));

        uint256 amount0In = balance0 > uint256(_reserve0) - amount0Out
            ? balance0 - (uint256(_reserve0) - amount0Out)
            : 0;
        uint256 amount1In = balance1 > uint256(_reserve1) - amount1Out
            ? balance1 - (uint256(_reserve1) - amount1Out)
            : 0;
        require(amount0In > 0 || amount1In > 0, "INSUFFICIENT_INPUT_AMOUNT");

        uint256 balance0Adjusted = balance0 * 1000 - amount0In * 3;
        uint256 balance1Adjusted = balance1 * 1000 - amount1In * 3;
        require(
            balance0Adjusted * balance1Adjusted >=
            uint256(_reserve0) * uint256(_reserve1) * 1000 ** 2,
            "K"
        );

        _update(balance0, balance1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    function sync() external lock {
        _update(IPairToken(token0).balanceOf(address(this)), IPairToken(token1).balanceOf(address(this)));
    }

    function _safeTransfer(address token, address to, uint256 amount) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IPairToken.transfer.selector, to, amount)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _update(uint256 balance0, uint256 balance1) private {
        if (balance0 > type(uint112).max || balance1 > type(uint112).max) revert ReserveOverflow();
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = uint32(block.timestamp);
        emit Sync(reserve0, reserve1);
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
