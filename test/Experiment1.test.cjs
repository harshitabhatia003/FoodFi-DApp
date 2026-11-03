const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Experiment 1 - FoodFi order payments", function () {
  it("records an on-chain order, forwards payment, and pays configured FOOD rewards", async function () {
    const [merchant, customer] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("FoodFiToken"))
      .deploy(ethers.parseEther("1000"));
    const orders = await (await ethers.getContractFactory("FoodFiOrders"))
      .deploy(merchant.address, await token.getAddress(), ethers.parseEther("1"));
    await token.transfer(await orders.getAddress(), ethers.parseEther("5"));

    const hash = ethers.keccak256(ethers.toUtf8Bytes("meal-id:1|qty:2"));
    const payment = ethers.parseEther("0.01");
    const merchantBefore = await ethers.provider.getBalance(merchant.address);
    const tx = await orders.connect(customer).placeOrder(hash, { value: payment });
    const receipt = await tx.wait();

    expect(await ethers.provider.getBalance(merchant.address)).to.equal(merchantBefore + payment);
    expect(await token.balanceOf(customer.address)).to.equal(ethers.parseEther("1"));
    expect(await orders.orderCount(customer.address)).to.equal(1);
    const storedOrder = await orders.orders(1);
    expect(storedOrder.customer).to.equal(customer.address);
    expect(storedOrder.amountPaid).to.equal(payment);
    expect(storedOrder.orderHash).to.equal(hash);
    expect(storedOrder.placedAt).to.equal(
      BigInt((await ethers.provider.getBlock(receipt.blockNumber)).timestamp),
    );
    await expect(tx).to.emit(orders, "OrderPlaced").withArgs(1, customer.address, payment, hash);
  });

  it("rejects orders without a payment or order commitment", async function () {
    const [merchant, customer] = await ethers.getSigners();
    const orders = await (await ethers.getContractFactory("FoodFiOrders"))
      .deploy(merchant.address, ethers.ZeroAddress, 0);

    await expect(orders.connect(customer).placeOrder(ethers.ZeroHash, { value: 1 }))
      .to.be.revertedWithCustomError(orders, "InvalidOrder");
    await expect(orders.connect(customer).placeOrder(ethers.id("meal")))
      .to.be.revertedWithCustomError(orders, "InvalidOrder");
  });
});
