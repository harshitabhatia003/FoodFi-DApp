// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Interface for ERC-20 functions used by the DEX.
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

// =====================================================
// FOODFI TOKEN
// =====================================================
contract FoodFiToken {
    string public name = "FoodFi Token";
    string public symbol = "FOOD";
    uint8 public decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 initialSupply) {
        _mint(msg.sender, initialSupply * 10 ** decimals);
    }

    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "ZERO_ADDRESS");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "ZERO_ADDRESS");
        require(balanceOf[msg.sender] >= amount, "INSUFFICIENT_BALANCE");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(to != address(0), "ZERO_ADDRESS");
        require(balanceOf[from] >= amount, "INSUFFICIENT_BALANCE");
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "INSUFFICIENT_ALLOWANCE");
            allowance[from][msg.sender] = allowed - amount;
        }
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

// =====================================================
// FOODFI REWARD TOKEN
// =====================================================
contract RewardToken {
    string public name = "FoodFi Reward Token";
    string public symbol = "REWARD";
    uint8 public decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 initialSupply) {
        _mint(msg.sender, initialSupply * 10 ** decimals);
    }

    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "ZERO_ADDRESS");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "ZERO_ADDRESS");
        require(balanceOf[msg.sender] >= amount, "INSUFFICIENT_BALANCE");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(to != address(0), "ZERO_ADDRESS");
        require(balanceOf[from] >= amount, "INSUFFICIENT_BALANCE");
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "INSUFFICIENT_ALLOWANCE");
            allowance[from][msg.sender] = allowed - amount;
        }
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

// =====================================================
// FOODFI LIQUIDITY PAIR AND LP TOKEN
// =====================================================
contract FoodFiPair {
    string public name = "FoodFi LP Token";
    string public symbol = "FOOD-LP";
    uint8 public decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public factory;
    address public token0;
    address public token1;

    uint112 public reserve0;
    uint112 public reserve1;

    // 1000 raw units (not 1000 whole LP tokens) are permanently locked.
    uint256 private constant MINIMUM_LIQUIDITY = 1000;
    address private constant LOCKED_LIQUIDITY = address(0);

    // Simple reentrancy lock.
    uint256 private unlocked = 1;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    constructor() {
        factory = msg.sender;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "FORBIDDEN");
        _;
    }

    modifier lock() {
        require(unlocked == 1, "LOCKED");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    function initialize(address _token0, address _token1) external onlyFactory {
        require(token0 == address(0) && token1 == address(0), "INITIALIZED");
        require(
            _token0 != address(0) && _token1 != address(0) && _token0 != _token1,
            "INVALID_TOKENS"
        );
        token0 = _token0;
        token1 = _token1;
    }

    function _mint(address to, uint256 amount) private {
        // The zero address can only receive the intentionally locked minimum liquidity.
        require(to != address(0) || amount == MINIMUM_LIQUIDITY, "INVALID_MINT");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) private {
        require(from != address(0), "ZERO_ADDRESS");
        require(balanceOf[from] >= amount, "INSUFFICIENT_LP");
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "ZERO_ADDRESS");
        require(balanceOf[msg.sender] >= amount, "INSUFFICIENT_LP");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(from != address(0) && to != address(0), "ZERO_ADDRESS");
        require(balanceOf[from] >= amount, "INSUFFICIENT_LP");
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "INSUFFICIENT_ALLOWANCE");
            allowance[from][msg.sender] = allowed - amount;
        }
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    // Creates LP shares from tokens already deposited in this pair.
    function mint(address to) external lock returns (uint256 liquidity) {
        require(to != address(0), "INVALID_RECIPIENT");
        require(token0 != address(0) && token1 != address(0), "PAIR_NOT_INITIALIZED");

        uint256 balance0 = _balanceOf(token0);
        uint256 balance1 = _balanceOf(token1);
        require(balance0 >= reserve0 && balance1 >= reserve1, "BAD_BALANCE");

        uint256 amount0 = balance0 - reserve0;
        uint256 amount1 = balance1 - reserve1;
        uint256 supply = totalSupply;

        if (supply == 0) {
            uint256 root = _sqrt(amount0 * amount1);
            require(root > MINIMUM_LIQUIDITY, "INSUFFICIENT_LIQUIDITY");
            liquidity = root - MINIMUM_LIQUIDITY;
            _mint(LOCKED_LIQUIDITY, MINIMUM_LIQUIDITY);
        } else {
            require(reserve0 > 0 && reserve1 > 0, "INVALID_RESERVES");
            uint256 liquidity0 = (amount0 * supply) / reserve0;
            uint256 liquidity1 = (amount1 * supply) / reserve1;
            liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
        }

        require(liquidity > 0, "INSUFFICIENT_LP_TOKENS");
        _mint(to, liquidity);
        _update(balance0, balance1);
        emit Mint(msg.sender, amount0, amount1);
    }

    // Transfer LP tokens to the pair first, then call burn(recipient).
    function burn(address to) external lock returns (uint256 amount0, uint256 amount1) {
        require(to != address(0) && to != token0 && to != token1, "INVALID_RECIPIENT");

        uint256 liquidity = balanceOf[address(this)];
        uint256 supply = totalSupply;
        require(liquidity > 0 && supply > 0, "NO_LIQUIDITY");

        uint256 balance0 = _balanceOf(token0);
        uint256 balance1 = _balanceOf(token1);

        amount0 = (liquidity * balance0) / supply;
        amount1 = (liquidity * balance1) / supply;
        require(amount0 > 0 && amount1 > 0, "INSUFFICIENT_LIQUIDITY_BURNED");

        _burn(address(this), liquidity);
        _safeTransfer(token0, to, amount0);
        _safeTransfer(token1, to, amount1);

        _update(_balanceOf(token0), _balanceOf(token1));
        emit Burn(msg.sender, amount0, amount1);
    }

    // AMM swap with a 0.3% fee. Tokens must be sent to the pair before this call.
    function swap(uint256 amount0Out, uint256 amount1Out, address to) external lock {
        require(amount0Out > 0 || amount1Out > 0, "INSUFFICIENT_OUTPUT_AMOUNT");

        uint112 _reserve0 = reserve0;
        uint112 _reserve1 = reserve1;
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "INSUFFICIENT_LIQUIDITY");
        require(to != address(0) && to != token0 && to != token1, "INVALID_RECIPIENT");

        if (amount0Out > 0) _safeTransfer(token0, to, amount0Out);
        if (amount1Out > 0) _safeTransfer(token1, to, amount1Out);

        uint256 balance0 = _balanceOf(token0);
        uint256 balance1 = _balanceOf(token1);

        uint256 amount0In = balance0 > uint256(_reserve0) - amount0Out
            ? balance0 - (uint256(_reserve0) - amount0Out)
            : 0;
        uint256 amount1In = balance1 > uint256(_reserve1) - amount1Out
            ? balance1 - (uint256(_reserve1) - amount1Out)
            : 0;

        require(amount0In > 0 || amount1In > 0, "INSUFFICIENT_INPUT_AMOUNT");

        // 997/1000 applies the 0.3% trading fee to the input.
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

    function _balanceOf(address token) private view returns (uint256) {
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("balanceOf(address)", address(this))
        );
        require(success && data.length >= 32, "BALANCE_QUERY_FAILED");
        return abi.decode(data, (uint256));
    }

    function _safeTransfer(address token, address to, uint256 value) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, value)
        );
        require(success && (data.length == 0 || (data.length >= 32 && abi.decode(data, (bool)))), "TRANSFER_FAILED");
    }

    function _update(uint256 balance0, uint256 balance1) private {
        require(
            balance0 <= type(uint112).max && balance1 <= type(uint112).max,
            "RESERVE_OVERFLOW"
        );
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
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

// =====================================================
// FOODFI FACTORY
// =====================================================
contract FoodFiFactory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256 pairCount
    );

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        require(tokenA != address(0) && tokenB != address(0), "ZERO_ADDRESS");

        (address token0_, address token1_) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);

        require(getPair[token0_][token1_] == address(0), "PAIR_EXISTS");

        FoodFiPair newPair = new FoodFiPair();
        newPair.initialize(token0_, token1_);
        pair = address(newPair);

        getPair[token0_][token1_] = pair;
        getPair[token1_][token0_] = pair;
        allPairs.push(pair);

        emit PairCreated(token0_, token1_, pair, allPairs.length);
    }
}
