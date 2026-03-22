const express        = require("express");
const router         = express.Router();
const store          = require("../models/store");
const matchingEngine = require("../services/matchingEngine");

/**
 * GET /api/trades
 * Returns recent trades
 */
router.get("/", (req, res) => {
  const { limit = 50 } = req.query;
  const trades = store.getRecentTrades(parseInt(limit));
  res.json({ success: true, count: trades.length, data: trades });
});

/**
 * GET /api/trades/:id
 */
router.get("/:id", (req, res) => {
  const trade = store.getTrade(req.params.id);
  if (!trade) return res.status(404).json({ success: false, message: "Trade not found" });
  res.json({ success: true, data: trade });
});

/**
 * POST /api/trades/execute
 * Manually execute a trade (from frontend)
 */
router.post("/execute", async (req, res) => {
  try {
    const { listingId, buyerHouseId } = req.body;

    if (!listingId || !buyerHouseId) {
      return res.status(400).json({
        success: false,
        message: "Required: listingId, buyerHouseId",
      });
    }

    const startTime = Date.now();
    const trade     = await matchingEngine.executeManualTrade(listingId, buyerHouseId);

    if (!trade) {
      return res.status(400).json({ success: false, message: "Trade failed" });
    }

    res.json({
      success: true,
      data: trade,
      apiResponseTimeMs: Date.now() - startTime,
    });
  } catch (err) {
    const code = err.message.includes("not found") ? 404 :
                 err.message.includes("not active") ? 409 : 500;
    res.status(code).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/trades/house/:houseId
 * Trades for a specific house
 */
router.get("/house/:houseId", (req, res) => {
  const { houseId } = req.params;
  const trades = store.getAllTrades().filter(
    t => t.sellerId === houseId || t.buyerId === houseId
  );
  res.json({ success: true, count: trades.length, data: trades });
});

module.exports = router;
