import { useEffect, useMemo, useState } from "react";
import { formatUnits, id, parseEther, parseUnits } from "ethers";
import { useWeb3 } from "./components/Web3";
import { WalletButton } from "./components/Web3";
import { getContract, requireContractCode } from "./blockchain/blockchain.js";
import { DEPLOYMENT, TOKENS } from "./config/contracts.js";
import "./App.css";

const menu = [
  { id: "garden-bowl", name: "Garden Bowl", description: "Seasonal greens, grains, and roasted vegetables.", price: "0.004", icon: "🥗" },
  { id: "tomato-pasta", name: "Tomato Pasta", description: "Slow-cooked tomato sauce with fresh basil.", price: "0.006", icon: "🍝" },
  { id: "harvest-soup", name: "Harvest Soup", description: "A comforting soup made with rescued vegetables.", price: "0.003", icon: "🥣" },
];

const addresses = DEPLOYMENT.contracts || {};
const dexTokens = TOKENS
  .filter((token) => token.symbol !== "AMM-USD")
  .map((token) => ({
    ...token,
    contractKey: token.address?.toLowerCase() === addresses.foodToken?.toLowerCase()
      ? "foodToken"
      : token.address?.toLowerCase() === addresses.dexBridge?.toLowerCase()
        ? "dexBridge"
        : "dexUsd",
  }));

const emptyModules = {
  vault: { shares: 0n, assets: 0n, totalAssets: 0n },
  liquidity: { reserveA: 0n, reserveB: 0n, lpBalance: 0n },
  farming: { staked: 0n, earned: 0n, lpBalance: 0n, rewardRate: 0n },
};

function displayAmount(value, decimals = 18, digits = 4) {
  if (value === null || value === undefined) return "—";
  const [whole, fraction = ""] = formatUnits(value, decimals).split(".");
  const trimmedFraction = fraction.slice(0, digits).replace(/0+$/, "");
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

function errorText(error) {
  return error?.shortMessage || error?.reason || error?.message || "The request failed.";
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "number", step = "any", min = "0", placeholder }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function App() {
  const {
    isConnected,
    loading,
    isCorrectNetwork,
    isConfigured,
    account,
    chainId,
    networkName,
    balance,
    foodBalance,
    participantStats,
    orderCount,
    transactionInProgress,
    transaction,
    error,
    connectWallet,
    readContract,
    writeContract,
    refreshBalances,
  } = useWeb3();

  const [cart, setCart] = useState([]);
  const [modules, setModules] = useState(emptyModules);
  const [loadedAccount, setLoadedAccount] = useState(null);
  const [rewardOwner, setRewardOwner] = useState(null);
  const [history, setHistory] = useState([]);
  const [moduleError, setModuleError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [foodKg, setFoodKg] = useState("");
  const [vaultDeposit, setVaultDeposit] = useState("");
  const [vaultMint, setVaultMint] = useState("");
  const [vaultWithdraw, setVaultWithdraw] = useState("");
  const [vaultRedeem, setVaultRedeem] = useState("");
  const [liquidityA, setLiquidityA] = useState("");
  const [liquidityB, setLiquidityB] = useState("");
  const [removeLiquidity, setRemoveLiquidity] = useState("");
  const [farmAmount, setFarmAmount] = useState("");
  const [swapFrom, setSwapFrom] = useState(() => dexTokens[0]?.address || "");
  const [swapTo, setSwapTo] = useState(() => dexTokens[1]?.address || "");
  const [swapAmount, setSwapAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [swapState, setSwapState] = useState({ key: "", quote: null, error: "", balance: null });
  const quoteKey = [account, swapFrom, swapTo, swapAmount, refreshVersion].join(":");
  const swapQuote = swapState.key === quoteKey ? swapState.quote : null;
  const quoteError = swapState.key === quoteKey ? swapState.error : "";
  const swapBalance = swapState.key === quoteKey ? swapState.balance : null;
  const currentModules = loadedAccount === account ? modules : emptyModules;

  const cartTotal = useMemo(
    () => cart.reduce((total, item) => total + parseEther(item.price) * BigInt(item.quantity), 0n),
    [cart],
  );
  const isRewardOwner = Boolean(
    account && rewardOwner && account.toLowerCase() === rewardOwner.toLowerCase(),
  );

  useEffect(() => {
    if (!isConnected || !isCorrectNetwork || !isConfigured || !account) {
      return undefined;
    }

    let active = true;
    async function loadModules() {
      try {
        for (const contractName of Object.keys(addresses)) {
          await requireContractCode(contractName);
        }
        const [
          vaultShares,
          vaultTotalAssets,
          vaultAssets,
          reserveA,
          reserveB,
          lpBalance,
          staked,
          earned,
          farmLpBalance,
          rewardRate,
          ownerAddress,
        ] = await Promise.all([
          readContract("vault", "balanceOf", [account]),
          readContract("vault", "totalAssets"),
          readContract("vault", "convertToAssets", [
            await readContract("vault", "balanceOf", [account]),
          ]),
          readContract("liquidityPool", "reserveA"),
          readContract("liquidityPool", "reserveB"),
          readContract("ammLpToken", "balanceOf", [account]),
          readContract("farm", "stakedBalance", [account]),
          readContract("farm", "earned", [account]),
          readContract("dexPair", "balanceOf", [account]),
          readContract("farm", "rewardRate"),
          readContract("foodRewards", "owner"),
        ]);
        const nextModules = {
          vault: { shares: vaultShares, assets: vaultAssets, totalAssets: vaultTotalAssets },
          liquidity: { reserveA, reserveB, lpBalance },
          farming: { staked, earned, lpBalance: farmLpBalance, rewardRate },
        };

        const fromBlock = Number(DEPLOYMENT.deploymentBlock || 0);
        const orders = getContract("orders");
        const rewards = getContract("foodRewards");
        const vault = getContract("vault");
        const pool = getContract("liquidityPool");
        const farm = getContract("farm");
        const pair = getContract("dexPair");
        const eventLists = await Promise.all([
          orders.queryFilter(orders.filters.OrderPlaced(account), fromBlock),
          rewards.queryFilter(rewards.filters.FoodSavingRecorded(account), fromBlock),
          vault.queryFilter(vault.filters.Deposit(null, account), fromBlock),
          vault.queryFilter(vault.filters.Withdraw(null, null, account), fromBlock),
          pool.queryFilter(pool.filters.LiquidityAdded(account), fromBlock),
          pool.queryFilter(pool.filters.LiquidityRemoved(account), fromBlock),
          farm.queryFilter(farm.filters.Staked(account), fromBlock),
          farm.queryFilter(farm.filters.Withdrawn(account), fromBlock),
          farm.queryFilter(farm.filters.RewardPaid(account), fromBlock),
          pair.queryFilter(pair.filters.Swap(null, null, null, null, null, account), fromBlock),
        ]);

        const eventTypes = [
          "Food order",
          "Food-saving reward",
          "Vault deposit",
          "Vault withdrawal",
          "Liquidity added",
          "Liquidity removed",
          "LP staked",
          "LP withdrawn",
          "Farm reward claimed",
          "DEX swap",
        ];
        const entries = eventLists.flatMap((events, index) => events.map((event) => ({
          type: eventTypes[index],
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
        }))).sort((a, b) => b.blockNumber - a.blockNumber);
        if (active) {
          setModules(nextModules);
          setRewardOwner(ownerAddress);
          setHistory(entries);
          setLoadedAccount(account);
          setModuleError("");
        }
      } catch (loadError) {
        if (active) setModuleError(errorText(loadError));
      }
    }
    void loadModules();
    return () => {
      active = false;
    };
  }, [account, isConnected, isCorrectNetwork, isConfigured, readContract, refreshVersion]);

  useEffect(() => {
    const source = dexTokens.find((token) => token.address === swapFrom);
    const destination = dexTokens.find((token) => token.address === swapTo);
    if (!isConnected || !isCorrectNetwork || !isConfigured || !source || !destination || source.address === destination.address) {
      return undefined;
    }
    let active = true;
    async function loadQuote() {
      let balanceRaw = null;
      try {
        balanceRaw = await readContract(source.contractKey, "balanceOf", [account]);
        const amountIn = swapAmount ? parseUnits(swapAmount, source.decimals) : null;
        if (!amountIn || amountIn <= 0n) {
          if (active) setSwapState({ key: quoteKey, quote: null, error: "", balance: balanceRaw });
          return;
        }

        const bridge = dexTokens.find((token) =>
          token.address !== source.address && token.address !== destination.address,
        );
        const paths = [[source, destination]];
        if (bridge) paths.push([source, bridge, destination]);
        const candidates = [];
        let lastFailure = "";
        for (const route of paths) {
          const routeAddresses = route.map((token) => token.address);
          const pairAddresses = await Promise.all(route.slice(0, -1).map((token, index) =>
            readContract("factory", "getPair", [token.address, route[index + 1].address]),
          ));
          if (pairAddresses.some((pairAddress) => pairAddress === "0x0000000000000000000000000000000000000000")) {
            continue;
          }
          try {
            const amounts = await readContract("router", "getAmountsOut", [amountIn, routeAddresses]);
            candidates.push({ route, amounts });
          } catch (routeError) {
            lastFailure = errorText(routeError);
          }
        }
        if (!active) return;
        if (candidates.length === 0) {
          setSwapState({
            key: quoteKey,
            quote: null,
            error: lastFailure || "No initialized pool route is available for this token pair.",
            balance: balanceRaw,
          });
          return;
        }
        candidates.sort((a, b) => (
          a.amounts.at(-1) > b.amounts.at(-1) ? -1 : a.amounts.at(-1) < b.amounts.at(-1) ? 1 : 0
        ));
        setSwapState({ key: quoteKey, quote: candidates[0], error: "", balance: balanceRaw });
      } catch (quoteLoadError) {
        if (active) {
          setSwapState({
            key: quoteKey,
            quote: null,
            error: errorText(quoteLoadError),
            balance: balanceRaw,
          });
        }
      }
    }
    void loadQuote();
    return () => {
      active = false;
    };
  }, [account, isConnected, isCorrectNetwork, isConfigured, readContract, swapAmount, swapFrom, swapTo, quoteKey]);

  async function runAction(action, successMessage) {
    setActionError("");
    setActionNotice("");
    try {
      await action();
      if (successMessage) {
        setActionNotice(successMessage);
        setRefreshVersion((version) => version + 1);
      }
    } catch (actionFailure) {
      setActionError(errorText(actionFailure));
    }
  }

  function addToCart(food) {
    setCart((current) => {
      const existing = current.find((item) => item.id === food.id);
      if (existing) {
        return current.map((item) => item.id === food.id
          ? { ...item, quantity: item.quantity + 1 }
          : item);
      }
      return [...current, { ...food, quantity: 1 }];
    });
  }

  function updateCartQuantity(foodId, quantity) {
    setCart((current) => quantity <= 0
      ? current.filter((item) => item.id !== foodId)
      : current.map((item) => item.id === foodId ? { ...item, quantity } : item));
  }

  async function placeFoodOrder() {
    if (!cart.length) throw new Error("Add at least one menu item before checkout.");
    const orderData = {
      items: cart.map(({ id: itemId, quantity }) => ({ id: itemId, quantity })),
      amountWei: cartTotal.toString(),
      createdAt: new Date().toISOString(),
    };
    const orderHash = id(JSON.stringify(orderData));
    await writeContract("orders", "placeOrder", [orderHash, { value: cartTotal }]);
    setCart([]);
  }

  function tokenAmount(value, decimals = 18) {
    if (!value || Number(value) <= 0) throw new Error("Enter an amount greater than zero.");
    return parseUnits(value, decimals);
  }

  async function recordFoodSaving() {
    if (!/^[1-9]\d*$/.test(foodKg)) throw new Error("Enter a whole number of kilograms greater than zero.");
    await writeContract("foodRewards", "recordFoodSaving", [account, BigInt(foodKg)]);
    setFoodKg("");
  }

  async function depositInVault() {
    await writeContract("foodToken", "approve", [addresses.vault, tokenAmount(vaultDeposit)]);
    await writeContract("vault", "deposit", [tokenAmount(vaultDeposit), account]);
    setVaultDeposit("");
  }

  async function mintVaultShares() {
    await writeContract("vault", "mint", [tokenAmount(vaultMint), account]);
    setVaultMint("");
  }

  async function withdrawFromVault() {
    await writeContract("vault", "withdraw", [
      tokenAmount(vaultWithdraw),
      account,
      account,
    ]);
    setVaultWithdraw("");
  }

  async function redeemVaultShares() {
    await writeContract("vault", "redeem", [
      tokenAmount(vaultRedeem),
      account,
      account,
    ]);
    setVaultRedeem("");
  }

  async function addPoolLiquidity() {
    const amountA = tokenAmount(liquidityA);
    const amountB = tokenAmount(liquidityB);
    await writeContract("foodToken", "approve", [addresses.liquidityPool, amountA]);
    await writeContract("ammUsd", "approve", [addresses.liquidityPool, amountB]);
    await writeContract("liquidityPool", "addLiquidity", [amountA, amountB, 0, 0]);
    setLiquidityA("");
    setLiquidityB("");
  }

  async function removePoolLiquidity() {
    await writeContract("liquidityPool", "removeLiquidity", [tokenAmount(removeLiquidity)]);
    setRemoveLiquidity("");
  }

  async function stakeLpTokens() {
    const amount = tokenAmount(farmAmount);
    await writeContract("dexPair", "approve", [addresses.farm, amount]);
    await writeContract("farm", "stake", [amount]);
    setFarmAmount("");
  }

  async function submitSwap() {
    if (!swapQuote) throw new Error("Wait for a live route estimate before submitting.");
    const source = dexTokens.find((token) => token.address === swapFrom);
    if (!source) throw new Error("Select an input token.");
    const amountIn = tokenAmount(swapAmount, source.decimals);
    const slippageBps = Math.floor(Number(slippage) * 100);
    if (!Number.isFinite(slippageBps) || slippageBps < 0 || slippageBps > 5000) {
      throw new Error("Slippage tolerance must be between 0% and 50%.");
    }
    const amountOutMin = swapQuote.amounts.at(-1) * BigInt(10000 - slippageBps) / 10000n;
    await writeContract(source.contractKey, "approve", [addresses.router, amountIn]);
    await writeContract("router", "swapExactTokensForTokens", [
      amountIn,
      amountOutMin,
      swapQuote.route.map((token) => token.address),
      account,
      Math.floor(Date.now() / 1000) + 600,
    ]);
    setSwapAmount("");
  }

  const selectedSource = dexTokens.find((token) => token.address === swapFrom);
  const selectedDestination = dexTokens.find((token) => token.address === swapTo);
  const slippageNumber = Number(slippage);
  const slippageBps = Number.isFinite(slippageNumber) && slippageNumber >= 0 && slippageNumber <= 50
    ? Math.floor(slippageNumber * 100)
    : null;
  const minReceived = swapQuote && slippageBps !== null
    ? swapQuote.amounts.at(-1) * BigInt(10000 - slippageBps) / 10000n
    : null;

  return (
    <div className="app-shell">
      <header className="navbar">
        <a className="brand" href="#home" aria-label="FoodFi home">
          <span className="brand-mark">f</span>
          <span>foodfi<span className="brand-dot">.</span></span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#order">Order</a>
          <a href="#rewards">Rewards</a>
          <a href="#vault">Vault</a>
          <a href="#liquidity">Liquidity</a>
          <a href="#farming">Farming</a>
          <a href="#swap">Swap</a>
          <a href="#activity">Activity</a>
        </nav>
        <WalletButton />
      </header>

      <main>
        <section className="hero-section" id="home">
          <div className="hero-copy">
            <span className="eyebrow">Good food. Less waste. On-chain.</span>
            <h1>Food that does<br />more good<span>.</span></h1>
            <p>Order from local kitchens, reward food-saving actions, and explore transparent on-chain finance with one connected wallet.</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#order">Explore the menu <span aria-hidden="true">↗</span></a>
              {!isConnected && (
                <button
                  className="button button-quiet"
                  disabled={loading}
                  onClick={() => void connectWallet().catch(() => {})}
                >
                  {loading ? "Connecting..." : "Connect wallet"}
                </button>
              )}
            </div>
            <div className="hero-proof">
              <span className="proof-dot" />
              <span>Payments and activity are verifiable on your connected network</span>
            </div>
          </div>
          <div className="hero-art" aria-label="FoodFi impact illustration">
            <div className="art-glow" />
            <div className="art-card art-card-back"><span>LESS WASTE</span><strong>↗</strong></div>
            <div className="art-card art-card-front">
              <div className="art-top"><span className="art-leaf">✳</span><span>FOODFI / 01</span></div>
              <div className="art-bowl">🥬</div>
              <div className="art-bottom"><strong>Every bite<br />counts.</strong><span>GOOD FOOD<br />GOOD IMPACT</span></div>
            </div>
            <div className="art-stamp">BUILT<br />ONCHAIN</div>
          </div>
        </section>

        <section className="wallet-overview section-wrap">
          <div className="overview-heading">
            <div>
              <span className="eyebrow">Your FoodFi</span>
              <h2>Wallet overview</h2>
            </div>
            {isConnected && isCorrectNetwork && (
              <button className="text-button" onClick={() => void refreshBalances().catch(() => {})}>Refresh balances ↻</button>
            )}
          </div>
          {!isConnected ? (
            <div className="empty-panel">
              <span className="empty-icon">◈</span>
              <div>
                <strong>Connect a wallet to enable on-chain actions</strong>
                <p>Use the Connect Wallet button above in a browser with MetaMask installed. For local testing, choose chain 1337 and Ganache RPC http://127.0.0.1:7545. Menu and basket controls work without a wallet.</p>
              </div>
            </div>
          ) : (
            <>
              {isCorrectNetwork ? null : (
                <div className="notice notice-warning">
                  <strong>Wrong network</strong>
                  <span>Connected to {networkName || `chain ${chainId}`}. Switch MetaMask to chain {DEPLOYMENT.chainId} to use FoodFi contracts.</span>
                </div>
              )}
              {!isConfigured && (
                <div className="notice notice-warning">
                  <strong>Contracts not deployed</strong>
                  <span>Run the local deployment steps in the README. No contract balances or transaction results are being simulated.</span>
                </div>
              )}
              <div className="metric-grid">
                <div className="metric-card"><span>Wallet</span><strong className="address-value">{account}</strong><small>{networkName || `Chain ${chainId}`}</small></div>
                <div className="metric-card"><span>Native balance</span><strong>{balance ? `${displayAmount(parseEther(balance))} ETH` : "—"}</strong><small>Gas for network transactions</small></div>
                <div className="metric-card"><span>FOOD balance</span><strong>{foodBalance === null ? "—" : `${displayAmount(parseUnits(foodBalance))} FOOD`}</strong><small>Reward and platform token</small></div>
                <div className="metric-card"><span>Food saved</span><strong>{participantStats ? `${participantStats.foodSavedKg} kg` : "—"}</strong><small>{participantStats ? `${participantStats.participationCount} verified entries` : "Contract data not available"}</small></div>
              </div>
              <div className="overview-foot">
                <span>Rewards earned: <strong>{participantStats ? `${participantStats.rewardsEarned} FOOD` : "—"}</strong></span>
                <span>Food orders: <strong>{orderCount ?? "—"}</strong></span>
              </div>
            </>
          )}
        </section>

        <section className="content-section section-wrap" id="order">
          <SectionHeading eyebrow="01 / Order" title="Fresh picks, less waste" description="Demo menu and sample ETH pricing—not a live restaurant catalog. Place a test order to record its commitment and payment on-chain." />
          <div className="order-layout">
            <div className="menu-grid">
              {menu.map((food) => (
                <article className="food-card" key={food.id}>
                  <div className="food-card-art"><span>{food.icon}</span><small>RESCUED PRODUCE</small></div>
                  <div className="food-card-content">
                    <div className="food-card-title"><h3>{food.name}</h3><span>{food.price} ETH</span></div>
                    <p>{food.description}</p>
                    <button className="button button-outline" onClick={() => addToCart(food)}>Add to order <span>+</span></button>
                  </div>
                </article>
              ))}
            </div>
            <aside className="cart-card">
              <div className="cart-heading"><div><span className="eyebrow">Your selection</span><h3>Order basket</h3></div><span className="cart-count">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span></div>
              {cart.length === 0 ? (
                <div className="cart-empty">Your basket is empty.<br />Add something good.</div>
              ) : (
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.id}>
                      <div><strong>{item.name}</strong><small>{item.price} ETH each</small></div>
                      <div className="quantity-control">
                        <button aria-label={`Remove one ${item.name}`} onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>−</button>
                        <span>{item.quantity}</span>
                        <button aria-label={`Add one ${item.name}`} onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="cart-total"><span>Total</span><strong>{displayAmount(cartTotal)} ETH</strong></div>
              <button className="button button-primary button-full" disabled={!cart.length || transactionInProgress || !isConnected || !isCorrectNetwork || !isConfigured} onClick={() => void runAction(placeFoodOrder, "Order confirmed on-chain.")}>
                {transactionInProgress ? "Confirming..." : "Checkout on-chain"}
              </button>
              {!isConnected && <small className="field-hint">Connect your wallet to check out.</small>}
            </aside>
          </div>
        </section>

        <section className="content-section section-wrap tinted-section" id="rewards">
          <SectionHeading eyebrow="02 / Rewards" title="Make food-saving count" description="Verified savings are recorded by the contract owner and paid from its funded FOOD reward pool." />
          <div className="split-panel">
            <div className="explain-card">
              <span className="large-icon">✳</span>
              <h3>Rewards with receipts.</h3>
              <p>Each kilogram entry updates your on-chain participant statistics. Reward payouts come from FOOD tokens actually held by the rewards contract.</p>
              <div className="inline-stat"><span>Your verified impact</span><strong>{participantStats ? `${participantStats.foodSavedKg} kg` : "—"}</strong></div>
            </div>
            <div className="form-card">
              <div className="form-card-heading"><h3>Record verified savings</h3><span className="owner-tag">{isRewardOwner ? "Contract owner" : "Owner approval required"}</span></div>
              <Field label="Food saved (whole kg)" value={foodKg} onChange={setFoodKg} step="1" min="1" placeholder="e.g. 3" />
              <button className="button button-primary button-full" disabled={!isConnected || !isCorrectNetwork || !isConfigured || !isRewardOwner || transactionInProgress} onClick={() => void runAction(recordFoodSaving, "Verified savings and FOOD payout confirmed.")}>
                Record activity
              </button>
              <p className="field-hint">{isRewardOwner ? "This wallet can submit a verified entry." : "Only the FoodFi rewards contract owner can record verified activities."}</p>
            </div>
          </div>
        </section>

        <section className="content-section section-wrap" id="vault">
          <SectionHeading eyebrow="03 / Savings vault" title="Let your FOOD work" description="Deposit FOOD to receive vault shares. Shares represent your proportional ownership of the vault's underlying FOOD assets." />
          <div className="vault-summary">
            <div><span>Your vault shares</span><strong>{displayAmount(currentModules.vault.shares)} FFVS</strong><small>Underlying assets: {displayAmount(currentModules.vault.assets)} FOOD</small></div>
            <div><span>Total vault assets</span><strong>{displayAmount(currentModules.vault.totalAssets)} FOOD</strong><small>Read from the ERC-4626 vault</small></div>
            <div className="vault-icon">◈</div>
          </div>
          <div className="action-grid four-actions">
            <div className="form-card"><h3>Deposit assets</h3><Field label="FOOD amount" value={vaultDeposit} onChange={setVaultDeposit} placeholder="0.0" /><button className="button button-primary button-full" disabled={!isConnected || !isCorrectNetwork || !isConfigured || transactionInProgress} onClick={() => void runAction(depositInVault, "FOOD deposited and vault shares issued.")}>Approve + deposit</button></div>
            <div className="form-card"><h3>Mint shares</h3><Field label="FFVS shares" value={vaultMint} onChange={setVaultMint} placeholder="0.0" /><button className="button button-outline button-full" disabled={!isConnected || !isCorrectNetwork || !isConfigured || transactionInProgress} onClick={() => void runAction(mintVaultShares, "Vault shares minted.")}>Mint shares</button></div>
            <div className="form-card"><h3>Withdraw assets</h3><Field label="FOOD amount" value={vaultWithdraw} onChange={setVaultWithdraw} placeholder="0.0" /><button className="button button-outline button-full" disabled={!isConnected || !isCorrectNetwork || !isConfigured || transactionInProgress} onClick={() => void runAction(withdrawFromVault, "FOOD withdrawn from the vault.")}>Withdraw FOOD</button></div>
            <div className="form-card"><h3>Redeem shares</h3><Field label="FFVS shares" value={vaultRedeem} onChange={setVaultRedeem} placeholder="0.0" /><button className="button button-outline button-full" disabled={!isConnected || !isCorrectNetwork || !isConfigured || transactionInProgress} onClick={() => void runAction(redeemVaultShares, "Vault shares redeemed.")}>Redeem shares</button></div>
          </div>
        </section>

        <section className="content-section section-wrap tinted-section" id="liquidity">
          <SectionHeading eyebrow="04 / Liquidity" title="Back the FOOD / AMM-USD pool" description="Liquidity providers supply both assets, receive LP shares, and can redeem their proportional claim on the pool reserves." />
          <div className="liquidity-layout">
            <div className="reserve-card">
              <div className="reserve-heading"><div><span className="eyebrow">Experiment 4 pool</span><h3>FOOD / AMM-USD</h3></div><span className="live-tag"><i /> Live contract data</span></div>
              <div className="reserve-values"><div><span>FOOD reserve</span><strong>{displayAmount(currentModules.liquidity.reserveA)}</strong></div><div><span>AMM-USD reserve</span><strong>{displayAmount(currentModules.liquidity.reserveB)}</strong></div></div>
              <div className="reserve-footer"><span>Your LP balance</span><strong>{displayAmount(currentModules.liquidity.lpBalance)} FFI-LP</strong></div>
              <p className="field-hint">LP shares represent your proportional claim on both reserves. The contract selects a ratio-preserving amount for deposits.</p>
            </div>
            <div className="form-card">
              <h3>Add liquidity</h3>
              <div className="two-fields">
                <Field label="FOOD" value={liquidityA} onChange={setLiquidityA} placeholder="0.0" />
                <Field label="AMM-USD" value={liquidityB} onChange={setLiquidityB} placeholder="0.0" />
              </div>
              <button className="button button-primary button-full" disabled={!isConnected || !isCorrectNetwork || !isConfigured || transactionInProgress} onClick={() => void runAction(addPoolLiquidity, "Liquidity added and LP shares issued.")}>Approve + add liquidity</button>
              <div className="divider" />
              <h3>Remove liquidity</h3>
              <Field label="FFI-LP amount" value={removeLiquidity} onChange={setRemoveLiquidity} placeholder="0.0" />
              <button className="button button-outline button-full" disabled={!isConnected || !isCorrectNetwork || !isConfigured || transactionInProgress} onClick={() => void runAction(removePoolLiquidity, "LP shares redeemed for pool assets.")}>Remove liquidity</button>
            </div>
          </div>
        </section>

        <section className="content-section section-wrap" id="farming">
          <SectionHeading eyebrow="05 / Yield farming" title="Put your DEX LP shares to work" description="Stake the FOOD/FUSD DEX pair LP token. Rewards accrue at the rate set in the farming contract and are limited by its funded reward balance." />
          <div className="farm-panel">
            <div className="farm-intro"><span className="farm-symbol">✳</span><div><span className="eyebrow">FOOD / FUSD LP</span><h3>FoodFi farm</h3><p>Actual contract rate: {isConfigured ? `${displayAmount(currentModules.farming.rewardRate)} FOOD per LP token per second` : "—"}</p></div></div>
            <div className="farm-metric"><span>LP wallet balance</span><strong>{displayAmount(currentModules.farming.lpBalance)} LP</strong></div>
            <div className="farm-metric"><span>Currently staked</span><strong>{displayAmount(currentModules.farming.staked)} LP</strong></div>
            <div className="farm-metric"><span>Pending FOOD</span><strong>{displayAmount(currentModules.farming.earned)} FOOD</strong></div>
            <div className="farm-actions">
              <Field label="LP amount to stake" value={farmAmount} onChange={setFarmAmount} placeholder="0.0" />
              <button className="button button-primary" disabled={!isConnected || !isCorrectNetwork || !isConfigured || transactionInProgress} onClick={() => void runAction(stakeLpTokens, "LP tokens staked.")}>Approve + stake</button>
              <button className="button button-outline" disabled={!isConnected || !isCorrectNetwork || !isConfigured || transactionInProgress} onClick={() => void runAction(() => writeContract("farm", "harvest"), "Farm rewards claimed.")}>Claim rewards</button>
              <button className="button button-quiet" disabled={!isConnected || !isCorrectNetwork || !isConfigured || transactionInProgress || currentModules.farming.staked === 0n} onClick={() => void runAction(() => writeContract("farm", "withdraw", [currentModules.farming.staked]), "Staked LP withdrawn.")}>Withdraw all</button>
            </div>
          </div>
        </section>

        <section className="content-section section-wrap tinted-section" id="swap">
          <SectionHeading eyebrow="06 / FoodFi DEX" title="Swap with on-chain quotes" description="The router computes output from current pair reserves. The 0.3% fee is retained in each pool and slippage is enforced on-chain." />
          <div className="swap-layout">
            <div className="swap-card">
              <div className="swap-title"><div><span className="eyebrow">Token exchange</span><h3>Trade tokens</h3></div><span className="swap-gear">↗</span></div>
              <label className="swap-input">
                <span>You pay</span>
                <div className="swap-input-row">
                  <input type="number" min="0" step="any" value={swapAmount} onChange={(event) => setSwapAmount(event.target.value)} placeholder="0.0" />
                  <select value={swapFrom} onChange={(event) => setSwapFrom(event.target.value)} aria-label="Input token">
                    {dexTokens.map((token) => <option key={token.address} value={token.address}>{token.symbol}</option>)}
                  </select>
                </div>
                <small>Wallet balance: {swapBalance === null ? "—" : displayAmount(swapBalance)} {selectedSource?.symbol || ""}</small>
              </label>
              <div className="swap-direction">↓</div>
              <label className="swap-input">
                <span>You receive (estimated)</span>
                <div className="swap-input-row">
                  <strong>{swapQuote && selectedDestination ? displayAmount(swapQuote.amounts.at(-1), selectedDestination.decimals, 6) : "—"}</strong>
                  <select value={swapTo} onChange={(event) => setSwapTo(event.target.value)} aria-label="Output token">
                    {dexTokens.map((token) => <option key={token.address} value={token.address}>{token.symbol}</option>)}
                  </select>
                </div>
                <small>{swapQuote ? `Route: ${swapQuote.route.map((token) => token.symbol).join(" → ")}` : quoteError || "Enter an amount to request an on-chain quote."}</small>
              </label>
              <div className="swap-details">
                <div><span>Pool fee</span><strong>0.3% per hop</strong></div>
                <div><span>Minimum received</span><strong>{minReceived !== null && selectedDestination ? `${displayAmount(minReceived, selectedDestination.decimals, 6)} ${selectedDestination.symbol}` : "—"}</strong></div>
              </div>
              <Field label="Slippage tolerance (%)" value={slippage} onChange={setSlippage} step="0.1" min="0" />
              <button className="button button-primary button-full" disabled={!isConnected || !isCorrectNetwork || !isConfigured || !swapQuote || transactionInProgress} onClick={() => void runAction(submitSwap, "Swap confirmed on-chain.")}>Approve + swap</button>
            </div>
            <div className="swap-explainer">
              <span className="large-icon">⇄</span>
              <h3>Route through the best available pool.</h3>
              <p>FoodFi compares the direct pair with a FOOD/FBRG/FUSD route when available. The final transaction still checks your minimum received amount and deadline in the Router contract.</p>
              <div className="swap-callout"><span>Swap fee</span><strong>0.3%</strong><small>Applied independently on each hop</small></div>
            </div>
          </div>
        </section>

        <section className="content-section section-wrap" id="activity">
          <SectionHeading eyebrow="07 / Activity" title="Your on-chain activity" description="Events are queried from the deployed contracts. Nothing is fabricated or stored as a successful transaction before confirmation." />
          {moduleError && <div className="notice notice-error"><strong>Could not load contract activity</strong><span>{moduleError}</span></div>}
          <div className="activity-list">
            {history.length === 0 ? (
              <div className="empty-panel"><span className="empty-icon">⌁</span><div><strong>No contract events found</strong><p>Confirmed orders, vault actions, liquidity, farming, and swaps will show here when indexed by the connected node.</p></div></div>
            ) : history.map((entry, index) => (
              <article className="activity-row" key={`${entry.hash}-${entry.type}-${index}`}>
                <span className="activity-icon">↗</span>
                <div><strong>{entry.type}</strong><small>Block {entry.blockNumber}</small></div>
                <code>{entry.hash}</code>
              </article>
            ))}
          </div>
        </section>

        {(actionError || error) && <div className="toast toast-error" role="alert">{actionError || error}</div>}
        {actionNotice && <div className="toast toast-success" role="status">{actionNotice}</div>}
        {transaction && (
          <div className={`transaction-bar transaction-${transaction.status}`}>
            <span className="transaction-indicator" />
            <div><strong>{transaction.method} · {transaction.status}</strong><small>{transaction.hash || transaction.error || "Waiting for wallet confirmation"}</small></div>
            {transaction.blockNumber && <span>Block {transaction.blockNumber}</span>}
          </div>
        )}
      </main>

      <footer className="footer">
        <a className="brand" href="#home"><span className="brand-mark">f</span><span>foodfi<span className="brand-dot">.</span></span></a>
        <span>FoodFi · good food, less waste, transparent finance.</span>
        <a href="#home">Back to top ↑</a>
      </footer>
    </div>
  );
}

export default App;
