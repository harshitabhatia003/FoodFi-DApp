const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

const ether = (value) => hre.ethers.parseEther(value);

async function deploy(name, ...args) {
  const factory = await hre.ethers.getContractFactory(name);
  const instance = await factory.deploy(...args);
  await instance.waitForDeployment();
  return instance;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const deploymentFile = path.join(__dirname, "..", "deployments", `${chainId}.json`);

  if (process.env.REDEPLOY !== "true" && fs.existsSync(deploymentFile)) {
    const existing = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const code = await hre.ethers.provider.getCode(existing.contracts?.foodToken || "0x0000000000000000000000000000000000000000");
    if (code !== "0x") {
      throw new Error(
        `A deployment already exists for chain ${chainId}. Set REDEPLOY=true only if you intend to deploy a new instance.`,
      );
    }
  }

  const foodToken = await deploy("FoodFiToken", ether("1000000"));
  const foodRewards = await deploy("FoodSavingRewards", await foodToken.getAddress());
  const orders = await deploy(
    "FoodFiOrders",
    deployer.address,
    await foodToken.getAddress(),
    ether("1"),
  );
  const vault = await deploy("FoodFiVault", await foodToken.getAddress());

  const ammUsd = await deploy(
    "contracts/active/Experiment4/MockERC20.sol:MockERC20",
    "FoodFi AMM USD",
    "AMM-USD",
  );
  await (await ammUsd.mint(deployer.address, ether("1000000"))).wait();
  const lpToken = await deploy("LPToken");
  const liquidityPool = await deploy(
    "LiquidityPool",
    await foodToken.getAddress(),
    await ammUsd.getAddress(),
    await lpToken.getAddress(),
  );
  await (await lpToken.setPool(await liquidityPool.getAddress())).wait();

  const dexUsd = await deploy(
    "contracts/active/Experiment6/MockERC20.sol:MockERC20",
    "FoodFi DEX USD",
    "FUSD",
  );
  await (await dexUsd.mint(deployer.address, ether("1000000"))).wait();
  const dexBridge = await deploy(
    "contracts/active/Experiment6/MockERC20.sol:MockERC20",
    "FoodFi Bridge Token",
    "FBRG",
  );
  await (await dexBridge.mint(deployer.address, ether("1000000"))).wait();
  const factory = await deploy("Factory");
  await (await factory.createPair(await foodToken.getAddress(), await dexUsd.getAddress())).wait();
  const pairAddress = await factory.getPair(await foodToken.getAddress(), await dexUsd.getAddress());
  await (await factory.createPair(await foodToken.getAddress(), await dexBridge.getAddress())).wait();
  const foodBridgePair = await factory.getPair(await foodToken.getAddress(), await dexBridge.getAddress());
  await (await factory.createPair(await dexBridge.getAddress(), await dexUsd.getAddress())).wait();
  const bridgeUsdPair = await factory.getPair(await dexBridge.getAddress(), await dexUsd.getAddress());
  const router = await deploy("Router", await factory.getAddress());
  const farm = await deploy("SimpleYieldFarm", pairAddress, await foodToken.getAddress());

  await (await foodToken.approve(await foodRewards.getAddress(), ether("100000"))).wait();
  await (await foodRewards.depositRewards(ether("100000"))).wait();
  await (await foodToken.transfer(await orders.getAddress(), ether("100000"))).wait();
  await (await foodToken.transfer(await farm.getAddress(), ether("100000"))).wait();

  await (await foodToken.approve(await liquidityPool.getAddress(), ether("50000"))).wait();
  await (await ammUsd.approve(await liquidityPool.getAddress(), ether("100000"))).wait();
  await (await liquidityPool.addLiquidity(ether("50000"), ether("100000"), 1, 1)).wait();

  await (await foodToken.approve(await router.getAddress(), ether("70000"))).wait();
  await (await dexUsd.approve(await router.getAddress(), ether("120000"))).wait();
  await (await dexBridge.approve(await router.getAddress(), ether("20000"))).wait();
  await (
    await router.addLiquidity(
      await foodToken.getAddress(),
      await dexUsd.getAddress(),
      ether("50000"),
      ether("100000"),
      1,
      1,
      deployer.address,
      Math.floor(Date.now() / 1000) + 3600,
    )
  ).wait();
  await (
    await router.addLiquidity(
      await foodToken.getAddress(),
      await dexBridge.getAddress(),
      ether("10000"),
      ether("10000"),
      1,
      1,
      deployer.address,
      Math.floor(Date.now() / 1000) + 3600,
    )
  ).wait();
  await (
    await router.addLiquidity(
      await dexBridge.getAddress(),
      await dexUsd.getAddress(),
      ether("10000"),
      ether("20000"),
      1,
      1,
      deployer.address,
      Math.floor(Date.now() / 1000) + 3600,
    )
  ).wait();

  const deployment = {
    chainId,
    networkName: network.name,
    deployer: deployer.address,
    deploymentBlock: await hre.ethers.provider.getBlockNumber(),
    contracts: {
      foodToken: await foodToken.getAddress(),
      foodRewards: await foodRewards.getAddress(),
      orders: await orders.getAddress(),
      vault: await vault.getAddress(),
      ammUsd: await ammUsd.getAddress(),
      ammLpToken: await lpToken.getAddress(),
      liquidityPool: await liquidityPool.getAddress(),
      dexUsd: await dexUsd.getAddress(),
      factory: await factory.getAddress(),
      router: await router.getAddress(),
      dexPair: pairAddress,
      foodBridgePair,
      bridgeUsdPair,
      dexBridge: await dexBridge.getAddress(),
      farm: await farm.getAddress(),
    },
    tokens: [
      { address: await foodToken.getAddress(), name: "FoodFi Token", symbol: "FOOD", decimals: 18 },
      { address: await dexUsd.getAddress(), name: "FoodFi DEX USD", symbol: "FUSD", decimals: 18 },
      { address: await dexBridge.getAddress(), name: "FoodFi Bridge Token", symbol: "FBRG", decimals: 18 },
      { address: await ammUsd.getAddress(), name: "FoodFi AMM USD", symbol: "AMM-USD", decimals: 18 },
    ],
  };

  fs.mkdirSync(path.dirname(deploymentFile), { recursive: true });
  fs.writeFileSync(deploymentFile, `${JSON.stringify(deployment, null, 2)}\n`);
  const frontendFile = path.join(__dirname, "..", "src", "config", "deployment.json");
  fs.writeFileSync(frontendFile, `${JSON.stringify(deployment, null, 2)}\n`);
  console.log(`FoodFi contracts deployed to chain ${chainId}:`);
  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
