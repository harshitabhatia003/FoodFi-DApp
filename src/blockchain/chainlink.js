import { BrowserProvider, Contract, getAddress } from "ethers";
import { getEthereum } from "./blockchain.js";
import safePriceConsumerAbi from "../config/abis/safePriceConsumer.json";
import {
  CHAINLINK_ETH_USD_FEED_ADDRESS,
  CHAINLINK_SEPOLIA_CHAIN_ID,
  SAFE_PRICE_CONSUMER_ADDRESS,
} from "../config/chainlink.js";

export async function readSafePriceQuote(amountInWei, basketAmountInWei) {
  if (amountInWei !== null && (typeof amountInWei !== "bigint" || amountInWei < 0n)) {
    throw new Error("The demonstration amount must be a non-negative wei value.");
  }
  if (typeof basketAmountInWei !== "bigint" || basketAmountInWei < 0n) {
    throw new Error("The basket amount must be a non-negative wei value.");
  }

  const provider = new BrowserProvider(getEthereum());
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(CHAINLINK_SEPOLIA_CHAIN_ID)) {
    throw new Error(`Chainlink price reads require Sepolia (chain ${CHAINLINK_SEPOLIA_CHAIN_ID}).`);
  }

  const contractCode = await provider.getCode(SAFE_PRICE_CONSUMER_ADDRESS);
  if (contractCode === "0x") {
    throw new Error(
      `No SafePriceConsumer contract is deployed at ${SAFE_PRICE_CONSUMER_ADDRESS} on Sepolia.`,
    );
  }

  const contract = new Contract(SAFE_PRICE_CONSUMER_ADDRESS, safePriceConsumerAbi, provider);
  const blockNumber = await provider.getBlockNumber();
  const blockTag = { blockTag: blockNumber };
  const configuredFeed = await contract.priceFeed(blockTag);
  if (getAddress(configuredFeed) !== getAddress(CHAINLINK_ETH_USD_FEED_ADDRESS)) {
    throw new Error("The deployed SafePriceConsumer is configured with an unexpected ETH/USD feed.");
  }

  const [price, decimals, orderValue, basketValue] = await Promise.all([
    contract.safePrice(blockTag),
    contract.getDecimals(blockTag),
    amountInWei === null ? Promise.resolve(null) : contract.valueOfOrder(amountInWei, blockTag),
    contract.valueOfOrder(basketAmountInWei, blockTag),
  ]);

  return {
    price,
    decimals: Number(decimals),
    orderValue,
    basketValue,
    blockNumber,
  };
}

export async function switchToSepolia() {
  const ethereum = typeof window === "undefined" ? null : window.ethereum;
  if (!ethereum?.request) {
    throw new Error("No browser wallet is available to switch to Sepolia.");
  }

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${CHAINLINK_SEPOLIA_CHAIN_ID.toString(16)}` }],
    });
  } catch (error) {
    if (error?.code === 4902) {
      throw new Error("Sepolia is not configured in MetaMask. Add the Sepolia test network, then try again.", {
        cause: error,
      });
    }
    throw error;
  }
}
