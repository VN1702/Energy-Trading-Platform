/**
 * In-memory data store with O(1) lookups
 * Acts as a fast cache layer; swap for MongoDB adapter for persistence
 */

class Store {
  constructor() {
    this.houses       = new Map();  // houseId → HouseData
    this.listings     = new Map();  // listingId → Listing
    this.trades       = new Map();  // tradeId → Trade
    this.analytics    = {
      totalEnergyTraded: 0,
      totalVolumeEth:    0,
      totalTrades:       0,
      avgConfirmTime:    0,
      totalGasFees:      0,
      peakDemandHour:    null,
      hourlyStats:       new Array(24).fill(null).map(() => ({
        produced: 0, consumed: 0, traded: 0
      })),
    };
    this._listingsByPrice = [];   // sorted array for matching engine
  }

  // ── HOUSES ──────────────────────────────────────────────────────────

  upsertHouse(house) {
    this.houses.set(house.id, { ...house, updatedAt: Date.now() });
  }

  getHouse(id) { return this.houses.get(id); }

  getAllHouses() { return Array.from(this.houses.values()); }

  // ── LISTINGS ─────────────────────────────────────────────────────────

  addListing(listing) {
    this.listings.set(listing.id, listing);
    this._rebuildPriceSortedIndex();
  }

  updateListing(id, updates) {
    const listing = this.listings.get(id);
    if (!listing) return null;
    const updated = { ...listing, ...updates, updatedAt: Date.now() };
    this.listings.set(id, updated);
    this._rebuildPriceSortedIndex();
    return updated;
  }

  getListing(id) { return this.listings.get(id); }

  getActiveListings() {
    return this._listingsByPrice.filter(l => l.status === "active");
  }

  getAllListings() { return Array.from(this.listings.values()); }

  // ── TRADES ───────────────────────────────────────────────────────────

  addTrade(trade) {
    this.trades.set(trade.id, trade);
    this._updateAnalytics(trade);
  }

  getTrade(id) { return this.trades.get(id); }

  getAllTrades() {
    return Array.from(this.trades.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getRecentTrades(limit = 50) {
    return this.getAllTrades().slice(0, limit);
  }

  // ── ANALYTICS ────────────────────────────────────────────────────────

  getAnalytics() {
    const trades  = Array.from(this.trades.values());
    const houses  = Array.from(this.houses.values());

    const totalProduced  = houses.reduce((s, h) => s + (h.energyProduced  || 0), 0);
    const totalConsumed  = houses.reduce((s, h) => s + (h.energyConsumed  || 0), 0);
    const totalSurplus   = houses.reduce((s, h) => s + Math.max(0, h.surplus || 0), 0);
    const totalDeficit   = houses.reduce((s, h) => s + Math.max(0, -(h.surplus || 0)), 0);
    const activeListings = this.getActiveListings().length;

    return {
      ...this.analytics,
      totalProduced,
      totalConsumed,
      totalSurplus,
      totalDeficit,
      activeListings,
      totalHouses:  houses.length,
      totalListings: this.listings.size,
    };
  }

  // ── PRIVATE ──────────────────────────────────────────────────────────

  _rebuildPriceSortedIndex() {
    this._listingsByPrice = Array.from(this.listings.values())
      .filter(l => l.status === "active")
      .sort((a, b) => a.pricePerUnit - b.pricePerUnit);
  }

  _updateAnalytics(trade) {
    this.analytics.totalTrades++;
    this.analytics.totalEnergyTraded += trade.energyAmount || 0;
    this.analytics.totalVolumeEth    += parseFloat(trade.totalPaidEth || 0);
    if (trade.confirmationTimeMs) {
      const prev = this.analytics.avgConfirmTime;
      this.analytics.avgConfirmTime =
        (prev * (this.analytics.totalTrades - 1) + trade.confirmationTimeMs) /
        this.analytics.totalTrades;
    }
    if (trade.gasFeeEth) {
      this.analytics.totalGasFees += parseFloat(trade.gasFeeEth);
    }
  }
}

module.exports = new Store();   // singleton
