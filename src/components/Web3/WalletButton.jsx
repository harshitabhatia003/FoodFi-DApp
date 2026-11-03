// ============================================
// WALLET CONNECTION BUTTON
// ============================================
// Button to connect/disconnect wallet
// Shows account address when connected
// Handles MetaMask popup and errors

import { useWeb3 } from './useWeb3';
import styles from './Web3.module.css';

export function WalletButton() {
  const {
    isConnected,
    account,
    loading,
    isGanache,
    isCorrectNetwork,
    networkName,
    chainId,
    connectWallet,
    switchNetwork,
    disconnectWallet,
    error,
  } = useWeb3();

  // Format address to shorter version
  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // If error with network, show warning
  if (isConnected && !isCorrectNetwork) {
    return (
      <div className={styles.connectedContainer}>
        <span className={styles.address}>
          Wrong network ({networkName || `chain ${chainId}`})
        </span>
        <button
          onClick={() => void switchNetwork().catch(() => {})}
          className={`${styles.walletBtn} ${styles.error}`}
        >
          Switch Network
        </button>
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className={styles.connectGroup}>
        <button
          onClick={() => void connectWallet().catch(() => {})}
          disabled={loading}
          className={`${styles.walletBtn} ${styles.connect}`}
        >
          {loading ? '⏳ Connecting...' : '🔗 Connect Wallet'}
        </button>
        {error && <span className={styles.connectionError} role="alert">{error}</span>}
      </div>
    );
  }

  // Connected and on Ganache
  return (
    <div className={styles.connectedContainer}>
      <div className={styles.connectedInfo}>
        <span className={styles.status}>✅ Connected</span>
        <span className={styles.address}>{formatAddress(account)}</span>
        {isGanache && <span className={styles.network}>🔗 {networkName || `Chain ${chainId}`}</span>}
      </div>
      <button onClick={disconnectWallet} className={`${styles.walletBtn} ${styles.disconnect}`}>
        Disconnect
      </button>
    </div>
  );
}

export default WalletButton;
