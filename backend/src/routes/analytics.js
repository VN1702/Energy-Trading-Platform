const express    = require("express");
const router     = express.Router();
const store      = require("../models/store");
const blockchain = require("../services/blockchainService");

/**
 * GET /api/analytics
 * Full analytics dashboard data
 */
router.get("/", async (req, res) => {
  try {
    const analytics     = store.getAnalytics();
    const chainStats    = await blockchain.getContractStats();
    const trades        = store.getAllTrades();
    const houses        = store.getAllHouses();

    // Top earners/spenders
    const topEarners = [...houses]
      .sort((a, b) => (b.totalEarned || 0) - (a.totalEarned || 0))
      .slice(0, 5)
      .map(h => ({ id: h.id, name: h.name, earned: h.totalEarned || 0 }));

    // Latency stats
    const latencies = trades
      .filter(t => t.confirmationTimeMs)
      .map(t => t.confirmationTimeMs);
    const avgLatency = latencies.length
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
    const maxLatency = latencies.length ? Math.max(...latencies) : 0;

    // Gas stats
    const totalGas = trades
      .filter(t => t.gasFeeEth)
      .reduce((s, t) => s + parseFloat(t.gasFeeEth), 0);

    // Energy by hour
    const hourlyMap = {};
    trades.forEach(t => {
      const hr = new Date(t.timestamp).getHours();
      hourlyMap[hr] = (hourlyMap[hr] || 0) + (t.energyAmount || 0);
    });

    res.json({
      success: true,
      data: {
        ...analytics,
        chainStats,
        topEarners,
        latency: {
          avg:  parseFloat(avgLatency.toFixed(2)),
          max:  maxLatency,
          unit: "ms",
        },
        gas: {
          totalFees:    parseFloat(totalGas.toFixed(8)),
          avgPerTrade:  trades.length
            ? parseFloat((totalGas / trades.length).toFixed(8))
            : 0,
          currency: "ETH",
        },
        hourlyTrading: hourlyMap,
        recentTrades: store.getRecentTrades(10),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/analytics/performance
 * API + blockchain performance metrics
 */
router.get("/performance", (req, res) => {
  const trades = store.getAllTrades();

  const times = trades.filter(t => t.confirmationTimeMs).map(t => t.confirmationTimeMs);
  const sorted = [...times].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;

  res.json({
    success: true,
    data: {
      totalTrades:      trades.length,
      blockchainLatency: { p50, p95, unit: "ms" },
      gasFees: {
        total: trades.reduce((s, t) => s + parseFloat(t.gasFeeEth || 0), 0).toFixed(8),
        avg:   trades.length
          ? (trades.reduce((s, t) => s + parseFloat(t.gasFeeEth || 0), 0) / trades.length).toFixed(8)
          : "0",
      },
      mockMode: !require("../services/blockchainService").isReady,
    },
  });
});

module.exports = router;
