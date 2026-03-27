import { useWebSocket } from "../hooks/useWebSocket";
import "./Marketplace.css";

export default function Marketplace() {
  const { listings } = useWebSocket();
  const active = listings.filter((l) => l.status === "active");

  return (
    <div className="marketplace">
      <div className="page-header">
        <h1>Marketplace</h1>
        <p>Active energy listings — lowest price first. Updated in real time.</p>
      </div>

      {active.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📦</span>
          <p>No active listings right now.</p>
          <p className="empty-hint">Listings appear automatically when houses have surplus energy.</p>
        </div>
      ) : (
        <div className="listings-grid">
          {active.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListingCard({ listing }) {
  const priceEth = parseFloat(listing.totalPriceEth || listing.totalPrice || 0);
  const energyWh = parseFloat(listing.energyAmount || 0);
  const pricePerUnit = parseFloat(listing.pricePerUnit || 0);

  return (
    <div className="listing-card">
      <div className="listing-header">
        <span className="listing-seller">{listing.sellerId}</span>
        <span className="listing-status active">Active</span>
      </div>
      <div className="listing-energy">
        <span className="energy-value">{energyWh.toFixed(2)}</span>
        <span className="energy-unit">Wh</span>
      </div>
      <div className="listing-price">
        <span className="price-value">{priceEth.toFixed(6)}</span>
        <span className="price-unit">ETH</span>
      </div>
      <div className="listing-meta">
        <span>{pricePerUnit.toFixed(8)} ETH/Wh</span>
        {listing.txHash && (
          <span className="tx-hash" title={listing.txHash}>
            ✓ On-chain
          </span>
        )}
      </div>
    </div>
  );
}
