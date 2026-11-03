import deployment from "./deployment.json";

export const GANACHE_CHAIN_ID = 1337;
export const GANACHE_RPC_URL = "http://127.0.0.1:7545";
export const TOKEN_DECIMALS = 18;
export const DEPLOYMENT = deployment;
export const DEPLOYED_CHAIN_ID = Number(deployment.chainId || GANACHE_CHAIN_ID);
export const CONTRACTS = deployment.contracts || {};
export const TOKENS = deployment.tokens || [];

export function getContractAddress(name) {
  return CONTRACTS[name] || null;
}

export default {
  GANACHE_CHAIN_ID,
  GANACHE_RPC_URL,
  TOKEN_DECIMALS,
  DEPLOYMENT,
  DEPLOYED_CHAIN_ID,
  CONTRACTS,
  TOKENS,
  getContractAddress,
};
