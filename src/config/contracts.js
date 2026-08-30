// ============================================
// CONTRACT CONFIGURATION
// ============================================
// IMPORTANT: Replace the placeholder addresses with your ACTUAL contract addresses from Remix
// 
// How to get your addresses:
// 1. Open Remix: https://remix.ethereum.org/
// 2. Click "Deploy & Run Transactions" (left sidebar)
// 3. Scroll down to "Deployed Contracts"
// 4. Copy the address next to FOODToken and FoodFi
// 5. Paste them below, replacing the placeholders
// 6. DO NOT add quotes around the addresses

// Example format (DO NOT USE THESE - GET YOUR ACTUAL ADDRESSES):
// export const FOOD_TOKEN_ADDRESS = "0x1234567890123456789012345678901234567890";
// export const FOODFI_ADDRESS = "0x0987654321098765432109876543210987654321";

// ⚠️ REPLACE THESE WITH YOUR ACTUAL ADDRESSES FROM REMIX
export const FOOD_TOKEN_ADDRESS = "REPLACE_WITH_YOUR_FOOD_TOKEN_ADDRESS_FROM_REMIX";
export const FOODFI_ADDRESS = "REPLACE_WITH_YOUR_FOODFI_ADDRESS_FROM_REMIX";

// Ganache network configuration
export const GANACHE_NETWORK_ID = "1337";
export const GANACHE_RPC_URL = "http://127.0.0.1:8545";
export const GANACHE_CHAIN_ID = 1337;

// Contract decimals (standard for ERC20)
export const TOKEN_DECIMALS = 18;

// Default gas settings
export const GAS_LIMIT = "300000";
export const GAS_PRICE = "2000000000"; // 2 Gwei

export default {
  FOOD_TOKEN_ADDRESS,
  FOODFI_ADDRESS,
  GANACHE_NETWORK_ID,
  GANACHE_RPC_URL,
  GANACHE_CHAIN_ID,
  TOKEN_DECIMALS,
  GAS_LIMIT,
  GAS_PRICE,
};
