// ============================================
// WALLET CONNECTION BUTTON
// ============================================
// Button to connect/disconnect wallet
// Shows account address when connected
// Handles MetaMask popup and errors

import React from 'react';
import { useWeb3 } from './Web3Provider';
import styles from './Web3.module.css';

export function WalletButton() {
  const {
    isConnected,
    account,
    loading,
    isGanache,
    error,
    connectWallet,
    disconnectWallet,
  } = useWeb3();

  // Format address to shorter version
  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // If error with network, show warning
  if (error && !isGanache && isConnected) {
    return (
      <button
        onClick={connectWallet}
        className={`${styles.walletBtn} ${styles.error}`}
      >
        ❌ Wrong Network - Click to Fix
      </button>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <button
        onClick={connectWallet}
        disabled={loading}
        className={`${styles.walletBtn} ${styles.connect}`}
      >
        {loading ? '⏳ Connecting...' : '🔗 Connect Wallet'}
      </button>
    );
  }

  // Connected and on Ganache
  return (
    <div className={styles.connectedContainer}>
      <div className={styles.connectedInfo}>
        <span className={styles.status}>✅ Connected</span>
        <span className={styles.address}>{formatAddress(account)}</span>
        {isGanache && <span className={styles.network}>🔗 Ganache</span>}
      </div>
      <button onClick={disconnectWallet} className={`${styles.walletBtn} ${styles.disconnect}`}>
        Disconnect
      </button>
    </div>
  );
}

export default WalletButton;
