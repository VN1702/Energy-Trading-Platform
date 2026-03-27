import { useMemo, useState, useEffect } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { api } from "../api/client";
import "./ExecuteTrade.css";

export default function ExecuteTrade() {
  const { houses: wsHouses, listings: wsListings, connected } = useWebSocket();
  const [fallbackListings, setFallbackListings] = useState([]);
  const [listingId, setListingId] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // REST fallback: if WS is slow/unstable, still allow selecting a listing
  useEffect(() => {
    let cancelled = false;
    api.listings
      .getAll()
      .then((res) => {
        if (cancelled) return;
        setFallbackListings(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setFallbackListings([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const houses = wsHouses;
  const listings = useMemo(() => {
    const ws = Array.isArray(wsListings) ? wsListings : [];
    if (ws.length > 0) return ws;
    return Array.isArray(fallbackListings) ? fallbackListings : [];
  }, [wsListings, fallbackListings]);

  const activeListings = useMemo(
    () => listings.filter((l) => l && l.status === "active"),
    [listings]
  );
  const buyers = useMemo(
    () => houses.filter((h) => (h.surplus || 0) < 0 && (h.walletBalance || 0) > 0.001),
    [houses]
  );

  const handleExecute = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!listingId || !buyerId) {
      setError("Select both a listing and a buyer.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.trades.execute(listingId, buyerId);
      setMessage(`Trade executed! Energy: ${res.data.energyAmount} Wh, Total: ${res.data.totalPaidEth} ETH`);
      setListingId("");
      setBuyerId("");
    } catch (err) {
      setError(err.message || "Trade failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="execute-trade">
      <div className="page-header">
        <h1>Execute Trade</h1>
        <p>
          Manually execute a P2P energy trade by selecting a listing and buyer
          {!connected ? " (reconnecting…)" : ""}
        </p>
      </div>

      <form className="execute-form" onSubmit={handleExecute}>
        <div className="form-group">
          <label>Listing</label>
          <select
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            disabled={activeListings.length === 0}
          >
            <option value="">— Select listing —</option>
            {activeListings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.sellerId} — {Number(l.energyAmount || 0).toFixed(2)} Wh @ {Number(l.totalPriceEth || 0).toFixed(6)} ETH
              </option>
            ))}
          </select>
          {activeListings.length === 0 && (
            <div className="inline-hint">
              No active listings available yet. Wait a few seconds (listings update every ~5s) or check the Marketplace.
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Buyer (house with deficit)</label>
          <select
            value={buyerId}
            onChange={(e) => setBuyerId(e.target.value)}
            disabled={buyers.length === 0}
          >
            <option value="">— Select buyer —</option>
            {buyers.map((h) => (
              <option key={h.id} value={h.id}>
                {h.id} — Deficit: {parseFloat(h.surplus || 0).toFixed(2)} Wh, Balance: {parseFloat(h.walletBalance || 0).toFixed(4)} ETH
              </option>
            ))}
          </select>
        </div>

        {message && <div className="message success">{message}</div>}
        {error && <div className="message error">{error}</div>}

        <button type="submit" disabled={loading || !listingId || !buyerId}>
          {loading ? "Executing…" : "Execute Trade"}
        </button>
      </form>

      <div className="help-section">
        <h3>How it works</h3>
        <p>
          The matching engine automatically pairs buyers (houses with energy deficit) with sellers (lowest price listings)
          every few seconds. Use this form to trigger a trade manually for testing or specific scenarios.
        </p>
      </div>
    </div>
  );
}
