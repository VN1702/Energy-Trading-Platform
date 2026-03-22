const express    = require("express");
const router     = express.Router();
const store      = require("../models/store");
const simulation = require("../services/simulationService");

/**
 * GET /api/energy/houses
 * Returns all house energy states
 */
router.get("/houses", (req, res) => {
  const houses = store.getAllHouses();
  res.json({ success: true, count: houses.length, data: houses });
});

/**
 * GET /api/energy/houses/:id
 * Returns a single house
 */
router.get("/houses/:id", (req, res) => {
  const house = store.getHouse(req.params.id);
  if (!house) return res.status(404).json({ success: false, message: "House not found" });
  res.json({ success: true, data: house });
});

/**
 * POST /api/energy/update
 * Manual energy data update (from external simulation source)
 */
router.post("/update", (req, res) => {
  const { houses } = req.body;
  if (!Array.isArray(houses)) {
    return res.status(400).json({ success: false, message: "Expected { houses: [...] }" });
  }

  const updated = [];
  for (const h of houses) {
    if (!h.id) continue;
    const existing = store.getHouse(h.id) || {};
    const merged = {
      ...existing,
      ...h,
      surplus: (h.energyProduced || 0) - (h.energyConsumed || 0),
    };
    store.upsertHouse(merged);
    updated.push(merged);
  }

  res.json({ success: true, updated: updated.length, data: updated });
});

/**
 * GET /api/energy/stats
 * Aggregate energy stats
 */
router.get("/stats", (req, res) => {
  const houses       = store.getAllHouses();
  const totalProduced = houses.reduce((s, h) => s + (h.energyProduced || 0), 0);
  const totalConsumed = houses.reduce((s, h) => s + (h.energyConsumed || 0), 0);
  const producers     = houses.filter(h => h.surplus > 0);
  const consumers     = houses.filter(h => h.surplus < 0);

  res.json({
    success: true,
    data: {
      totalProduced:  parseFloat(totalProduced.toFixed(3)),
      totalConsumed:  parseFloat(totalConsumed.toFixed(3)),
      netSurplus:     parseFloat((totalProduced - totalConsumed).toFixed(3)),
      producerCount:  producers.length,
      consumerCount:  consumers.length,
      houseCount:     houses.length,
    },
  });
});

module.exports = router;
