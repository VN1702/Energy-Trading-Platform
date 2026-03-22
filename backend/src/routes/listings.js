const express   = require("express");
const router    = express.Router();
const store     = require("../models/store");
const blockchain = require("../services/blockchainService");
const pricingEngine = require("../../../simulation/pricingEngine");
const { v4: uuid } = require("uuid");
const { ethers }  = require("ethers");

/**
 * GET /api/listings
 * Returns all active listings, sorted by price ASC
 */
router.get("/", (req, res) => {
  const listings = store.getActiveListings();
  res.json({ success: true, count: listings.length, data: listings });
});

/**
 * GET /api/listings/all
 * Returns all listings (any status)
 */
router.get("/all", (req, res) => {
  const { status, limit = 100 } = req.query;
  let listings = store.getAllListings();
  if (status) listings = listings.filter(l => l.status === status);
  listings = listings.slice(0, parseInt(limit));
  res.json({ success: true, count: listings.length, data: listings });
});

/**
 * GET /api/listings/:id
 */
router.get("/:id", (req, res) => {
  const listing = store.getListing(req.params.id);
  if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });
  res.json({ success: true, data: listing });
});

/**
 * POST /api/listings
 * Manually create a listing
 */
router.post("/", async (req, res) => {
  try {
    const { sellerId, energyAmount, pricePerUnit } = req.body;

    if (!sellerId || !energyAmount || !pricePerUnit) {
      return res.status(400).json({
        success: false,
        message: "Required: sellerId, energyAmount, pricePerUnit",
      });
    }

    const energy    = parseFloat(energyAmount);
    const price     = parseFloat(pricePerUnit);
    const total     = parseFloat((energy * price).toFixed(8));
    const houseIdx  = parseInt(sellerId.split("_")[1] || "1") - 1;

    const listing = {
      id:            uuid(),
      chainListingId: null,
      sellerId,
      energyAmount:  energy,
      pricePerUnit:  price,
      totalPriceEth: total,
      status:        "active",
      createdAt:     Date.now(),
    };

    store.addListing(listing);

    // Async chain settlement
    blockchain.createListing(
      houseIdx,
      energy,
      ethers.parseEther(price.toFixed(18)).toString(),
      sellerId
    ).then(result => {
      store.updateListing(listing.id, {
        txHash: result.txHash,
        gasFeeEth: result.gasFeeEth,
      });
    }).catch(console.warn);

    res.status(201).json({ success: true, data: listing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/listings/:id
 * Cancel a listing
 */
router.delete("/:id", async (req, res) => {
  const listing = store.getListing(req.params.id);
  if (!listing) return res.status(404).json({ success: false, message: "Not found" });
  if (listing.status !== "active") {
    return res.status(400).json({ success: false, message: "Listing not active" });
  }

  store.updateListing(req.params.id, { status: "cancelled", cancelledAt: Date.now() });
  res.json({ success: true, message: "Listing cancelled" });
});

/**
 * GET /api/listings/price/suggest
 * Suggested price based on current market
 */
router.get("/price/suggest", (req, res) => {
  const { surplus } = req.query;
  const price = pricingEngine.calculatePrice(parseFloat(surplus) || 50);
  res.json({ success: true, data: price });
});

module.exports = router;
