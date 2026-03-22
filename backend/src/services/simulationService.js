const store          = require("../models/store");
const blockchain     = require("./blockchainService");
const pricingEngine  = require("../../../simulation/pricingEngine");
const { v4: uuid }   = require("uuid");
const { ethers }     = require("ethers");

/**
 * Energy Simulation Service
 * ─────────────────────────
 * Generates realistic energy data for 20 houses,
 * auto-creates listings for surplus, auto-requests for deficit.
 */
class SimulationService {
  constructor() {
    this.houses         = [];
    this.isRunning      = false;
    this._interval      = null;
    this._listingCooldown = new Map(); // prevent spam listings
  }

  async init(count = 20) {
    const { HOUSE_PROFILES } = require("../../../simulation/houseProfiles");

    this.houses = HOUSE_PROFILES.slice(0, count).map((profile, i) => ({
      id:              `house_${String(i + 1).padStart(2, "0")}`,
      name:            profile.name,
      type:            profile.type,
      latitude:        profile.lat,
      longitude:       profile.lng,
      energyProduced:  0,
      energyConsumed:  0,
      surplus:         0,
      walletBalance:   parseFloat((Math.random() * 2 + 0.5).toFixed(4)), // 0.5–2.5 ETH
      walletAddress:   blockchain.getHouseAddress(i) || `0x${i.toString(16).padStart(40, "0")}`,
      totalProduced:   0,
      totalConsumed:   0,
      totalEarned:     0,
      totalSpent:      0,
      profile,
      _tick:           0,
    }));

    this.houses.forEach(h => store.upsertHouse(h));
    console.log(`🏘️  Simulation initialized with ${this.houses.length} houses`);
  }

  start(intervalMs = 3000) {
    if (this.isRunning) return;
    this.isRunning = true;
    this._interval = setInterval(() => this._tick(), intervalMs);
    console.log(`▶️  Simulation started (interval: ${intervalMs}ms)`);
  }

  stop() {
    this.isRunning = false;
    clearInterval(this._interval);
  }

  _tick() {
    const hour = new Date().getHours();

    this.houses.forEach(async (house, idx) => {
      house._tick++;

      // ── Generate energy values ──────────────────────────────
      const newValues = this._generateEnergyValues(house, hour);
      Object.assign(house, newValues);
      house.totalProduced += newValues.energyProduced;
      house.totalConsumed += newValues.energyConsumed;

      // ── Persist to store ────────────────────────────────────
      store.upsertHouse({ ...house });

      // ── Auto-create listings for surplus ────────────────────
      if (house.surplus > 10 && this._canList(house.id)) {
        await this._autoCreateListing(house, idx);
      }
    });
  }

  _generateEnergyValues(house, hour) {
    const profile  = house.profile;
    const baseP    = profile.baseProd;
    const baseC    = profile.baseConsump;

    // Solar curve: peaks at noon
    const solarMultiplier =
      hour >= 6 && hour <= 18
        ? Math.sin(((hour - 6) / 12) * Math.PI)
        : 0;

    // Consumption peaks: morning (7-9) and evening (18-22)
    const consumptionMultiplier =
      (hour >= 7  && hour <= 9)  ? 1.4 :
      (hour >= 18 && hour <= 22) ? 1.6 :
      (hour >= 0  && hour <= 5)  ? 0.4 : 1.0;

    // Add noise
    const noise = () => (Math.random() - 0.5) * 0.2;

    const energyProduced = Math.max(0,
      baseP * solarMultiplier * (1 + noise()) * profile.solarMultiplier
    );
    const energyConsumed = Math.max(0.1,
      baseC * consumptionMultiplier * (1 + noise()) * profile.loadMultiplier
    );
    const surplus = parseFloat((energyProduced - energyConsumed).toFixed(3));

    return { energyProduced, energyConsumed, surplus };
  }

  async _autoCreateListing(house, idx) {
    const price   = pricingEngine.calculatePrice(house.surplus);
    const listing = {
      id:            uuid(),
      chainListingId: null,
      sellerId:       house.id,
      sellerAddress:  house.walletAddress,
      energyAmount:   parseFloat(house.surplus.toFixed(2)),
      pricePerUnit:   price.pricePerUnit,
      totalPriceEth:  price.totalPrice,
      pricePerUnitEth: price.pricePerUnit,
      status:         "active",
      createdAt:      Date.now(),
    };

    store.addListing(listing);
    this._setListingCooldown(house.id);

    // Settle on chain asynchronously
    try {
      const result = await blockchain.createListing(
        idx,
        listing.energyAmount,
        ethers.parseEther(listing.pricePerUnit.toFixed(18)).toString(),
        house.id
      );
      store.updateListing(listing.id, {
        chainListingId: result.txHash,
        txHash:         result.txHash,
        gasFeeEth:      result.gasFeeEth,
      });
    } catch (e) {
      // keep off-chain listing active even if chain call fails
      console.warn(`⚠️  Chain listing failed for ${house.id}:`, e.message);
    }
  }

  _canList(houseId) {
    const last = this._listingCooldown.get(houseId) || 0;
    return Date.now() - last > 15000; // 15s cooldown per house
  }

  _setListingCooldown(houseId) {
    this._listingCooldown.set(houseId, Date.now());
  }
}

module.exports = new SimulationService();
