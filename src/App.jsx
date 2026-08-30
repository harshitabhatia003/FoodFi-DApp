import { useState } from "react";
import { ethers } from "ethers";
import "./App.css";

const FOOD_TOKEN_ADDRESS = "0x59557588fFaF93caDdb5AaEDD754dDfbfB6Bf1CA";

// ⚠️ Replace this with your NEW FoodFi address after redeploying FoodFi
const FOODFI_ADDRESS = "YOUR_NEW_FOODFI_ADDRESS";

const FOOD_TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
];

const FOODFI_ABI = [
  "function getParticipantStats(address participant) view returns (uint256 foodSavedKg, uint256 rewardsEarned, uint256 foodBalance)",
];

function App() {
  const [account, setAccount] = useState("");
  const [foodBalance, setFoodBalance] = useState("0");
  const [foodSaved, setFoodSaved] = useState("0");
  const [rewards, setRewards] = useState("0");
  const [status, setStatus] = useState("Connect your wallet to begin.");
  const [loading, setLoading] = useState(false);

  async function loadData(userAddress) {
    const provider = new ethers.BrowserProvider(window.ethereum);

    const token = new ethers.Contract(
      FOOD_TOKEN_ADDRESS,
      FOOD_TOKEN_ABI,
      provider
    );

    const foodFi = new ethers.Contract(
      FOODFI_ADDRESS,
      FOODFI_ABI,
      provider
    );

    const balance = await token.balanceOf(userAddress);
    const stats = await foodFi.getParticipantStats(userAddress);

    setFoodBalance(ethers.formatEther(balance));
    setFoodSaved(stats[0].toString());
    setRewards(ethers.formatEther(stats[1]));
  }

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask.");
        return;
      }

      setLoading(true);
      setStatus("Connecting wallet...");

      const provider = new ethers.BrowserProvider(window.ethereum);

      const accounts = await provider.send("eth_requestAccounts", []);

      const userAddress = accounts[0];

      setAccount(userAddress);

      await loadData(userAddress);

      setStatus("Wallet connected successfully.");
    } catch (error) {
      console.error(error);
      setStatus("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshData() {
    if (!account) return;

    try {
      setLoading(true);
      setStatus("Refreshing data...");

      await loadData(account);

      setStatus("Data refreshed successfully.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to refresh data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="brand">
          <span className="logo">🍽️</span>
          <span>FoodFi</span>
        </div>

        <button
          className="connect-btn"
          onClick={connectWallet}
          disabled={loading}
        >
          {account
            ? `${account.slice(0, 6)}...${account.slice(-4)}`
            : loading
            ? "Connecting..."
            : "Connect Wallet"}
        </button>
      </nav>

      <main className="container">
        <section className="hero">
          <div>
            <div className="badge">🌱 DECENTRALIZED FOOD REWARDS</div>

            <h1>
              Turn food saving into
              <span> rewards.</span>
            </h1>

            <p>
              FoodFi is a decentralized platform that rewards users for
              participating in food-waste reduction initiatives.
            </p>

            <div className="hero-actions">
              <button className="primary-btn" onClick={connectWallet}>
                {account ? "Wallet Connected ✓" : "Connect Wallet"}
              </button>

              {account && (
                <button className="secondary-btn" onClick={refreshData}>
                  ↻ Refresh
                </button>
              )}
            </div>
          </div>

          <div className="hero-card">
            <div className="food-icon">🍃</div>
            <h3>Save Food</h3>
            <p>Reduce waste. Earn FOOD tokens.</p>
          </div>
        </section>

        {account && (
          <>
            <section className="wallet-section">
              <div className="wallet-title">
                <span className="online-dot"></span>
                Connected Wallet
              </div>

              <div className="wallet-address">
                {account}
              </div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">🪙</div>
                <div>
                  <p>FOOD Balance</p>
                  <h2>{foodBalance}</h2>
                  <span>FOOD Tokens</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🥗</div>
                <div>
                  <p>Food Saved</p>
                  <h2>{foodSaved}</h2>
                  <span>Kilograms</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🏆</div>
                <div>
                  <p>Rewards Earned</p>
                  <h2>{rewards}</h2>
                  <span>FOOD Tokens</span>
                </div>
              </div>
            </section>

            <section className="initiative">
              <div className="initiative-icon">🌎</div>

              <div>
                <h2>Every kilogram matters.</h2>
                <p>
                  FoodFi simulates food-waste verification and rewards
                  participants with FOOD tokens through a blockchain
                  smart contract.
                </p>
              </div>
            </section>
          </>
        )}

        <div className="status">
          <span className="status-dot"></span>
          {status}
        </div>
      </main>

      <footer>
        <p>FoodFi • Decentralized Food-Waste Reduction Rewards Platform</p>
        <span>Powered by Ethereum • Solidity • Ethers.js</span>
      </footer>
    </div>
  );
}

export default App;