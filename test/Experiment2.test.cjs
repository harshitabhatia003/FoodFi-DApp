const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Experiment 2 - FOOD token and saving rewards", function () {
  it("supports owner minting, transfers, allowances, and transferFrom", async function () {
    const [owner, alice, spender] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("FoodFiToken"))
      .deploy(ethers.parseEther("100"));

    await expect(token.mint(alice.address, ethers.parseEther("5")))
      .to.emit(token, "Transfer")
      .withArgs(ethers.ZeroAddress, alice.address, ethers.parseEther("5"));
    await token.connect(alice).approve(spender.address, ethers.parseEther("3"));
    await token.connect(spender).transferFrom(alice.address, owner.address, ethers.parseEther("2"));

    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("102"));
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("3"));
    expect(await token.allowance(alice.address, spender.address)).to.equal(ethers.parseEther("1"));
    await expect(token.connect(alice).mint(alice.address, 1))
      .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });

  it("funds verified food-saving rewards and tracks actual payouts", async function () {
    const [owner, participant, other] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("FoodFiToken"))
      .deploy(ethers.parseEther("1000"));
    const rewards = await (await ethers.getContractFactory("FoodSavingRewards"))
      .deploy(await token.getAddress());

    await token.approve(await rewards.getAddress(), ethers.parseEther("100"));
    await rewards.depositRewards(ethers.parseEther("100"));
    await expect(rewards.connect(other).recordFoodSaving(participant.address, 2))
      .to.be.revertedWithCustomError(rewards, "OwnableUnauthorizedAccount");

    await expect(rewards.recordFoodSaving(participant.address, 2))
      .to.emit(rewards, "FoodSavingRecorded")
      .withArgs(participant.address, 2, ethers.parseEther("20"));
    expect(await token.balanceOf(participant.address)).to.equal(ethers.parseEther("20"));
    expect(await rewards.getParticipantStats(participant.address)).to.deep.equal([2n, ethers.parseEther("20"), 1n]);
  });
});
