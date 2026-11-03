const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

const artifacts = [
  ["contracts/active/Experiment1/FoodFiOrders.sol:FoodFiOrders", "foodFiOrders"],
  ["contracts/active/Experiment2/FoodFiToken.sol:FoodFiToken", "foodFiToken"],
  ["contracts/active/Experiment2/FoodSavingRewards.sol:FoodSavingRewards", "foodSavingRewards"],
  ["contracts/active/Experiment3/FoodFiVault.sol:FoodFiVault", "foodFiVault"],
  ["contracts/active/Experiment4/LPToken.sol:LPToken", "lpToken"],
  ["contracts/active/Experiment4/LiquidityPool.sol:LiquidityPool", "liquidityPool"],
  ["contracts/active/Experiment4/MockERC20.sol:MockERC20", "mockERC20E4"],
  ["contracts/active/Experiment5/SimpleYieldFarm.sol:SimpleYieldFarm", "simpleYieldFarm"],
  ["contracts/active/Experiment6/ERC20.sol:ERC20", "dexERC20"],
  ["contracts/active/Experiment6/MockERC20.sol:MockERC20", "mockERC20E6"],
  ["contracts/active/Experiment6/Pair.sol:Pair", "pair"],
  ["contracts/active/Experiment6/Factory.sol:Factory", "factory"],
  ["contracts/active/Experiment6/Router.sol:Router", "router"],
];

async function main() {
  const output = path.join(__dirname, "..", "src", "config", "abis");
  fs.mkdirSync(output, { recursive: true });

  for (const [fullyQualifiedName, fileName] of artifacts) {
    const artifact = await hre.artifacts.readArtifact(fullyQualifiedName);
    fs.writeFileSync(
      path.join(output, `${fileName}.json`),
      `${JSON.stringify(artifact.abi, null, 2)}\n`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
