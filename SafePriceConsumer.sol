
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AggregatorV3Interface} from
    "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract SafePriceConsumer {
    AggregatorV3Interface public priceFeed;
    uint256 public maxAge;

    constructor(address _priceFeedAddress, uint256 _maxAge) {
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
        maxAge = _maxAge;
    }

    function safePrice() public view returns (int256) {
        (
            ,
            int256 answer,
            ,
            uint256 updatedAt,

        ) = priceFeed.latestRoundData();

        require(answer > 0, "Invalid price");
        require(updatedAt != 0, "Round not complete");
        require(updatedAt <= block.timestamp, "Invalid timestamp");
        require(block.timestamp - updatedAt <= maxAge, "Stale price");

        return answer;
    }

    function getDecimals() public view returns (uint8) {
        return priceFeed.decimals();
    }

    // FoodFi application-specific function:
    // Returns the USD value of an ETH order (in wei),
    // scaled to the Chainlink feed's decimal precision.
    function valueOfOrder(uint256 amountInWei)
        public
        view
        returns (uint256)
    {
        return (amountInWei * uint256(safePrice())) / 1 ether;
    }
}
