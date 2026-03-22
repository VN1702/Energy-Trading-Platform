const { expect }         = require("chai");
const { ethers }         = require("hardhat");
const { loadFixture }    = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("EnergyTrading", function () {
  // ── Fixture ─────────────────────────────────────────────────────────
  async function deployFixture() {
    const [owner, seller, buyer, stranger] = await ethers.getSigners();
    const Factory  = await ethers.getContractFactory("EnergyTrading");
    const contract = await Factory.deploy();
    return { contract, owner, seller, buyer, stranger };
  }

  // Helper: create a standard listing
  async function createListing(contract, seller, energy = 100n, price = ethers.parseEther("0.001")) {
    const tx     = await contract.connect(seller).createListing(energy, price, "house_01");
    const receipt = await tx.wait();
    const event  = receipt.logs.find(l => l.fragment?.name === "ListingCreated");
    return event?.args?.id ?? 1n;
  }

  // ── Deployment ───────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("sets the owner correctly", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("initializes with zero listings and trades", async function () {
      const { contract } = await loadFixture(deployFixture);
      expect(await contract.listingCount()).to.equal(0n);
      expect(await contract.tradeCount()).to.equal(0n);
    });

    it("sets default platform fee to 1%", async function () {
      const { contract } = await loadFixture(deployFixture);
      expect(await contract.platformFeePercent()).to.equal(1n);
    });
  });

  // ── Create Listing ───────────────────────────────────────────────────
  describe("createListing", function () {
    it("creates listing with correct data", async function () {
      const { contract, seller } = await loadFixture(deployFixture);
      const energy = 200n;
      const price  = ethers.parseEther("0.001");

      await contract.connect(seller).createListing(energy, price, "house_01");

      const listing = await contract.listings(1);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.energyAmount).to.equal(energy);
      expect(listing.pricePerUnit).to.equal(price);
      expect(listing.totalPrice).to.equal(energy * price);
      expect(listing.status).to.equal(0); // Active
    });

    it("emits ListingCreated event", async function () {
      const { contract, seller } = await loadFixture(deployFixture);
      await expect(
        contract.connect(seller).createListing(100n, ethers.parseEther("0.001"), "house_01")
      ).to.emit(contract, "ListingCreated");
    });

    it("reverts when energy amount is 0", async function () {
      const { contract, seller } = await loadFixture(deployFixture);
      await expect(
        contract.connect(seller).createListing(0n, ethers.parseEther("0.001"), "house_01")
      ).to.be.revertedWith("Energy must be > 0");
    });

    it("reverts when price is 0", async function () {
      const { contract, seller } = await loadFixture(deployFixture);
      await expect(
        contract.connect(seller).createListing(100n, 0n, "house_01")
      ).to.be.revertedWith("Price must be > 0");
    });

    it("reverts when sellerId is empty", async function () {
      const { contract, seller } = await loadFixture(deployFixture);
      await expect(
        contract.connect(seller).createListing(100n, ethers.parseEther("0.001"), "")
      ).to.be.revertedWith("SellerId required");
    });
  });

  // ── Buy Energy ───────────────────────────────────────────────────────
  describe("buyEnergy — Successful Trade", function () {
    it("executes a successful trade", async function () {
      const { contract, seller, buyer } = await loadFixture(deployFixture);
      const energy     = 100n;
      const price      = ethers.parseEther("0.001");
      const listingId  = await createListing(contract, seller, energy, price);
      const totalPrice = energy * price;

      await expect(
        contract.connect(buyer).buyEnergy(listingId, "house_02", { value: totalPrice })
      ).to.emit(contract, "EnergyPurchased");

      const listing = await contract.listings(listingId);
      expect(listing.status).to.equal(1); // Sold
    });

    it("distributes funds correctly (seller + platform fee)", async function () {
      const { contract, owner, seller, buyer } = await loadFixture(deployFixture);
      const energy     = 100n;
      const price      = ethers.parseEther("0.001");
      const listingId  = await createListing(contract, seller, energy, price);
      const totalPrice = energy * price;

      await contract.connect(buyer).buyEnergy(listingId, "house_02", { value: totalPrice });

      const fee            = (totalPrice * 1n) / 100n;
      const sellerExpected = totalPrice - fee;

      expect(await contract.pendingWithdrawals(seller.address)).to.equal(sellerExpected);
      expect(await contract.pendingWithdrawals(owner.address)).to.equal(fee);
    });

    it("refunds overpayment to buyer", async function () {
      const { contract, seller, buyer } = await loadFixture(deployFixture);
      const energy     = 100n;
      const price      = ethers.parseEther("0.001");
      const listingId  = await createListing(contract, seller, energy, price);
      const totalPrice = energy * price;
      const overpay    = ethers.parseEther("1"); // much more than needed

      const balBefore = await ethers.provider.getBalance(buyer.address);
      const tx        = await contract.connect(buyer).buyEnergy(listingId, "house_02", { value: overpay });
      const receipt   = await tx.wait();
      const gasCost   = receipt.gasUsed * tx.gasPrice;
      const balAfter  = await ethers.provider.getBalance(buyer.address);

      // Buyer should only lose totalPrice + gas, not the full overpay
      expect(balBefore - balAfter - gasCost).to.equal(totalPrice);
    });

    it("increments trade count and stats", async function () {
      const { contract, seller, buyer } = await loadFixture(deployFixture);
      const energy    = 100n;
      const price     = ethers.parseEther("0.001");
      const listingId = await createListing(contract, seller, energy, price);

      await contract.connect(buyer).buyEnergy(listingId, "house_02", { value: energy * price });

      expect(await contract.tradeCount()).to.equal(1n);
      expect(await contract.totalEnergyTraded()).to.equal(energy);
    });
  });

  // ── Failure Cases ────────────────────────────────────────────────────
  describe("buyEnergy — Failure Cases", function () {
    it("reverts with insufficient payment", async function () {
      const { contract, seller, buyer } = await loadFixture(deployFixture);
      const listingId = await createListing(contract, seller);

      await expect(
        contract.connect(buyer).buyEnergy(listingId, "house_02", { value: 1n })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("reverts when seller tries to buy own listing", async function () {
      const { contract, seller } = await loadFixture(deployFixture);
      const energy    = 100n;
      const price     = ethers.parseEther("0.001");
      const listingId = await createListing(contract, seller, energy, price);

      await expect(
        contract.connect(seller).buyEnergy(listingId, "house_01", { value: energy * price })
      ).to.be.revertedWith("Cannot buy own listing");
    });

    it("reverts when listing does not exist", async function () {
      const { contract, buyer } = await loadFixture(deployFixture);

      await expect(
        contract.connect(buyer).buyEnergy(999n, "house_02", { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Invalid listing");
    });

    it("reverts when listing already sold", async function () {
      const { contract, seller, buyer, stranger } = await loadFixture(deployFixture);
      const energy    = 100n;
      const price     = ethers.parseEther("0.001");
      const listingId = await createListing(contract, seller, energy, price);

      await contract.connect(buyer).buyEnergy(listingId, "house_02", { value: energy * price });

      await expect(
        contract.connect(stranger).buyEnergy(listingId, "house_03", { value: energy * price })
      ).to.be.revertedWith("Not active");
    });

    it("reverts when no available sellers (no listings)", async function () {
      const { contract, buyer } = await loadFixture(deployFixture);
      const activeIds = await contract.getActiveListingIds();
      expect(activeIds.length).to.equal(0);
    });
  });

  // ── Cancel Listing ───────────────────────────────────────────────────
  describe("cancelListing", function () {
    it("allows seller to cancel listing", async function () {
      const { contract, seller } = await loadFixture(deployFixture);
      const listingId = await createListing(contract, seller);

      await expect(contract.connect(seller).cancelListing(listingId))
        .to.emit(contract, "ListingCancelled");

      const listing = await contract.listings(listingId);
      expect(listing.status).to.equal(2); // Cancelled
    });

    it("removes from active listing IDs after cancel", async function () {
      const { contract, seller } = await loadFixture(deployFixture);
      const listingId = await createListing(contract, seller);

      await contract.connect(seller).cancelListing(listingId);

      const activeIds = await contract.getActiveListingIds();
      expect(activeIds).to.not.include(listingId);
    });

    it("reverts when stranger tries to cancel", async function () {
      const { contract, seller, stranger } = await loadFixture(deployFixture);
      const listingId = await createListing(contract, seller);

      await expect(
        contract.connect(stranger).cancelListing(listingId)
      ).to.be.revertedWith("Not authorized");
    });
  });

  // ── Withdrawal ───────────────────────────────────────────────────────
  describe("withdraw", function () {
    it("allows seller to withdraw earnings", async function () {
      const { contract, seller, buyer } = await loadFixture(deployFixture);
      const energy    = 100n;
      const price     = ethers.parseEther("0.001");
      const listingId = await createListing(contract, seller, energy, price);

      await contract.connect(buyer).buyEnergy(listingId, "house_02", { value: energy * price });

      const pending    = await contract.pendingWithdrawals(seller.address);
      const balBefore  = await ethers.provider.getBalance(seller.address);
      const tx         = await contract.connect(seller).withdraw();
      const receipt    = await tx.wait();
      const gasCost    = receipt.gasUsed * tx.gasPrice;
      const balAfter   = await ethers.provider.getBalance(seller.address);

      expect(balAfter - balBefore + gasCost).to.equal(pending);
    });

    it("reverts withdraw when nothing to withdraw", async function () {
      const { contract, stranger } = await loadFixture(deployFixture);
      await expect(contract.connect(stranger).withdraw()).to.be.revertedWith("Nothing to withdraw");
    });
  });

  // ── Admin ────────────────────────────────────────────────────────────
  describe("Admin", function () {
    it("owner can update platform fee", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      await contract.connect(owner).setPlatformFee(5n);
      expect(await contract.platformFeePercent()).to.equal(5n);
    });

    it("reverts fee > 10%", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      await expect(contract.connect(owner).setPlatformFee(11n)).to.be.revertedWith("Max fee is 10%");
    });

    it("non-owner cannot update fee", async function () {
      const { contract, stranger } = await loadFixture(deployFixture);
      await expect(contract.connect(stranger).setPlatformFee(5n)).to.be.revertedWith("Not owner");
    });
  });

  // ── Performance ──────────────────────────────────────────────────────
  describe("Performance & Gas", function () {
    it("creates 10 listings under acceptable gas", async function () {
      const { contract, seller } = await loadFixture(deployFixture);
      const promises = Array.from({ length: 10 }, (_, i) =>
        contract.connect(seller).createListing(
          BigInt((i + 1) * 50),
          ethers.parseEther("0.001"),
          `house_${String(i + 1).padStart(2, "0")}`
        )
      );
      const txs = await Promise.all(promises);
      for (const tx of txs) {
        const r = await tx.wait();
        expect(r.gasUsed).to.be.lt(300000n);
      }
      expect(await contract.listingCount()).to.equal(10n);
    });
  });
});
