require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

const networks = {
  hardhat: { chainId: 1337, hardfork: "cancun" },
  localhost: {
    url: process.env.LOCAL_RPC_URL || "http://127.0.0.1:7545",
    chainId: 1337,
  },
};

if (process.env.SEPOLIA_RPC_URL && process.env.PRIVATE_KEY) {
  networks.sepolia = {
    url: process.env.SEPOLIA_RPC_URL,
    chainId: 11155111,
    accounts: [process.env.PRIVATE_KEY],
  };
}

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
    },
  },
  networks,
  paths: {
    sources: "./contracts/active",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
