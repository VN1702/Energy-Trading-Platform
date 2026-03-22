const store      = require("../models/store");
const blockchain = require("./blockchainService");
const { v4: uuid } = require("uuid");
const { ethers } = require("ethers");

/**
 * Off-chain Matching Engine
 * ─────────────────────────
 * Matches buy requests against sell listings sorted by lowest price.
 * Executes matching off-chain for performance, then settles on-chain.
 */
class MatchingEngine {
  constructor() {
    this.isRunning = false;
    this.matchInterval = null;
  }

  start(intervalMs = 5000) {
    if (this.isRunning) return;
    this.isRunning    = true;
    this.matchInterval = setInterval(() => this.runMatchingCycle(), intervalMs);
    console.log(`⚙️  Matching engine started (interval: ${intervalMs}ms)`);
  }

  stop() {
    this.isRunning = false;
    clearInterval(this.matchInterval);
  }

  /**
   * Main matching cycle:
   * 1. Collect houses with deficit (buyers)
   * 2. Match against lowest-price listings (sellers)
   * 3. Settle on-chain
   */
  async runMatchingCycle() {
    try {
      const buyers   = this._collectBuyers();
      const listings = store.getActiveListings();   // pre-sorted by price ASC

      if (buyers.length === 0 || listings.length === 0) return;

      const matches = this._match(buyers, listings);
      if (matches.length === 0) return;

      console.log(`🔄 Matching cycle: ${matches.length} potential trade(s)`);

      for (const match of matches) {
        await this.executeTrade(match);
      }
    } catch (err) {
      console.error("❌ Matching cycle error:", err.message);
    }
  }

  /**
   * Greedily matches buyers to listings by lowest price
   */
  _match(buyers, listings) {
    const matches         = [];
    const usedListings    = new Set();
    const remainingBudget = new Map(buyers.map(b => [b.houseId, b.walletBalance]));

    for (const listing of listings) {
      if (usedListings.has(listing.id)) continue;

      for (const buyer of buyers) {
        if (buyer.houseId === listing.sellerId) continue;          // skip self
        const budget = remainingBudget.get(buyer.houseId) || 0;
        if (budget < listing.totalPriceEth) continue;             // insufficient funds

        matches.push({
          listing,
          buyer,
          priceEth:   listing.totalPriceEth,
          energyWh:   listing.energyAmount,
        });

        remainingBudget.set(buyer.houseId, budget - listing.totalPriceEth);
        usedListings.add(listing.id);
        break; // one buyer per listing
      }
    }

    return matches;
  }

  /**
   * Collect houses with energy deficit as potential buyers
   */
  _collectBuyers() {
    return store.getAllHouses()
      .filter(h => h.surplus < 0 && h.walletBalance > 0.001)
      .sort((a, b) => a.surplus - b.surplus);   // most desperate first
  }

  /**
   * Execute a matched trade (off-chain settlement + on-chain call)
   */
  async executeTrade({ listing, buyer, priceEth, energyWh }) {
    const tradeId = uuid();
    const startMs = Date.now();

    // ── 1. Mark listing inactive off-chain immediately ──────────────
    store.updateListing(listing.id, { status: "processing" });

    // ── 2. Settle on-chain ──────────────────────────────────────────
    let txResult = { success: false };
    try {
      const priceWei = ethers.parseEther(priceEth.toString());
      txResult = await blockchain.buyEnergy(
        parseInt(buyer.houseId.split("_")[1]) - 1,
        listing.chainListingId || 0,
        priceWei.toString(),
        buyer.houseId
      );
    } catch (chainErr) {
      console.error(`⛓️  Chain error for trade ${tradeId}:`, chainErr.message);
      // Revert off-chain state
      store.updateListing(listing.id, { status: "active" });
      return null;
    }

    // ── 3. Finalize listing as sold ─────────────────────────────────
    store.updateListing(listing.id, {
      status:      "sold",
      soldAt:      Date.now(),
      txHash:      txResult.txHash,
      buyerId:     buyer.houseId,
    });

    // ── 4. Update house states ──────────────────────────────────────
    const seller = store.getHouse(listing.sellerId);
    if (seller) {
      store.upsertHouse({
        ...seller,
        walletBalance: (seller.walletBalance || 0) + parseFloat(priceEth),
      });
    }
    store.upsertHouse({
      ...buyer,
      walletBalance: (buyer.walletBalance || 0) - parseFloat(priceEth),
    });

    // ── 5. Record trade ─────────────────────────────────────────────
    const trade = {
      id:                 tradeId,
      listingId:          listing.id,
      sellerId:           listing.sellerId,
      buyerId:            buyer.houseId,
      energyAmount:       energyWh,
      totalPaidEth:       priceEth,
      pricePerUnitEth:    listing.pricePerUnit,
      txHash:             txResult.txHash,
      blockNumber:        txResult.blockNumber,
      gasUsed:            txResult.gasUsed,
      gasFeeEth:          txResult.gasFeeEth,
      confirmationTimeMs: txResult.confirmationTimeMs || (Date.now() - startMs),
      timestamp:          Date.now(),
      mock:               txResult.mock || false,
    };

    store.addTrade(trade);
    console.log(`✅ Trade executed: ${buyer.houseId} ← ${energyWh}Wh ← ${listing.sellerId} @ ${priceEth} ETH | tx: ${txResult.txHash?.slice(0, 10)}...`);
    return trade;
  }

  /**
   * Manual trade execution from frontend/API
   */
  async executeManualTrade(listingId, buyerHouseId) {
    const listing = store.getListing(listingId);
    if (!listing) throw new Error("Listing not found");
    if (listing.status !== "active") throw new Error("Listing not active");

    const buyer = store.getHouse(buyerHouseId);
    if (!buyer) throw new Error("Buyer house not found");

    return this.executeTrade({
      listing,
      buyer,
      priceEth:  listing.totalPriceEth,
      energyWh:  listing.energyAmount,
    });
  }
}

module.exports = new MatchingEngine();
