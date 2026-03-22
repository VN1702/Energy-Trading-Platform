const store = require("../backend/src/models/store");

/**
 * Dynamic Pricing Engine
 * ──────────────────────
 * Calculates energy price based on:
 * - Current market supply vs demand ratio
 * - Time of day (peak vs off-peak)
 * - Seller surplus amount
 */
class PricingEngine {
  constructor() {
    this.BASE_PRICE_ETH    = 0.0001;    // base price per Wh in ETH
    this.MIN_PRICE_ETH     = 0.00005;   // floor
    this.MAX_PRICE_ETH     = 0.001;     // ceiling
    this.DEMAND_WEIGHT     = 0.6;
    this.SUPPLY_WEIGHT     = 0.4;
  }

  /**
   * Calculate price per Wh in ETH
   * @param {number} surplusWh - seller's surplus in Wh
   * @returns {{ pricePerUnit: number, totalPrice: number, marketFactor: number }}
   */
  calculatePrice(surplusWh = 50) {
    const marketFactor = this._getMarketFactor();
    const timeFactor   = this._getTimeFactor();
    const supplyFactor = this._getSupplyFactor(surplusWh);

    const rawPrice = this.BASE_PRICE_ETH * marketFactor * timeFactor * supplyFactor;
    const pricePerUnit = Math.min(
      Math.max(rawPrice, this.MIN_PRICE_ETH),
      this.MAX_PRICE_ETH
    );

    const totalPrice = parseFloat((surplusWh * pricePerUnit).toFixed(8));

    return {
      pricePerUnit:  parseFloat(pricePerUnit.toFixed(10)),
      totalPrice,
      marketFactor:  parseFloat(marketFactor.toFixed(4)),
      timeFactor:    parseFloat(timeFactor.toFixed(4)),
      supplyFactor:  parseFloat(supplyFactor.toFixed(4)),
    };
  }

  /**
   * Supply/demand ratio from current store state
   */
  _getMarketFactor() {
    try {
      const houses       = store.getAllHouses();
      const totalSurplus = houses.reduce((s, h) => s + Math.max(0, h.surplus || 0), 0);
      const totalDeficit = houses.reduce((s, h) => s + Math.max(0, -(h.surplus || 0)), 0);

      if (totalSurplus === 0 && totalDeficit === 0) return 1.0;
      if (totalSurplus === 0) return 2.0;   // extreme scarcity
      if (totalDeficit === 0) return 0.5;   // oversupply

      // Demand/supply ratio: higher demand = higher price
      const ratio = totalDeficit / totalSurplus;
      return Math.min(Math.max(ratio, 0.3), 3.0);
    } catch {
      return 1.0;
    }
  }

  /**
   * Time-of-day pricing multiplier
   */
  _getTimeFactor() {
    const hour = new Date().getHours();
    // Peak hours: 7-9 AM and 6-9 PM
    if ((hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 21)) return 1.5;
    // Solar peak: cheaper energy midday
    if (hour >= 10 && hour <= 15) return 0.75;
    // Night: slightly higher
    if (hour >= 22 || hour <= 5) return 1.2;
    return 1.0;
  }

  /**
   * Higher surplus = slightly cheaper (volume discount)
   */
  _getSupplyFactor(surplusWh) {
    if (surplusWh > 200) return 0.85;
    if (surplusWh > 100) return 0.92;
    if (surplusWh < 20)  return 1.15;  // scarcity premium
    return 1.0;
  }

  /**
   * Get current market summary
   */
  getMarketSummary() {
    try {
      const houses       = store.getAllHouses();
      const listings     = store.getActiveListings();
      const totalSurplus = houses.reduce((s, h) => s + Math.max(0, h.surplus || 0), 0);
      const totalDeficit = houses.reduce((s, h) => s + Math.max(0, -(h.surplus || 0)), 0);
      const avgPrice     = listings.length
        ? listings.reduce((s, l) => s + l.pricePerUnit, 0) / listings.length
        : this.BASE_PRICE_ETH;

      return {
        totalSurplus:    parseFloat(totalSurplus.toFixed(3)),
        totalDeficit:    parseFloat(totalDeficit.toFixed(3)),
        supplyDemandRatio: totalDeficit > 0 ? (totalSurplus / totalDeficit).toFixed(2) : "∞",
        avgPricePerUnit: parseFloat(avgPrice.toFixed(10)),
        marketFactor:    parseFloat(this._getMarketFactor().toFixed(4)),
        timeFactor:      parseFloat(this._getTimeFactor().toFixed(4)),
        timestamp:       Date.now(),
      };
    } catch (e) {
      return { error: e.message };
    }
  }
}

module.exports = new PricingEngine();
