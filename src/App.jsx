// ============================================
// FOODFI DAPP - MAIN APPLICATION
// ============================================
// Integrated with Web3 (MetaMask + Ganache + Smart Contracts)
//
// IMPORTANT SETUP STEPS:
// 1. Update src/config/contracts.js with your contract addresses
// 2. Make sure your contract ABIs are in src/config/
// 3. Ganache must be running on http://127.0.0.1:8545
// 4. MetaMask must be connected to Ganache network

import { Web3Provider, WalletButton, FoodFiDashboard } from './components/Web3';
import './App.css';

function AppContent() {
  // All Web3 logic is now handled by Web3Provider and components
  // This keeps App.jsx clean and focused on UI layout

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🍕 FoodFi - Decentralized Food Saving DApp</h1>
        <div className="header-controls">
          <WalletButton />
        </div>
      </header>

      <main className="app-main">
        <section className="hero">
          <h2>Welcome to FoodFi</h2>
          <p>
            A blockchain-based platform to record food savings and earn rewards.
          </p>
        </section>

        <FoodFiDashboard />
      </main>

      <footer className="app-footer">
        <p>
          🔗 Running on Ganache (Chain ID: 1337) | Powered by React + Ethers.js +
          MetaMask
        </p>
      </footer>
    </div>
  );
}

function App() {
  return (
    // Wrap entire app with Web3Provider to provide blockchain context
    <Web3Provider>
      <AppContent />
    </Web3Provider>
  );
}

export default App;

/*
  ============================================
  TROUBLESHOOTING GUIDE
  ============================================

  ❌ "MetaMask not detected"
    → Make sure MetaMask extension is installed

  ❌ "Contract addresses not set"
    → Edit src/config/contracts.js and replace placeholders with your actual addresses

  ❌ "Wrong network"
    → Switch to "Ganache Local" network in MetaMask
    → Make sure Ganache is running on http://127.0.0.1:8545

  ❌ "Transaction failed"
    → Check Ganache console for errors
    → Verify contract addresses and ABIs are correct
    → Make sure account has ETH for gas fees

  ❌ "Can't connect wallet"
    → Reload the page
    → Disconnect and reconnect MetaMask
    → Check browser console for errors

  For more info, see docs/BLOCKCHAIN_SETUP.md
