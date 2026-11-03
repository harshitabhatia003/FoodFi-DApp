const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Experiment 5 - LP yield farming", function () {
  it("stakes LP assets, accrues and claims rewards, then withdraws stake", async function () {
    const [owner, user] = await ethers.getSigners();
    const lpToken = await (await ethers.getContractFactory(
      "contracts/active/Experiment6/MockERC20.sol:MockERC20",
    )).deploy("LP Mock", "LPM");
    const rewardToken = await (await ethers.getContractFactory("FoodFiToken"))
      .deploy(ethers.parseEther("10000"));
    const farm = await (await ethers.getContractFactory("SimpleYieldFarm"))
      .deploy(await lpToken.getAddress(), await rewardToken.getAddress());
    await lpToken.mint(user.address, ethers.parseEther("20"));
    await rewardToken.transfer(await farm.getAddress(), ethers.parseEther("100"));
    await lpToken.connect(user).approve(await farm.getAddress(), ethers.parseEther("20"));

    await farm.connect(user).stake(ethers.parseEther("10"));
    expect(await farm.stakedBalance(user.address)).to.equal(ethers.parseEther("10"));
    await ethers.provider.send("evm_increaseTime", [1000]);
    await ethers.provider.send("evm_mine", []);
    expect(await farm.earned(user.address)).to.be.greaterThan(0n);

    const reward = await farm.earned(user.address);
    await farm.connect(user).claimReward();
    expect(await rewardToken.balanceOf(user.address)).to.be.greaterThanOrEqual(reward);
    await farm.connect(user).withdraw(ethers.parseEther("4"));
    expect(await farm.stakedBalance(user.address)).to.equal(ethers.parseEther("6"));
    await expect(farm.connect(user).withdraw(ethers.parseEther("7")))
      .to.be.revertedWithCustomError(farm, "InsufficientStake");
    expect(owner.address).not.to.equal(user.address);
  });
});
