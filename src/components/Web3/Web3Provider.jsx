// ============================================
// WEB3 CONTEXT - Global Blockchain State
// ============================================
// Provides blockchain state to entire React app via Context API
// Usage: Wrap your App component with <Web3Provider>

import React, { createContext, useContext, useState, useEffect } from 'react';
import * as blockchainService from '../blockchain/blockchain.js';

// Create context
const Web3Context = createContext(null);

// ============================================
// WEB3 PROVIDER COMPONENT
// ============================================

export function Web3Provider({ children }) {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState('0');
  const [foodBalance, setFoodBalance] = useState('0');
  const [chainId, setChainId] = useState(null);
  const [isGanache, setIsGanache] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [participantStats, setParticipantStats] = useState(null);
  const [transactionInProgress, setTransactionInProgress] = useState(false);

  // ============================================
  // INITIALIZE ON MOUNT
  // ============================================

  useEffect(() => {
    initializeBlockchain();
    setupEventListeners();

    return () => {
      // Cleanup listeners
    };
  }, []);

  // ============================================
  // CHECK IF ALREADY CONNECTED
  // ============================================

  async function initializeBlockchain() {
    try {
      const hasMetaMask = await blockchainService.detectMetaMask();
      
      if (hasMetaMask) {
        const ethProvider = blockchainService.getMetaMaskProvider();
        
        // Check if already connected (cached in MetaMask)
        const accounts = await ethProvider.request({ method: 'eth_accounts' });
        
        if (accounts && accounts.length > 0) {
          // Already connected, do full reconnection
          await handleConnectWallet();
        }
      }
    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  // ============================================
  // SET UP EVENT LISTENERS
  // ============================================

  function setupEventListeners() {
    blockchainService.registerEventListener('onAccountChanged', (newAccount) => {
      setAccount(newAccount);
      refreshBalances(newAccount);
    });

    blockchainService.registerEventListener('onNetworkChanged', (newChainId) => {
      setChainId(newChainId);
      checkGanacheNetwork(newChainId);
    });

    blockchainService.registerEventListener('onConnected', (connectedAccount) => {
      setAccount(connectedAccount);
      setIsConnected(true);
    });

    blockchainService.registerEventListener('onDisconnected', () => {
      setAccount(null);
      setIsConnected(false);
      setBalance('0');
      setFoodBalance('0');
    });
  }

  // ============================================
  // CONNECT WALLET
  // ============================================

  async function handleConnectWallet() {
    try {
      setLoading(true);
      setError(null);

      const connectedAccount = await blockchainService.connectWallet();
      setAccount(connectedAccount);
      setIsConnected(true);

      // Get network info
      const network = await blockchainService.getNetworkInfo();
      setChainId(network.chainId);
      checkGanacheNetwork(network.chainId);

      // Refresh balances
      await refreshBalances(connectedAccount);
    } catch (err) {
      setError(err.message);
      console.error('Connection error:', err);
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // CHECK GANACHE NETWORK
  // ============================================

  function checkGanacheNetwork(chainId) {
    const isGanacheChain = chainId === 1337; // Ganache chain ID
    setIsGanache(isGanacheChain);
    
    if (!isGanacheChain) {
      setError(`Wrong network! Connected to chain ${chainId}, expected 1337 (Ganache)`);
    }
  }

  // ============================================
  // REFRESH BALANCES
  // ============================================

  async function refreshBalances(accountAddress) {
    try {
      // Get ETH balance
      const ethBal = await blockchainService.getAccountBalance();
      setBalance(ethBal);

      // Get FOOD token balance
      const foodBal = await blockchainService.getMyFOODBalance();
      setFoodBalance(foodBal);

      // Get FoodFi stats
      const stats = await blockchainService.getMyStats();
      setParticipantStats(stats);
    } catch (err) {
      console.error('Error refreshing balances:', err);
    }
  }

  // ============================================
  // RECORD FOOD SAVING
  // ============================================

  async function handleRecordFoodSaving(foodSavedKg) {
    try {
      setTransactionInProgress(true);
      setError(null);

      const receipt = await blockchainService.recordFoodSaving(account, foodSavedKg);
      
      // Refresh stats after transaction
      await refreshBalances(account);
      
      return receipt;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setTransactionInProgress(false);
    }
  }

  // ============================================
  // GET FOOD TOKEN BALANCE
  // ============================================

  async function handleGetFOODBalance() {
    try {
      setError(null);
      const bal = await blockchainService.getMyFOODBalance();
      setFoodBalance(bal);
      return bal;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  // ============================================
  // APPROVE FOOD TOKEN
  // ============================================

  async function handleApproveFOOD(amount) {
    try {
      setTransactionInProgress(true);
      setError(null);

      const receipt = await blockchainService.approveFOODToken(amount);
      return receipt;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setTransactionInProgress(false);
    }
  }

  // ============================================
  // GET PARTICIPANT STATS
  // ============================================

  async function handleGetStats() {
    try {
      setError(null);
      const stats = await blockchainService.getMyStats();
      setParticipantStats(stats);
      return stats;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  // ============================================
  // DISCONNECT WALLET
  // ============================================

  function handleDisconnectWallet() {
    blockchainService.disconnectWallet();
    setAccount(null);
    setIsConnected(false);
    setBalance('0');
    setFoodBalance('0');
    setError(null);
  }

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value = {
    // State
    isConnected,
    account,
    balance,
    foodBalance,
    chainId,
    isGanache,
    loading,
    error,
    participantStats,
    transactionInProgress,

    // Functions
    connectWallet: handleConnectWallet,
    disconnectWallet: handleDisconnectWallet,
    recordFoodSaving: handleRecordFoodSaving,
    getFOODBalance: handleGetFOODBalance,
    approveFOOD: handleApproveFOOD,
    getStats: handleGetStats,
    refreshBalances,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

// ============================================
// CUSTOM HOOK - USE WEB3
// ============================================

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
}

export default Web3Context;
