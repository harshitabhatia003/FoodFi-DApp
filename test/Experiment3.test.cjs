const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Experiment 3 - FoodFi ERC-4626 savings vault", function () {
  it("supports deposit, mint, withdraw, redeem, and share accounting", async function () {
    const [owner, user] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("FoodFiToken"))
      .deploy(ethers.parseEther("1000"));
    const vault = await (await ethers.getContractFactory("FoodFiVault"))
      .deploy(await token.getAddress());
    await token.transfer(user.address, ethers.parseEther("200"));
    await token.connect(user).approve(await vault.getAddress(), ethers.parseEther("200"));

    await vault.connect(user).deposit(ethers.parseEther("100"), user.address);
    expect(await vault.balanceOf(user.address)).to.equal(ethers.parseEther("100"));
    expect(await vault.totalAssets()).to.equal(ethers.parseEther("100"));

    await vault.connect(user).mint(ethers.parseEther("20"), user.address);
    expect(await vault.totalAssets()).to.equal(ethers.parseEther("120"));
    expect(await vault.balanceOf(user.address)).to.equal(ethers.parseEther("120"));

    await vault.connect(user).withdraw(ethers.parseEther("25"), user.address, user.address);
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("105"));
    expect(await vault.totalAssets()).to.equal(ethers.parseEther("95"));

    await vault.connect(user).redeem(ethers.parseEther("15"), user.address, user.address);
    expect(await vault.balanceOf(user.address)).to.equal(ethers.parseEther("80"));
    expect(await vault.totalAssets()).to.equal(ethers.parseEther("80"));
    expect(await vault.convertToAssets(ethers.parseEther("10"))).to.equal(ethers.parseEther("10"));
    expect(owner.address).not.to.equal(user.address);
  });
});
