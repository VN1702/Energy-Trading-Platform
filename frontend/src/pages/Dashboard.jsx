import { useWebSocket } from "../hooks/useWebSocket";
import "./Dashboard.css";

export default function Dashboard() {
  const { houses, connected } = useWebSocket();

  const totalProduced = houses.reduce((s, h) => s + (h.energyProduced || 0), 0);
  const totalConsumed = houses.reduce((s, h) => s + (h.energyConsumed || 0), 0);
  const producers = houses.filter((h) => (h.surplus || 0) > 0);
  const consumers = houses.filter((h) => (h.surplus || 0) < 0);
  const netSurplus = totalProduced - totalConsumed;

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Real-time energy production and consumption across the grid</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Produced</span>
          <span className="stat-value green">{totalProduced.toFixed(2)} Wh</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Consumed</span>
          <span className="stat-value amber">{totalConsumed.toFixed(2)} Wh</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Net Surplus</span>
          <span className={`stat-value ${netSurplus >= 0 ? "green" : "red"}`}>
            {netSurplus >= 0 ? "+" : ""}
            {netSurplus.toFixed(2)} Wh
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Producers / Consumers</span>
          <span className="stat-value">
            {producers.length} / {consumers.length}
          </span>
        </div>
      </div>

      <section className="section">
        <h2>Households ({houses.length})</h2>
        <div className="houses-grid">
          {houses.map((house) => (
            <HouseCard key={house.id} house={house} />
          ))}
        </div>
      </section>
    </div>
  );
}

function HouseCard({ house }) {
  const surplus = house.surplus ?? 0;
  const isProducer = surplus > 0;
  const isConsumer = surplus < 0;

  return (
    <div className={`house-card ${isProducer ? "producer" : isConsumer ? "consumer" : "neutral"}`}>
      <div className="house-header">
        <span className="house-id">{house.id}</span>
        <span className={`house-badge ${isProducer ? "surplus" : "deficit"}`}>
          {isProducer ? "Surplus" : isConsumer ? "Deficit" : "Balanced"}
        </span>
      </div>
      <h3 className="house-name">{house.name || house.id}</h3>
      <div className="house-stats">
        <div className="house-stat">
          <span className="label">Produced</span>
          <span className="value mono">{parseFloat(house.energyProduced || 0).toFixed(2)} Wh</span>
        </div>
        <div className="house-stat">
          <span className="label">Consumed</span>
          <span className="value mono">{parseFloat(house.energyConsumed || 0).toFixed(2)} Wh</span>
        </div>
        <div className="house-stat highlight">
          <span className="label">Surplus</span>
          <span className={`value mono ${isProducer ? "green" : isConsumer ? "red" : ""}`}>
            {surplus >= 0 ? "+" : ""}
            {surplus.toFixed(2)} Wh
          </span>
        </div>
        <div className="house-stat">
          <span className="label">Wallet</span>
          <span className="value mono">{parseFloat(house.walletBalance || 0).toFixed(4)} ETH</span>
        </div>
      </div>
      {house.type && (
        <span className="house-type">{house.type.replace(/_/g, " ")}</span>
      )}
    </div>
  );
}
