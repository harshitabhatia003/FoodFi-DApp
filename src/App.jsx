import { useState, useEffect } from "react";
import { useWeb3 } from "./components/Web3";
import { WalletButton } from "./components/Web3";
import "./App.css";

function App() {
  const {
    isConnected,
    account,
    balance,
    foodBalance,
    participantStats,
    recordFoodSaving,
    transactionInProgress,
    error,
  } = useWeb3();

  const [foodKgInput, setFoodKgInput] = useState("");
  const [status, setStatus] = useState("Connect your wallet to begin.");
  const [isRecording, setIsRecording] = useState(false);

  // Format address for display
  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Handle record food saving
  async function handleRecordFoodSaving() {
    if (!foodKgInput || isNaN(foodKgInput) || foodKgInput <= 0) {
      setStatus("Please enter a valid amount (> 0 kg)");
      return;
    }

    try {
      setIsRecording(true);
      setStatus("Recording food saving...");

      const result = await recordFoodSaving(parseFloat(foodKgInput));

      setStatus(`✅ Food saving recorded! Transaction: ${result.hash.substring(0, 10)}...`);
      setFoodKgInput("");

      setTimeout(() => {
        setStatus("Connect your wallet to begin.");
      }, 5000);
    } catch (err) {
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setIsRecording(false);
    }
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="brand">
          <span className="logo">🍽️</span>
          <span>FoodFi</span>
        </div>

        <WalletButton />
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
              {!isConnected && (
                <button className="primary-btn">
                  Click Wallet to Connect
                </button>
              )}

              {isConnected && (
                <>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRecordFoodSaving();
                    }}
                  >
                    <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={foodKgInput}
                        onChange={(e) => setFoodKgInput(e.target.value)}
                        placeholder="Enter amount in kg"
                        disabled={isRecording}
                        style={{
                          flex: 1,
                          padding: "12px",
                          borderRadius: "8px",
                          border: "2px solid #e0e0e0",
                          fontSize: "14px",
                          fontFamily: "inherit",
                        }}
                      />
                      <button
                        type="submit"
                        disabled={isRecording || !foodKgInput}
                        className="primary-btn"
                        style={{ minWidth: "150px" }}
                      >
                        {isRecording ? "⏳ Recording..." : "📝 Record Food"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>

          <div className="hero-card">
            <div className="food-icon">🍃</div>
            <h3>Save Food</h3>
            <p>Reduce waste. Earn FOOD tokens.</p>
          </div>
        </section>

        {isConnected && (
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
                  <h2>{parseFloat(foodBalance || "0").toFixed(2)}</h2>
                  <span>FOOD Tokens</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🥗</div>
                <div>
                  <p>Food Saved</p>
                  <h2>{participantStats?.foodSavedKg || "0"}</h2>
                  <span>Kilograms</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🏆</div>
                <div>
                  <p>Rewards Earned</p>
                  <h2>{parseFloat(participantStats?.rewardsEarned || "0").toFixed(2)}</h2>
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