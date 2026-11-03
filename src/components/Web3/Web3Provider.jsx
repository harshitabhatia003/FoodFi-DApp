import { useCallback, useEffect, useMemo, useState } from "react";
import * as blockchainService from "../../blockchain/blockchain.js";
import { DEPLOYED_CHAIN_ID, DEPLOYMENT } from "../../config/contracts.js";
import { Web3Context } from "./Web3Context.js";

function getMessage(error) {
  return blockchainService.formatWalletError(error);
}

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [networkName, setNetworkName] = useState("");
  const [balance, setBalance] = useState(null);
  const [foodBalance, setFoodBalance] = useState(null);
  const [participantStats, setParticipantStats] = useState(null);
  const [orderCount, setOrderCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transactionInProgress, setTransactionInProgress] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [error, setError] = useState(null);

  const isConnected = Boolean(account);
  const isCorrectNetwork = chainId === DEPLOYED_CHAIN_ID;
  const isConfigured = Boolean(
    DEPLOYMENT.contracts?.foodToken &&
    DEPLOYMENT.contracts?.orders &&
    DEPLOYMENT.contracts?.foodRewards &&
    DEPLOYMENT.contracts?.vault &&
    DEPLOYMENT.contracts?.liquidityPool &&
    DEPLOYMENT.contracts?.ammLpToken &&
    DEPLOYMENT.contracts?.farm &&
    DEPLOYMENT.contracts?.router &&
    DEPLOYMENT.contracts?.factory &&
    DEPLOYMENT.contracts?.dexPair &&
    DEPLOYMENT.contracts?.dexUsd &&
    DEPLOYMENT.contracts?.dexBridge,
  );
  const isGanache = isCorrectNetwork;

  const refreshBalances = useCallback(async (address = account, walletChainId = chainId) => {
    if (!address) return;
    try {
      if (walletChainId !== DEPLOYED_CHAIN_ID) {
        setBalance(await blockchainService.getNativeBalance(address));
        setFoodBalance(null);
        setParticipantStats(null);
        setOrderCount(null);
        return;
      }
      const snapshot = await blockchainService.getWalletSnapshot(address);
      setBalance(snapshot.nativeBalance);
      setFoodBalance(snapshot.foodBalance);
      setParticipantStats(snapshot.participantStats);
      setOrderCount(snapshot.orderCount);
    } catch (refreshError) {
      setError(getMessage(refreshError));
      throw refreshError;
    }
  }, [account, chainId]);

  const applyWallet = useCallback((wallet) => {
    if (!wallet) {
      blockchainService.clearWallet();
      setAccount(null);
      setChainId(null);
      setNetworkName("");
      setBalance(null);
      setFoodBalance(null);
      setParticipantStats(null);
      setOrderCount(null);
      return;
    }
    setAccount(wallet.account);
    setChainId(wallet.chainId);
    setNetworkName(wallet.networkName);
    setError(null);
    void refreshBalances(wallet.account, wallet.chainId).catch((refreshError) => {
      setError(`Wallet connected, but network data could not be loaded. ${getMessage(refreshError)}`);
    });
  }, [refreshBalances]);

  const connectWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await applyWallet(await blockchainService.connectWallet());
    } catch (connectError) {
      setError(getMessage(connectError));
      throw connectError;
    } finally {
      setLoading(false);
    }
  }, [applyWallet]);

  const switchNetwork = useCallback(async () => {
    setError(null);
    try {
      await applyWallet(await blockchainService.switchNetwork());
    } catch (switchError) {
      setError(getMessage(switchError));
      throw switchError;
    }
  }, [applyWallet]);

  const disconnectWallet = useCallback(() => {
    blockchainService.clearWallet();
    setAccount(null);
    setChainId(null);
    setNetworkName("");
    setBalance(null);
    setFoodBalance(null);
    setParticipantStats(null);
    setOrderCount(null);
    setTransaction(null);
    setError(null);
  }, []);

  useEffect(() => {
    let active = true;
    const ethereum = typeof window !== "undefined" ? window.ethereum : null;

    const restore = async () => {
      if (!ethereum) return;
      try {
        const wallet = await blockchainService.restoreWallet();
        if (active && wallet) await applyWallet(wallet);
      } catch (restoreError) {
        if (active) setError(getMessage(restoreError));
      }
    };

    const handleAccountsChanged = async (accounts) => {
      if (!accounts?.length) {
        disconnectWallet();
        return;
      }
      try {
        const wallet = await blockchainService.restoreWallet();
        if (active && wallet) await applyWallet(wallet);
      } catch (walletError) {
        if (active) setError(getMessage(walletError));
      }
    };

    const handleChainChanged = async (chain) => {
      const nextChainId = Number(BigInt(chain));
      setChainId(nextChainId);
      try {
        const wallet = await blockchainService.restoreWallet();
        if (active && wallet) await applyWallet(wallet);
      } catch (walletError) {
        if (active) setError(getMessage(walletError));
      }
    };

    void restore();
    ethereum?.on?.("accountsChanged", handleAccountsChanged);
    ethereum?.on?.("chainChanged", handleChainChanged);
    return () => {
      active = false;
      ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [applyWallet, disconnectWallet]);

  const readContract = useCallback(
    (name, method, args = []) => blockchainService.readContract(name, method, args),
    [],
  );

  const writeContract = useCallback(async (name, method, args = []) => {
    if (!account) throw new Error("Connect your wallet before continuing.");
    if (chainId !== DEPLOYED_CHAIN_ID) throw new Error(`Switch MetaMask to chain ${DEPLOYED_CHAIN_ID}.`);
    setTransactionInProgress(true);
    setError(null);
    setTransaction({ method, status: "awaiting-wallet", hash: null });
    try {
      const result = await blockchainService.sendContractTransaction(
        name,
        method,
        args,
        (hash) => setTransaction({ method, status: "pending", hash }),
      );
      setTransaction({
        method,
        status: "confirmed",
        hash: result.hash,
        blockNumber: result.blockNumber,
      });
      try {
        await refreshBalances(account);
      } catch (refreshError) {
        setError(`Transaction confirmed, but balances could not be refreshed: ${getMessage(refreshError)}`);
      }
      return result;
    } catch (transactionError) {
      const message = getMessage(transactionError);
      setTransaction((current) => ({
        ...current,
        method,
        status: transactionError?.code === "ACTION_REJECTED" || transactionError?.code === 4001
          ? "rejected"
          : "failed",
        error: message,
      }));
      setError(message);
      throw transactionError;
    } finally {
      setTransactionInProgress(false);
    }
  }, [account, chainId, refreshBalances]);

  const value = useMemo(() => ({
    isConnected,
    isCorrectNetwork,
    isConfigured,
    isGanache,
    account,
    chainId,
    networkName,
    balance,
    foodBalance,
    participantStats,
    orderCount,
    loading,
    transactionInProgress,
    transaction,
    error,
    connectWallet,
    switchNetwork,
    disconnectWallet,
    refreshBalances,
    readContract,
    writeContract,
  }), [
    isConnected,
    isCorrectNetwork,
    isConfigured,
    isGanache,
    account,
    chainId,
    networkName,
    balance,
    foodBalance,
    participantStats,
    orderCount,
    loading,
    transactionInProgress,
    transaction,
    error,
    connectWallet,
    switchNetwork,
    disconnectWallet,
    refreshBalances,
    readContract,
    writeContract,
  ]);

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}
