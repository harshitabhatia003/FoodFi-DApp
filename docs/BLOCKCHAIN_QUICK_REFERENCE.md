# BLOCKCHAIN SETUP - QUICK REFERENCE

## 🚀 QUICK START (5 MINUTES)

### Prerequisites
- ✅ Ganache running on `http://127.0.0.1:8545`
- ✅ MetaMask installed in browser
- ✅ Node.js installed

### Step 1: Copy Contract Addresses
```bash
# From Remix Deployed Contracts:
FOOD_TOKEN_ADDRESS = 0x...
FOODFI_ADDRESS = 0x...
```

### Step 2: Update Configuration
```bash
# Edit this file with your addresses:
nano src/config/contracts.js
```

**Replace:**
```javascript
export const FOOD_TOKEN_ADDRESS = "0xYOUR_FOOD_TOKEN_ADDRESS";
export const FOODFI_ADDRESS = "0xYOUR_FOODFI_ADDRESS";
```

### Step 3: Start App
```bash
npm run dev
# Open http://localhost:5173
```

### Step 4: Connect Wallet
1. Click "🔗 Connect Wallet"
2. MetaMask popup → Click "Connect"
3. Dashboard loads automatically

---

## 🔧 COMMON TASKS

### Add Ganache to MetaMask
```
Network Name: Ganache Local
RPC URL: http://127.0.0.1:8545
Chain ID: 1337
Currency: ETH
```

### Get Private Key from Ganache
1. Open Ganache
2. Accounts tab → Click key icon next to account
3. Copy full private key (starts with 0x)
4. MetaMask → Import Account → Paste key

### Deploy Contract in Remix
1. Open Remix: remix.ethereum.org
2. Environment: "Injected Provider - MetaMask"
3. MetaMask: "Connect" when prompted
4. Compile contract
5. Deploy with constructor parameters
6. MetaMask: "Confirm"

### Extract ABI from Remix
1. Solidity Compiler → Select contract
2. Click "Copy ABI" button (or click JSON icon)
3. Paste into `src/config/[CONTRACT]_ABI.json`

---

## 📊 VERIFY STATUS

### Ganache
```bash
curl http://127.0.0.1:8545
# Should return JSON response (not error)
```

### MetaMask
- [ ] Shows "Ganache Local" network
- [ ] Account has ~100 ETH
- [ ] Can connect to app

### App
- [ ] No errors in browser console (F12)
- [ ] Wallet button shows "✅ Connected"
- [ ] Balances display correctly
- [ ] Can submit transactions

---

## ⚠️ TROUBLESHOOTING

### "Contract addresses not set"
- [ ] Edit `src/config/contracts.js`
- [ ] Remove "REPLACE" placeholders
- [ ] Paste actual addresses from Remix
- [ ] Save file

### "Wrong network"
- [ ] MetaMask: Switch to "Ganache Local"
- [ ] Verify Chain ID is 1337
- [ ] Refresh app page

### "Can't connect wallet"
- [ ] Reload page (Ctrl+R)
- [ ] MetaMask: Disconnect and reconnect
- [ ] Restart Ganache

### "Transaction failed"
- [ ] Check Ganache console for errors
- [ ] Verify contract addresses are correct
- [ ] Ensure account has ETH (>0)

---

## 📁 PROJECT STRUCTURE

```
src/
├── blockchain/
│   └── blockchain.js          ← Web3 service (edit to add functions)
├── config/
│   ├── contracts.js           ← ⚠️ EDIT: Add your addresses here
│   ├── FOOD_TOKEN_ABI.json    ← ⚠️ EDIT: Paste real ABI from Remix
│   └── FOODFI_ABI.json        ← ⚠️ EDIT: Paste real ABI from Remix
├── components/
│   └── Web3/
│       ├── Web3Provider.jsx   ← Context provider
│       ├── WalletButton.jsx   ← Connect button
│       ├── FoodFiDashboard.jsx ← Main UI
│       └── Web3.module.css    ← Styles
└── App.jsx                    ← Main app (uses Web3Provider)
```

---

## 🔌 BLOCKCHAIN SERVICE API

### Import
```javascript
import * as blockchainService from '../blockchain/blockchain.js';
```

### Connect Wallet
```javascript
const account = await blockchainService.connectWallet();
// Prompts MetaMask, returns account address
```

### Get Balances
```javascript
const ethBal = await blockchainService.getAccountBalance();     // "100.25"
const foodBal = await blockchainService.getMyFOODBalance();     // "50.5"
```

### Record Food Saving
```javascript
const receipt = await blockchainService.recordFoodSaving(
  "0xUser",  // participant address
  5          // kg saved
);
// MetaMask popup → Confirm → tx.wait() → returns receipt
```

### Get Stats
```javascript
const stats = await blockchainService.getParticipantStats("0xUser");
// Returns: { foodSavedKg: "5", rewardsEarned: "5", participationCount: "1" }
```

### Check Network
```javascript
const isGanache = await blockchainService.isConnectedToGanache();
// true if connected to chain ID 1337
```

---

## 📝 SAMPLE CODE

### Use Wallet in Component
```jsx
import { useWeb3 } from '../components/Web3';

function MyComponent() {
  const { isConnected, account, connectWallet } = useWeb3();
  
  return (
    <div>
      {isConnected ? (
        <p>Connected: {account}</p>
      ) : (
        <button onClick={connectWallet}>Connect</button>
      )}
    </div>
  );
}
```

### Call Contract Function
```jsx
const { recordFoodSaving, transactionInProgress } = useWeb3();

async function handleSave() {
  try {
    const receipt = await recordFoodSaving(5); // 5 kg
    console.log('Success:', receipt.hash);
  } catch (error) {
    console.error('Failed:', error);
  }
}
```

---

## 🧪 TESTING CHECKLIST

- [ ] Can connect MetaMask to app
- [ ] ETH balance displays
- [ ] FOOD balance displays
- [ ] Can record food saving
- [ ] MetaMask popup appears
- [ ] Ganache shows new transaction
- [ ] Stats update after transaction
- [ ] Changing account updates UI
- [ ] Changing network shows error
- [ ] No errors in console

---

## 🎓 FOR COLLEGE PRACTICAL RECORD

### Screenshots to Take
1. Ganache with 10 accounts
2. MetaMask "Ganache Local" network
3. MetaMask showing 100 ETH balance
4. Remix deployed contracts
5. App "Connect Wallet" button
6. App after wallet connected
7. Account balances displayed
8. MetaMask transaction confirmation
9. Success message after transaction
10. Updated participant statistics
11. Ganache transaction history
12. Browser console (no errors)

### Files to Show
- `src/blockchain/blockchain.js` - Web3 service implementation
- `src/config/contracts.js` - Contract addresses configuration
- `src/components/Web3/` - React components
- `package.json` - Dependencies (ethers.js)

### Report Sections
1. Objective
2. Theory & Concepts
3. Hardware & Software
4. Step-by-step Implementation
5. Execution Workflow
6. Verification Checkpoints
7. Screenshots with Captions
8. Result Statement
9. Conclusion
10. Error Handling

---

## ✅ VERIFICATION COMMANDS

### Check Ganache
```bash
curl http://127.0.0.1:8545 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}'

# Should return: {"jsonrpc":"2.0","result":"1337","id":1}
```

### Check MetaMask Connection
```javascript
// In browser console:
if (window.ethereum) {
  console.log("✅ MetaMask detected");
  const accounts = await window.ethereum.request({method:'eth_accounts'});
  console.log("Connected accounts:", accounts);
} else {
  console.log("❌ MetaMask not found");
}
```

### Check Ethers.js
```javascript
// In browser console:
console.log("Ethers version:", ethers.version);
// Should show: Ethers version: 6.x.x
```

---

## 📞 SUPPORT

- **Ganache Issues**: Check http://127.0.0.1:8545
- **MetaMask Issues**: Clear cache, reinstall extension
- **Contract Issues**: Check Remix compilation and deployment
- **App Issues**: Check browser console (F12) for errors
- **Transaction Issues**: Check Ganache accounts and gas

---

**Last Updated**: 31-08-2024  
**Version**: 1.0  
**Status**: ✅ Production Ready  
