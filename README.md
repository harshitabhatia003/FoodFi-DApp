# FoodFi DApp

FoodFi is a React/Vite Web3 demo for food orders, FOOD rewards, a token vault, liquidity, yield farming, and token swaps. Solidity sources for the six experiments are maintained in `contracts/active/Experiment1` through `Experiment6`; the original contract files under `contracts/contracts` are preserved as reference material and are not compiled by Hardhat.

## UI preview

<img width="944" height="496" alt="image" src="https://github.com/user-attachments/assets/40c22afb-5c4f-4769-a93f-e4e6a00fdd53" />
<img width="907" height="418" alt="image" src="https://github.com/user-attachments/assets/31d99c55-3ab6-4c9c-a57b-3fa343b54129" />
<img width="947" height="406" alt="image" src="https://github.com/user-attachments/assets/42bf2505-55ca-4eef-84aa-b7aca752a342" />
<img width="943" height="409" alt="image" src="https://github.com/user-attachments/assets/fe37775a-d57e-4af8-afc8-e02c95eaae3f" />
<img width="931" height="485" alt="image" src="https://github.com/user-attachments/assets/0190cbdf-1f40-4fd5-ac5c-910b669a19a1" />
<img width="921" height="412" alt="image" src="https://github.com/user-attachments/assets/677a76d3-46db-4578-837b-26dfdd0cb5da" />
<img width="947" height="498" alt="image" src="https://github.com/user-attachments/assets/a09b7ddb-98fe-4b62-986a-ad94a867feda" />




The screenshot shows the app before a wallet is connected. Menu browsing and basket controls are available immediately; on-chain actions require an injected wallet connected to the chain where FoodFi is deployed.

## Features

- Connect an injected EVM wallet, inspect balances and transactions, and switch to the configured chain.
- Place demo food orders with native currency and review on-chain order events.
- Record food-saving activity and receive FOOD rewards from the funded reward pool.
- Deposit and withdraw FOOD from an ERC-4626 vault.
- Add/remove liquidity and swap tokens through the Experiment 6 DEX.
- Stake and unstake DEX LP tokens in the yield farm.

The menu and its ETH prices are sample data, not a live restaurant catalog or quote. This project does not submit orders to a restaurant or provide delivery tracking.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MetaMask or another injected EVM wallet for interactive frontend use

Install dependencies:

```sh
npm install
```

## Run locally

Compile the contracts and export the frontend ABIs:

```sh
npm run contracts:compile
```

If you use Ganache, start it on port `7545` with chain ID `1337`. Do not also start the Hardhat node below; only one process can own the port. If you prefer the bundled Hardhat node, start it instead:

```sh
npm run node:local
```

With either local network running, deploy the contracts to that RPC and seed demo liquidity:

```sh
npm run deploy:local
```

Then start the frontend:

```sh
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`) in the same browser profile that has MetaMask installed and unlocked. Add/select a local network with:

- Network name: FoodFi Local (any name is fine)
- RPC URL: `http://127.0.0.1:7545`
- Chain ID: `1337` (`0x539`)
- Currency: `ETH`

Connect a Ganache-funded development account in MetaMask. If using the bundled Hardhat node, import one of its displayed development accounts instead. Never use development keys on a public network. Local chain state is ephemeral; after resetting/restarting the node, run `npm run deploy:local` again. The deployment script writes addresses to `deployments/<chainId>.json` and `src/config/deployment.json`. It refuses to overwrite an existing live deployment unless `REDEPLOY=true` is explicitly set.

## UI flow

The top navigation jumps to each section. On a fresh page, connect the wallet first; the wallet overview then shows the account, native balance, FOOD balance, rewards, and order count. Transactions open in the wallet for approval, and the app shows transaction status and reports confirmed events in **Activity**.

1. **Order:** select **Add to order** on a menu card, adjust quantities in the basket, then choose **Checkout on-chain** and confirm the native-token payment. The menu and prices are sample data; this does not contact a restaurant.
2. **Rewards:** the deployed rewards-contract owner enters a whole-number food-saving amount in kilograms and submits **Record activity**. Other accounts can view rewards but cannot record a verified entry.
3. **Vault:** enter FOOD or share amounts to **Approve + deposit**, **Mint shares**, **Withdraw FOOD**, or **Redeem shares**. A deposit first requests a token approval, then submits the vault deposit.
4. **Liquidity:** use the Experiment 4 FOOD / AMM-USD panel to add liquidity (approve both tokens, then add) or remove FFI-LP shares. This pool is separate from the FOOD / FUSD DEX.
5. **Farming:** the panel stakes FOOD / FUSD DEX pair LP tokens, claims accrued FOOD rewards, or withdraws the full stake. The deployment account receives the initial demo LP position; use that account for the seeded local demo.
6. **Swap:** choose input/output tokens, enter an amount, review the live quote, route, and minimum received, set slippage, then choose **Approve + swap** and confirm both wallet requests.
7. **Activity:** review confirmed order, rewards, vault, liquidity, farm, and swap events read from the connected chain.

On-chain buttons stay disabled until a wallet is connected, MetaMask is on chain `1337`, and contract addresses are configured. The rewards action is additionally limited to the rewards-contract owner; withdraw/claim actions may also be unavailable when there is no position. If the wallet reports an RPC error, verify Ganache is running at `http://127.0.0.1:7545`, MetaMask uses that same URL and chain ID, and the contracts were deployed to that Ganache instance.

## Deploy to Sepolia

Copy `.env.example` to `.env`, then set `SEPOLIA_RPC_URL` and `PRIVATE_KEY` to a Sepolia RPC endpoint and a dedicated, funded test wallet. Keep `.env` private and never use a wallet containing real funds.

```sh
npm run deploy:sepolia
```

The deployment script deploys and seeds demo liquidity, then updates the deployment JSON files. Review the generated addresses and configure the wallet to use Sepolia (chain ID `11155111`). No public network deployment is included with this repository.

## Tests and checks

```sh
npm run contracts:test
npm run lint
npm run build
```

The contract suite covers all six experiments, including the ten Experiment 6 DEX scenarios. The Experiment 6 brief's scenario 8 does not specify pool reserves, so its test uses A/B reserves of 1,000/4,000 and B/C reserves of 30,000/1,800, producing 21 C for the tested route.

## Project layout

```text
contracts/active/       Hardhat Solidity sources for Experiments 1-6
contracts/contracts/    Preserved original contract sources
scripts/                Deployment and ABI export scripts
test/                   Hardhat contract tests
src/blockchain/         Ethers wallet/provider and contract utilities
src/components/Web3/    Wallet context and controls
src/config/             Deployment addresses and generated ABIs
src/App.jsx             FoodFi application interface
```

## Scope and safety

This is an educational/demo application, not an audited financial product. The included mock tokens have no real-world value; reward payouts and some token operations are owner-controlled. The sample menu is not connected to a restaurant, and order events are not proof of fulfillment. Do not use production funds or deploy these contracts for real users without an independent security review, operational controls, and a production-ready deployment plan.
