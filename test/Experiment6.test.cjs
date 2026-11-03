const { expect } = require("chai");
const { ethers } = require("hardhat");

const deadline = async () => (await ethers.provider.getBlock("latest")).timestamp + 3600;

async function deployDex() {
  const [provider, trader, recipient] = await ethers.getSigners();
  const tokenA = await (await ethers.getContractFactory(
    "contracts/active/Experiment6/MockERC20.sol:MockERC20",
  )).deploy("Token A", "A");
  const tokenB = await (await ethers.getContractFactory(
    "contracts/active/Experiment6/MockERC20.sol:MockERC20",
  )).deploy("Token B", "B");
  const factory = await (await ethers.getContractFactory("Factory")).deploy();
  const router = await (await ethers.getContractFactory("Router"))
    .deploy(await factory.getAddress());

  await tokenA.mint(provider.address, 1000000);
  await tokenB.mint(provider.address, 1000000);
  await tokenA.approve(await router.getAddress(), ethers.MaxUint256);
  await tokenB.approve(await router.getAddress(), ethers.MaxUint256);

  return { provider, trader, recipient, tokenA, tokenB, factory, router };
}

async function addLiquidity(router, tokenA, tokenB, amountA, amountB, provider) {
  await router.addLiquidity(
    await tokenA.getAddress(),
    await tokenB.getAddress(),
    amountA,
    amountB,
    0,
    0,
    provider.address,
    await deadline(),
  );
}

async function pairFor(factory, tokenA, tokenB) {
  const address = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
  return ethers.getContractAt("Pair", address);
}

describe("Experiment 6 - FoodFi DEX", function () {
  it("scenario 1: first deposit mints 1000 LP, totals 2000, and locks 1000", async function () {
    const { provider, tokenA, tokenB, factory, router } = await deployDex();
    await addLiquidity(router, tokenA, tokenB, 1000, 4000, provider);
    const pair = await pairFor(factory, tokenA, tokenB);

    expect(await pair.totalSupply()).to.equal(2000);
    expect(await pair.balanceOf(provider.address)).to.equal(1000);
    expect(await pair.balanceOf("0x000000000000000000000000000000000000dEaD")).to.equal(1000);
    const [reserveA, reserveB] = await router.getReserves(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
    );
    expect(reserveA).to.equal(1000);
    expect(reserveB).to.equal(4000);
  });

  it("scenario 2: sells 100 A for 181 B and updates reserves to 1100 / 1819", async function () {
    const { provider, tokenA, tokenB, factory, router } = await deployDex();
    await addLiquidity(router, tokenA, tokenB, 1000, 2000, provider);
    expect(await router.getAmountOut(100, 1000, 2000)).to.equal(181);

    const swap = router.swapExactTokensForTokens(
      100, 181, [await tokenA.getAddress(), await tokenB.getAddress()], provider.address, await deadline(),
    );
    await expect(swap).to.emit(await pairFor(factory, tokenA, tokenB), "Swap");
    const [reserveA, reserveB] = await router.getReserves(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
    );
    expect(reserveA).to.equal(1100);
    expect(reserveB).to.equal(1819);
  });

  it("scenario 3: rejects an output of 182 B for 100 A with K", async function () {
    const { provider, tokenA, tokenB, factory, router } = await deployDex();
    await addLiquidity(router, tokenA, tokenB, 1000, 2000, provider);
    const dexPair = await pairFor(factory, tokenA, tokenB);
    await tokenA.transfer(await dexPair.getAddress(), 100);
    const aIsToken0 = (await dexPair.token0()).toLowerCase() === (await tokenA.getAddress()).toLowerCase();
    await expect(
      dexPair.swap(aIsToken0 ? 0 : 182, aIsToken0 ? 182 : 0, provider.address),
    ).to.be.revertedWith("K");
  });

  it("scenario 4: rejects swaps that have no input tokens", async function () {
    const { provider, tokenA, tokenB, factory, router } = await deployDex();
    await addLiquidity(router, tokenA, tokenB, 1000, 2000, provider);
    const pair = await pairFor(factory, tokenA, tokenB);
    const aIsToken0 = (await pair.token0()).toLowerCase() === (await tokenA.getAddress()).toLowerCase();
    await expect(pair.swap(aIsToken0 ? 0 : 1, aIsToken0 ? 1 : 0, provider.address))
      .to.be.revertedWith("INSUFFICIENT_INPUT_AMOUNT");
  });

  it("scenario 5: enforces amountOutMin after another trader moves the price", async function () {
    const { provider, trader, tokenA, tokenB, router } = await deployDex();
    await addLiquidity(router, tokenA, tokenB, 1000, 2000, provider);
    await tokenA.transfer(trader.address, 120);
    await tokenA.connect(trader).approve(await router.getAddress(), 120);
    await router.connect(trader).swapExactTokensForTokens(
      20, 0, [await tokenA.getAddress(), await tokenB.getAddress()], trader.address, await deadline(),
    );
    await expect(router.connect(trader).swapExactTokensForTokens(
      100, 179, [await tokenA.getAddress(), await tokenB.getAddress()], trader.address, await deadline(),
    )).to.be.revertedWith("INSUFFICIENT_OUTPUT_AMOUNT");
  });

  it("scenario 6: rejects an expired swap deadline", async function () {
    const { provider, tokenA, tokenB, router } = await deployDex();
    await addLiquidity(router, tokenA, tokenB, 1000, 2000, provider);
    await expect(router.swapExactTokensForTokens(
      1, 0, [await tokenA.getAddress(), await tokenB.getAddress()], provider.address, 0,
    )).to.be.revertedWith("EXPIRED");
  });

  it("scenario 7: does not allow a 100-token allowance to fund a 200-token swap", async function () {
    const { provider, trader, tokenA, tokenB, router } = await deployDex();
    await addLiquidity(router, tokenA, tokenB, 1000, 2000, provider);
    await tokenA.transfer(trader.address, 200);
    await tokenA.connect(trader).approve(await router.getAddress(), 100);
    await expect(router.connect(trader).swapExactTokensForTokens(
      200, 0, [await tokenA.getAddress(), await tokenB.getAddress()], trader.address, await deadline(),
    )).to.be.revertedWithCustomError(tokenA, "InsufficientAllowance");
  });

  it("scenario 8: routes A to B to C and returns 21 C using the documented output", async function () {
    const { provider, trader, tokenA, tokenB, factory, router } = await deployDex();
    const tokenC = await (await ethers.getContractFactory(
      "contracts/active/Experiment6/MockERC20.sol:MockERC20",
    )).deploy("Token C", "C");
    await tokenC.mint(provider.address, 1000000);
    await tokenC.approve(await router.getAddress(), ethers.MaxUint256);
    await addLiquidity(router, tokenA, tokenB, 1000, 4000, provider);
    await addLiquidity(router, tokenB, tokenC, 30000, 1800, provider);
    await tokenA.transfer(trader.address, 100);
    await tokenA.connect(trader).approve(await router.getAddress(), 100);

    const path = [await tokenA.getAddress(), await tokenB.getAddress(), await tokenC.getAddress()];
    expect(await router.getAmountsOut(100, path)).to.deep.equal([100n, 362n, 21n]);
    await router.connect(trader).swapExactTokensForTokens(
      100, 21, path, trader.address, await deadline(),
    );
    expect(await tokenC.balanceOf(trader.address)).to.equal(21);
  });

  it("scenario 9: limits a 500 A / 3000 B deposit to 500 A / 2000 B", async function () {
    const { provider, tokenA, tokenB, factory, router } = await deployDex();
    await addLiquidity(router, tokenA, tokenB, 1000, 4000, provider);
    const pair = await pairFor(factory, tokenA, tokenB);
    const result = await router.addLiquidity.staticCall(
      await tokenA.getAddress(), await tokenB.getAddress(), 500, 3000, 0, 0, provider.address, await deadline(),
    );
    expect(result).to.deep.equal([500n, 2000n, 1000n]);
    await router.addLiquidity(
      await tokenA.getAddress(), await tokenB.getAddress(), 500, 3000, 0, 0, provider.address, await deadline(),
    );
    expect(await pair.balanceOf(provider.address)).to.equal(2000);
    const [reserveA, reserveB] = await router.getReserves(
      await tokenA.getAddress(), await tokenB.getAddress(),
    );
    expect(reserveA).to.equal(1500);
    expect(reserveB).to.equal(6000);
  });

  it("scenario 10: rejects creation of a duplicate pair", async function () {
    const { tokenA, tokenB, factory } = await deployDex();
    await factory.createPair(await tokenA.getAddress(), await tokenB.getAddress());
    await expect(factory.createPair(await tokenB.getAddress(), await tokenA.getAddress()))
      .to.be.revertedWith("PAIR_EXISTS");
  });

  it("supports max allowance and proportionate liquidity removal", async function () {
    const { provider, trader, tokenA, tokenB, factory, router } = await deployDex();
    await addLiquidity(router, tokenA, tokenB, 1000, 2000, provider);
    const pair = await pairFor(factory, tokenA, tokenB);
    await tokenA.approve(trader.address, ethers.MaxUint256);
    await tokenA.connect(trader).transferFrom(provider.address, trader.address, 1);
    expect(await tokenA.allowance(provider.address, trader.address)).to.equal(ethers.MaxUint256);

    const shares = await pair.balanceOf(provider.address);
    await pair.approve(await router.getAddress(), shares);
    await router.removeLiquidity(
      await tokenA.getAddress(), await tokenB.getAddress(), shares / 2n, 0, 0, provider.address, await deadline(),
    );
    expect(await pair.balanceOf(provider.address)).to.equal(shares - shares / 2n);
    const [reserveA, reserveB] = await router.getReserves(
      await tokenA.getAddress(), await tokenB.getAddress(),
    );
    expect(reserveA).to.be.lessThan(1000n);
    expect(reserveB).to.be.lessThan(2000n);
  });
});
