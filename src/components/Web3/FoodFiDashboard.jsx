// ============================================
// FOODFI DASHBOARD
// ============================================
// Displays user balances and interaction controls
// Shows FOODToken balance
// Records food saving transactions
// Displays participant statistics

import React, { useState } from 'react';
import { useWeb3 } from './Web3Provider';
import styles from './Web3.module.css';

export function FoodFiDashboard() {
  const {
    isConnected,
    account,
    balance,
    foodBalance,
    isGanache,
    transactionInProgress,
    error,
    participantStats,
    recordFoodSaving,
    getStats,
    refreshBalances,
  } = useWeb3();

  // Local state
  const [foodKgInput, setFoodKgInput] = useState('');
  const [txError, setTxError] = useState(null);
  const [txSuccess, setTxSuccess] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // ============================================
  // RECORD FOOD SAVING
  // ============================================

  async function handleRecordFoodSaving(e) {
    e.preventDefault();
    setTxError(null);
    setTxSuccess(null);

    try {
      if (!foodKgInput || isNaN(foodKgInput) || foodKgInput <= 0) {
        setTxError('Please enter a valid amount (> 0)');
        return;
      }

      const result = await recordFoodSaving(parseFloat(foodKgInput));
      
      setTxSuccess(
        `✅ Food saving recorded!\nTransaction: ${result.hash}`
      );
      setFoodKgInput('');

      // Refresh stats
      setTimeout(() => {
        getStats();
      }, 500);
    } catch (err) {
      setTxError(`❌ Error: ${err.message}`);
    }
  }

  // ============================================
  // REFRESH STATS
  // ============================================

  async function handleRefreshStats() {
    try {
      setLoadingStats(true);
      await getStats();
      setTxSuccess('✅ Stats refreshed');
    } catch (err) {
      setTxError(`Error: ${err.message}`);
    } finally {
      setLoadingStats(false);
    }
  }

  // ============================================
  // REFRESH BALANCES
  // ============================================

  async function handleRefreshBalances() {
    try {
      await refreshBalances(account);
      setTxSuccess('✅ Balances refreshed');
    } catch (err) {
      setTxError(`Error: ${err.message}`);
    }
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.message}>
          <p>🔗 Connect wallet to access FoodFi Dashboard</p>
        </div>
      </div>
    );
  }

  // Wrong network
  if (!isGanache) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={`${styles.message} ${styles.error}`}>
          <p>❌ Wrong Network</p>
          <p>Please switch to Ganache (Chain ID: 1337) in MetaMask</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER DASHBOARD
  // ============================================

  return (
    <div className={styles.dashboardContainer}>
      <h2>🍕 FoodFi Dashboard</h2>

      {/* Account Info */}
      <section className={styles.section}>
        <h3>Account Information</h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <label>Account Address:</label>
            <code className={styles.code}>{account}</code>
          </div>
          <div className={styles.infoItem}>
            <label>ETH Balance:</label>
            <span className={styles.value}>{parseFloat(balance).toFixed(2)} ETH</span>
          </div>
          <div className={styles.infoItem}>
            <label>FOOD Token Balance:</label>
            <span className={styles.value}>{parseFloat(foodBalance).toFixed(2)} FOOD</span>
          </div>
        </div>
      </section>

      {/* Participant Statistics */}
      {participantStats && (
        <section className={styles.section}>
          <h3>Your Statistics</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Food Saved (kg):</label>
              <span className={styles.value}>{participantStats.foodSavedKg}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Rewards Earned:</label>
              <span className={styles.value}>{participantStats.rewardsEarned} FOOD</span>
            </div>
            <div className={styles.infoItem}>
              <label>Participation Count:</label>
              <span className={styles.value}>{participantStats.participationCount}</span>
            </div>
          </div>
          <button
            onClick={handleRefreshStats}
            disabled={loadingStats}
            className={styles.secondaryBtn}
          >
            {loadingStats ? '⏳ Loading...' : '🔄 Refresh Stats'}
          </button>
        </section>
      )}

      {/* Record Food Saving */}
      <section className={styles.section}>
        <h3>Record Food Saving</h3>
        <form onSubmit={handleRecordFoodSaving}>
          <div className={styles.formGroup}>
            <label htmlFor="foodKg">Amount (kg):</label>
            <input
              id="foodKg"
              type="number"
              min="0.1"
              step="0.1"
              value={foodKgInput}
              onChange={(e) => setFoodKgInput(e.target.value)}
              placeholder="Enter amount in kg"
              disabled={transactionInProgress}
            />
          </div>

          <button
            type="submit"
            disabled={transactionInProgress || !foodKgInput}
            className={styles.primaryBtn}
          >
            {transactionInProgress ? (
              <>⏳ Processing...</>
            ) : (
              <>📝 Record Food Saving</>
            )}
          </button>
        </form>

        <button
          onClick={handleRefreshBalances}
          className={styles.secondaryBtn}
        >
          🔄 Refresh Balances
        </button>
      </section>

      {/* Messages */}
      {error && (
        <div className={`${styles.message} ${styles.error}`}>
          <p>{error}</p>
        </div>
      )}

      {txError && (
        <div className={`${styles.message} ${styles.error}`}>
          <p>{txError}</p>
        </div>
      )}

      {txSuccess && (
        <div className={`${styles.message} ${styles.success}`}>
          <p>{txSuccess}</p>
        </div>
      )}
    </div>
  );
}

export default FoodFiDashboard;
