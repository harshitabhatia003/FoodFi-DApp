const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Experiment 4 - FoodFi constant-product AMM", function () {
  async function deployPool() {
    const [owner, user] = await ethers.getSigners();
    const tokenA = await (await ethers.getContractFactory("FoodFiToken"))
      .deploy(ethers.parseEther("100000"));
    const tokenB = await (await ethers.getContractFactory(
      "contracts/active/Experiment4/MockERC20.sol:MockERC20",
    )).deploy("Mock USD", "MUSD");
    const lpToken = await (await ethers.getContractFactory("LPToken")).deploy();
    const pool = await (await ethers.getContractFactory("LiquidityPool"))
      .deploy(await tokenA.getAddress(), await tokenB.getAddress(), await lpToken.getAddress());
    await lpToken.setPool(await pool.getAddress());
    await tokenA.transfer(user.address, ethers.parseEther("5000"));
    await tokenB.mint(user.address, ethers.parseEther("10000"));
    return { owner, user, tokenA, tokenB, lpToken, pool };
  }

  it("mints proportional LP shares, preserves the pool ratio, swaps, and removes liquidity", async function () {
    const { user, tokenA, tokenB, lpToken, pool } = await deployPool();
    await tokenA.connect(user).approve(await pool.getAddress(), ethers.parseEther("2000"));
    await tokenB.connect(user).approve(await pool.getAddress(), ethers.parseEther("7000"));

    const first = await pool.connect(user).addLiquidity(
      ethers.parseEther("1000"), ethers.parseEther("4000"), 1, 1,
    );
    await first.wait();
    const firstLiquidity = (await lpToken.balanceOf(user.address));
    expect(await pool.reserveA()).to.equal(ethers.parseEther("1000"));
    expect(await pool.reserveB()).to.equal(ethers.parseEther("4000"));
    expect(firstLiquidity).to.equal(ethers.parseEther("2000") - 1000n);

    const second = await pool.connect(user).addLiquidity(
      ethers.parseEther("500"), ethers.parseEther("3000"), 1, 1,
    );
    await second.wait();
    expect(await pool.reserveA()).to.equal(ethers.parseEther("1500"));
    expect(await pool.reserveB()).to.equal(ethers.parseEther("6000"));
    expect(await lpToken.balanceOf(user.address)).to.equal(ethers.parseEther("3000") - 1000n);

    const output = await pool.connect(user).swap.staticCall(
      await tokenA.getAddress(), ethers.parseEther("10"), 1, user.address,
    );
    await pool.connect(user).swap(await tokenA.getAddress(), ethers.parseEther("10"), output, user.address);
    expect(await pool.reserveA()).to.equal(ethers.parseEther("1510"));
    expect(await pool.reserveB()).to.equal(ethers.parseEther("6000") - output);

    const shares = await lpToken.balanceOf(user.address);
    const removed = await pool.connect(user).removeLiquidity(shares / 2n);
    await removed.wait();
    expect(await lpToken.balanceOf(user.address)).to.equal(shares - shares / 2n);
  });
});
