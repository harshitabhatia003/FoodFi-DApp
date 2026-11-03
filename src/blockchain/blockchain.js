import { BrowserProvider, Contract, ethers } from "ethers";
import { ABIS } from "../config/abis.js";
import { DEPLOYED_CHAIN_ID, DEPLOYMENT, GANACHE_RPC_URL } from "../config/contracts.js";

let provider = null;
let signer = null;

function getEthereum() {
  const injected = typeof window === "undefined" ? null : window.ethereum;
  const providers = injected?.providers?.length ? injected.providers : [injected];
  const ethereum = providers.find((candidate) => candidate?.isMetaMask)
    || providers.find((candidate) => typeof candidate?.request === "function");
  if (!ethereum) {
    throw new Error(
      "No browser wallet was found. Install and unlock MetaMask, then open FoodFi in the same browser profile.",
    );
  }
  return ethereum;
}

async function initializeProvider(address) {
  provider = new BrowserProvider(getEthereum());
  signer = address ? await provider.getSigner(address) : null;
  return provider.getNetwork();
}

export async function connectWallet() {
  const ethereum = getEthereum();
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  if (!accounts?.length) throw new Error("No wallet account was selected.");
  const network = await initializeProvider(accounts[0]);
  return {
    account: ethers.getAddress(accounts[0]),
    chainId: Number(network.chainId),
    networkName: network.name,
  };
}

export async function restoreWallet() {
  const ethereum = getEthereum();
  const accounts = await ethereum.request({ method: "eth_accounts" });
  if (!accounts?.length) return null;
  const network = await initializeProvider(accounts[0]);
  return {
    account: ethers.getAddress(accounts[0]),
    chainId: Number(network.chainId),
    networkName: network.name,
  };
}

export async function switchNetwork() {
  const ethereum = getEthereum();
  const chainIdHex = `0x${DEPLOYED_CHAIN_ID.toString(16)}`;
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (error) {
    if (error?.code !== 4902) throw error;
    if (DEPLOYED_CHAIN_ID !== 1337) {
      throw new Error(
        `Add chain ${DEPLOYED_CHAIN_ID} to MetaMask using the RPC URL for your deployment.`,
        { cause: error },
      );
    }
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: chainIdHex,
        chainName: "FoodFi Local",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: [GANACHE_RPC_URL],
      }],
    });
  }
  const accounts = await ethereum.request({ method: "eth_accounts" });
  if (!accounts?.length) throw new Error("Connect a wallet account before switching networks.");
  const network = await initializeProvider(accounts[0]);
  return {
    account: ethers.getAddress(accounts[0]),
    chainId: Number(network.chainId),
    networkName: network.name,
  };
}

export function clearWallet() {
  provider = null;
  signer = null;
}

export function getWalletProvider() {
  return provider;
}

export function getWalletSigner() {
  return signer;
}

export async function requireContractCode(name) {
  if (!provider) throw new Error("Connect a wallet before checking deployed contracts.");
  const address = DEPLOYMENT.contracts?.[name];
  if (!address) throw new Error(`The ${name} contract address is not configured.`);
  const code = await provider.getCode(address);
  if (code === "0x") {
    throw new Error(
      `No ${name} contract is deployed at ${address} on chain ${DEPLOYED_CHAIN_ID}. ` +
      "Deploy FoodFi to your Ganache network on port 7545 with `npm run deploy:local`, then refresh.",
    );
  }
}

export function getContract(name, write = false) {
  if (!provider) throw new Error("Connect a wallet before reading contract data.");
  const address = DEPLOYMENT.contracts?.[name];
  const abi = ABIS[name];
  if (!address || !abi) {
    throw new Error(`The ${name} contract is not deployed or configured for this network.`);
  }
  if (write && !signer) throw new Error("Connect a wallet before sending a transaction.");
  return new Contract(address, abi, write ? signer : provider);
}

export async function getNativeBalance(address) {
  if (!provider) throw new Error("Wallet provider is not initialized.");
  return ethers.formatEther(await provider.getBalance(address));
}

export async function getWalletSnapshot(address) {
  if (!provider) throw new Error("Wallet provider is not initialized.");
  const nativeBalance = await getNativeBalance(address);
  const contracts = DEPLOYMENT.contracts || {};
  if (!contracts.foodToken || !contracts.foodRewards) {
    return { nativeBalance, foodBalance: null, participantStats: null, orderCount: null };
  }

  await requireContractCode("foodToken");
  await requireContractCode("foodRewards");
  const token = getContract("foodToken");
  const rewards = getContract("foodRewards");
  const orders = contracts.orders ? getContract("orders") : null;
  if (orders) await requireContractCode("orders");
  const [foodRaw, stats, orderCount] = await Promise.all([
    token.balanceOf(address),
    rewards.getParticipantStats(address),
    orders ? orders.orderCount(address) : null,
  ]);
  return {
    nativeBalance,
    foodBalance: ethers.formatUnits(foodRaw, await token.decimals()),
    participantStats: {
      foodSavedKg: stats.foodSavedKg.toString(),
      rewardsEarned: ethers.formatUnits(stats.rewardsEarned, await token.decimals()),
      participationCount: stats.participationCount.toString(),
    },
    orderCount: orderCount?.toString() ?? null,
  };
}

export async function readContract(name, method, args = []) {
  const contract = getContract(name);
  if (typeof contract[method] !== "function") {
    throw new Error(`The ${method} read is not available on the ${name} contract.`);
  }
  return contract[method](...args);
}

export async function sendContractTransaction(name, method, args = [], onSubmitted = () => {}) {
  const contract = getContract(name, true);
  if (typeof contract[method] !== "function") {
    throw new Error(`The ${method} transaction is not available on the ${name} contract.`);
  }
  const transaction = await contract[method](...args);
  onSubmitted(transaction.hash);
  const receipt = await transaction.wait();
  if (!receipt || receipt.status !== 1) {
    throw new Error(`Transaction ${transaction.hash} was not confirmed successfully.`);
  }
  return { hash: transaction.hash, blockNumber: receipt.blockNumber, receipt };
}

export function formatWalletError(error) {
  if (error?.code === "ACTION_REJECTED" || error?.code === 4001) {
    return "Transaction was rejected in the wallet.";
  }
  if (error?.code === -32002) {
    return "MetaMask cannot reach this network's RPC endpoint. Check that Ganache is running at http://127.0.0.1:7545 and that MetaMask is using that same RPC URL.";
  }
  if (error?.code === "CALL_EXCEPTION") {
    return "A contract read failed. Confirm MetaMask is on chain 1337 and deploy the FoodFi contracts to the same Ganache network.";
  }
  return error?.shortMessage || error?.reason || error?.message || "Blockchain request failed.";
}
