# FoodFi DApp

FoodFi is a React/Vite Web3 demo for food orders, FOOD rewards, a token vault, liquidity, yield farming, and token swaps. Solidity sources for the six experiments are maintained in `contracts/active/Experiment1` through `Experiment6`; the original contract files under `contracts/contracts` are preserved as reference material and are not compiled by Hardhat.

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

Open the Vite URL (normally `http://localhost:5173`) and connect a wallet configured for the local network:

- Network name: Hardhat Local
- RPC URL: `http://127.0.0.1:7545`
- Chain ID: `1337` (`0x539`)
- Currency: `ETH`

Use only a development account/private key printed by the local Hardhat node, and never use it on a public network. Local node state is ephemeral; restart the node and redeploy after it is stopped. The deployment script writes addresses to `deployments/<chainId>.json` and `src/config/deployment.json`. It refuses to overwrite an existing live deployment unless `REDEPLOY=true` is explicitly set.

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
