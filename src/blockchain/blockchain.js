// ============================================
// BLOCKCHAIN SERVICE - Ethers.js v6
// ============================================
// This file handles all Web3 interactions:
// - MetaMask detection and connection
// - Account management
// - Contract interactions (FOODToken & FoodFi)
// - Network/Chain validation
// - Transaction waiting and confirmation

import { ethers } from 'ethers';
import { 
  FOOD_TOKEN_ADDRESS, 
  FOODFI_ADDRESS,
  GANACHE_CHAIN_ID 
} from '../config/contracts.js';
import FOOD_TOKEN_ABI from '../config/FOOD_TOKEN_ABI.json';
import FOODFI_ABI from '../config/FOODFI_ABI.json';

// ============================================
// STATE & EVENT LISTENERS
// ============================================

let provider = null;
let signer = null;
let foodTokenContract = null;
let foodFiContract = null;
let currentAccount = null;
let currentChainId = null;

// Event callbacks (can be set by React components)
export const blockchainEvents = {
  onAccountChanged: null,
  onNetworkChanged: null,
  onConnected: null,
  onDisconnected: null,
};

// ============================================
// 1. DETECT METAMASK
// ============================================

/**
 * Check if MetaMask is installed in the browser
 * @returns {boolean} true if MetaMask is detected
 */
export async function detectMetaMask() {
  if (typeof window === 'undefined') return false;
  
  const hasMetaMask = window.ethereum !== undefined;
  console.log('MetaMask detected:', hasMetaMask);
  
  return hasMetaMask;
}

/**
 * Get the MetaMask provider object
 * @returns {object|null} window.ethereum or null
 */
export function getMetaMaskProvider() {
  if (typeof window === 'undefined') return null;
  return window.ethereum || null;
}

// ============================================
// 2. CONNECT WALLET (MetaMask)
// ============================================

/**
 * Connect wallet - prompts user to approve connection
 * This will trigger MetaMask popup asking for permission
 * @returns {Promise<string>} Connected account address
 */
export async function connectWallet() {
  try {
    const detected = await detectMetaMask();
    if (!detected) {
      throw new Error('MetaMask not installed. Please install MetaMask extension.');
    }

    const ethProvider = getMetaMaskProvider();
    
    // Request account access
    const accounts = await ethProvider.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please unlock MetaMask.');
    }

    // Initialize Ethers.js provider and signer
    provider = new ethers.BrowserProvider(ethProvider);
    signer = await provider.getSigner();
    
    currentAccount = accounts[0];
    console.log('✅ Wallet connected:', currentAccount);

    // Get current chain ID
    const network = await provider.getNetwork();
    currentChainId = Number(network.chainId);
    console.log('Connected to chain ID:', currentChainId);

    // Validate network
    if (currentChainId !== GANACHE_CHAIN_ID) {
      console.warn(
        `⚠️ Wrong network! Expected chain ID ${GANACHE_CHAIN_ID}, got ${currentChainId}`
      );
      throw new Error(
        `Please switch to Ganache network (Chain ID: ${GANACHE_CHAIN_ID})`
      );
    }

    // Initialize contracts
    initializeContracts();

    // Set up listeners
    setupListeners();

    // Trigger connected event
    if (blockchainEvents.onConnected) {
      blockchainEvents.onConnected(currentAccount);
    }

    return currentAccount;
  } catch (error) {
    console.error('❌ Wallet connection failed:', error);
    throw error;
  }
}

// ============================================
// 3. INITIALIZE CONTRACTS
// ============================================

/**
 * Initialize contract instances using Ethers.js
 * Requires: provider, signer, and valid contract addresses
 */
function initializeContracts() {
  if (!provider || !signer) {
    throw new Error('Provider or signer not initialized. Connect wallet first.');
  }

  if (!FOOD_TOKEN_ADDRESS || FOOD_TOKEN_ADDRESS.includes('REPLACE')) {
    throw new Error(
      '❌ FOOD_TOKEN_ADDRESS not set in src/config/contracts.js\n' +
      'Please replace the placeholder with your actual contract address from Remix.'
    );
  }

  if (!FOODFI_ADDRESS || FOODFI_ADDRESS.includes('REPLACE')) {
    throw new Error(
      '❌ FOODFI_ADDRESS not set in src/config/contracts.js\n' +
      'Please replace the placeholder with your actual contract address from Remix.'
    );
  }

  // Create contract instances (read & write operations)
  foodTokenContract = new ethers.Contract(
    FOOD_TOKEN_ADDRESS,
    FOOD_TOKEN_ABI,
    signer
  );

  foodFiContract = new ethers.Contract(
    FOODFI_ADDRESS,
    FOODFI_ABI,
    signer
  );

  console.log('✅ Contracts initialized');
}

// ============================================
// 4. GET ACCOUNT INFORMATION
// ============================================

/**
 * Get currently connected account
 * @returns {string} Account address (0x...)
 */
export function getCurrentAccount() {
  return currentAccount;
}

/**
 * Get account balance in Ganache (ETH)
 * @returns {Promise<string>} Balance in ETH
 */
export async function getAccountBalance() {
  try {
    if (!provider || !currentAccount) {
      throw new Error('Wallet not connected');
    }

    const balance = await provider.getBalance(currentAccount);
    const ethBalance = ethers.formatEther(balance);
    
    console.log('Account balance:', ethBalance, 'ETH');
    return ethBalance;
  } catch (error) {
    console.error('❌ Error getting balance:', error);
    throw error;
  }
}

// ============================================
// 5. CHECK NETWORK
// ============================================

/**
 * Get current network information
 * @returns {Promise<object>} { chainId, name, provider }
 */
export async function getNetworkInfo() {
  try {
    if (!provider) {
      throw new Error('Provider not initialized');
    }

    const network = await provider.getNetwork();
    return {
      chainId: Number(network.chainId),
      name: network.name,
      ensAddress: network.ensAddress,
    };
  } catch (error) {
    console.error('❌ Error getting network info:', error);
    throw error;
  }
}

/**
 * Verify connected to correct Ganache network
 * @returns {boolean} true if connected to Ganache (chain ID 1337)
 */
export async function isConnectedToGanache() {
  try {
    const network = await getNetworkInfo();
    const isGanache = network.chainId === GANACHE_CHAIN_ID;
    
    if (!isGanache) {
      console.warn(`⚠️ Not on Ganache! Current chain ID: ${network.chainId}`);
    }
    
    return isGanache;
  } catch (error) {
    console.error('Error checking network:', error);
    return false;
  }
}

// ============================================
// 6. FOOD TOKEN FUNCTIONS
// ============================================

/**
 * Get FOODToken balance for an account
 * Calls: FOODToken.balanceOf(account)
 * @param {string} account - Account address
 * @returns {Promise<string>} Balance in FOOD tokens
 */
export async function getFOODTokenBalance(account) {
  try {
    if (!foodTokenContract) {
      throw new Error('FOODToken contract not initialized');
    }

    const balance = await foodTokenContract.balanceOf(account);
    const formattedBalance = ethers.formatUnits(balance, 18); // 18 decimals for ERC20
    
    console.log(`FOODToken balance for ${account}:`, formattedBalance);
    return formattedBalance;
  } catch (error) {
    console.error('❌ Error getting FOODToken balance:', error);
    throw error;
  }
}

/**
 * Get current account's FOODToken balance
 * @returns {Promise<string>} Balance in FOOD tokens
 */
export async function getMyFOODBalance() {
  if (!currentAccount) {
    throw new Error('Wallet not connected');
  }
  return getFOODTokenBalance(currentAccount);
}

/**
 * Approve FOODToken spending by FoodFi contract
 * Required before calling FoodFi functions that transfer tokens
 * Calls: FOODToken.approve(foodFiAddress, amount)
 * @param {string} amount - Amount to approve (in FOOD)
 * @returns {Promise<object>} Transaction receipt
 */
export async function approveFOODToken(amount) {
  try {
    if (!foodTokenContract) {
      throw new Error('FOODToken contract not initialized');
    }

    const amountToApprove = ethers.parseUnits(amount, 18);
    
    console.log(`Approving ${amount} FOOD tokens for FoodFi contract...`);
    
    const tx = await foodTokenContract.approve(FOODFI_ADDRESS, amountToApprove);
    
    console.log('📤 Approval transaction sent:', tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    console.log('✅ Approval confirmed:', receipt.hash);
    return receipt;
  } catch (error) {
    console.error('❌ Approval failed:', error);
    throw error;
  }
}

// ============================================
// 7. FOODFI CONTRACT FUNCTIONS
// ============================================

/**
 * Record food saving for a participant
 * Calls: FoodFi.recordFoodSaving(participant, foodSavedKg)
 * This transaction will:
 * 1. Show confirmation in MetaMask
 * 2. Wait for blockchain confirmation
 * @param {string} participant - Participant address
 * @param {number} foodSavedKg - Amount of food saved in kg
 * @returns {Promise<object>} Transaction receipt
 */
export async function recordFoodSaving(participant, foodSavedKg) {
  try {
    if (!foodFiContract) {
      throw new Error('FoodFi contract not initialized');
    }

    if (!participant || !ethers.isAddress(participant)) {
      throw new Error('Invalid participant address');
    }

    if (foodSavedKg <= 0) {
      throw new Error('Food saved must be greater than 0 kg');
    }

    console.log(`Recording ${foodSavedKg}kg food saved for ${participant}...`);
    
    // Send transaction
    const tx = await foodFiContract.recordFoodSaving(participant, foodSavedKg);
    
    console.log('📤 Transaction sent:', tx.hash);
    console.log('⏳ Waiting for confirmation...');
    
    // IMPORTANT: Wait for blockchain confirmation
    // This is when the transaction is mined and included in a block
    const receipt = await tx.wait();
    
    console.log('✅ Transaction confirmed:', receipt.hash);
    console.log('Block number:', receipt.blockNumber);
    
    return receipt;
  } catch (error) {
    console.error('❌ recordFoodSaving failed:', error);
    throw error;
  }
}

/**
 * Get participant statistics from FoodFi
 * Calls: FoodFi.getParticipantStats(participant)
 * @param {string} participant - Participant address
 * @returns {Promise<object>} { foodSavedKg, rewardsEarned, participationCount }
 */
export async function getParticipantStats(participant) {
  try {
    if (!foodFiContract) {
      throw new Error('FoodFi contract not initialized');
    }

    if (!participant || !ethers.isAddress(participant)) {
      throw new Error('Invalid participant address');
    }

    console.log('Fetching participant stats for', participant);
    
    const stats = await foodFiContract.getParticipantStats(participant);
    
    // Convert BigNumber to readable format
    const formattedStats = {
      foodSavedKg: stats.foodSavedKg.toString(),
      rewardsEarned: ethers.formatUnits(stats.rewardsEarned, 18),
      participationCount: stats.participationCount.toString(),
    };
    
    console.log('Participant stats:', formattedStats);
    return formattedStats;
  } catch (error) {
    console.error('❌ Error getting participant stats:', error);
    throw error;
  }
}

/**
 * Get current account's FoodFi statistics
 * @returns {Promise<object>} Stats object
 */
export async function getMyStats() {
  if (!currentAccount) {
    throw new Error('Wallet not connected');
  }
  return getParticipantStats(currentAccount);
}

/**
 * Set reward rate in FoodFi contract
 * Calls: FoodFi.setRewardRate(_rate)
 * @param {number} rate - New reward rate
 * @returns {Promise<object>} Transaction receipt
 */
export async function setRewardRate(rate) {
  try {
    if (!foodFiContract) {
      throw new Error('FoodFi contract not initialized');
    }

    console.log(`Setting reward rate to ${rate}...`);
    
    const tx = await foodFiContract.setRewardRate(rate);
    console.log('📤 Transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('✅ Reward rate set:', receipt.hash);
    
    return receipt;
  } catch (error) {
    console.error('❌ setRewardRate failed:', error);
    throw error;
  }
}

/**
 * Deposit rewards to FoodFi contract
 * Calls: FoodFi.depositRewards(amount)
 * REQUIRES: Prior approval of FOODToken
 * @param {string} amount - Amount in FOOD tokens
 * @returns {Promise<object>} Transaction receipt
 */
export async function depositRewards(amount) {
  try {
    if (!foodFiContract) {
      throw new Error('FoodFi contract not initialized');
    }

    const amountToDeposit = ethers.parseUnits(amount, 18);
    
    console.log(`Depositing ${amount} FOOD tokens to FoodFi...`);
    
    const tx = await foodFiContract.depositRewards(amountToDeposit);
    console.log('📤 Transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('✅ Reward deposited:', receipt.hash);
    
    return receipt;
  } catch (error) {
    console.error('❌ depositRewards failed:', error);
    throw error;
  }
}

// ============================================
// 8. LISTEN TO EVENTS
// ============================================

/**
 * Set up MetaMask event listeners for:
 * - Account changes
 * - Network changes
 */
function setupListeners() {
  const ethProvider = getMetaMaskProvider();
  
  if (!ethProvider) return;

  // Listen for account changes
  ethProvider.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) {
      console.log('Account disconnected');
      currentAccount = null;
      if (blockchainEvents.onDisconnected) {
        blockchainEvents.onDisconnected();
      }
    } else {
      currentAccount = accounts[0];
      console.log('Account changed to:', currentAccount);
      if (blockchainEvents.onAccountChanged) {
        blockchainEvents.onAccountChanged(currentAccount);
      }
    }
  });

  // Listen for network changes
  ethProvider.on('chainChanged', (chainId) => {
    currentChainId = parseInt(chainId, 16);
    console.log('Network changed to chain ID:', currentChainId);
    
    if (blockchainEvents.onNetworkChanged) {
      blockchainEvents.onNetworkChanged(currentChainId);
    }
    
    // Reinitialize provider if network changed
    provider = new ethers.BrowserProvider(ethProvider);
  });
}

// ============================================
// 9. DISCONNECT WALLET
// ============================================

/**
 * Disconnect wallet (MetaMask specific)
 * Note: This only clears local state. User must disconnect in MetaMask UI.
 */
export function disconnectWallet() {
  provider = null;
  signer = null;
  foodTokenContract = null;
  foodFiContract = null;
  currentAccount = null;
  currentChainId = null;
  
  console.log('Wallet disconnected');
  
  if (blockchainEvents.onDisconnected) {
    blockchainEvents.onDisconnected();
  }
}

// ============================================
// 10. UTILITY FUNCTIONS
// ============================================

/**
 * Check if wallet is connected
 * @returns {boolean}
 */
export function isWalletConnected() {
  return currentAccount !== null;
}

/**
 * Register event callback
 * @param {string} eventName - 'onAccountChanged', 'onNetworkChanged', 'onConnected', 'onDisconnected'
 * @param {function} callback - Function to call
 */
export function registerEventListener(eventName, callback) {
  if (blockchainEvents.hasOwnProperty(eventName)) {
    blockchainEvents[eventName] = callback;
  }
}

export default {
  detectMetaMask,
  getMetaMaskProvider,
  connectWallet,
  getCurrentAccount,
  getAccountBalance,
  getNetworkInfo,
  isConnectedToGanache,
  getFOODTokenBalance,
  getMyFOODBalance,
  approveFOODToken,
  recordFoodSaving,
  getParticipantStats,
  getMyStats,
  setRewardRate,
  depositRewards,
  disconnectWallet,
  isWalletConnected,
  registerEventListener,
  blockchainEvents,
};
