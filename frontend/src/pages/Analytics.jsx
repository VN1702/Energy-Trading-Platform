import { useState, useEffect } from "react";
import { api } from "../api/client";
import "./Analytics.css";

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.analytics
      .get()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="analytics-loading">Loading analytics…</div>;
  if (error) return <div className="analytics-error">Error: {error}</div>;
  if (!data) return null;

  const { chainStats, topEarners, latency, gas, hourlyTrading, recentTrades } = data;

  return (
    <div className="analytics">
      <div className="page-header">
        <h1>Analytics</h1>
        <p>Platform performance, blockchain stats, and trading insights</p>
      </div>

      <div className="analytics-grid">
        <section className="analytics-section">
          <h2>Blockchain Stats</h2>
          <div className="stats-cards">
            {chainStats ? (
              <>
                <div className="stat-card">
                  <span className="stat-label">Total Trades (on-chain)</span>
                  <span className="stat-value">{chainStats.tradeCount ?? "—"}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Energy Traded</span>
                  <span className="stat-value green">
                    {chainStats.totalEnergyTraded ? Number(chainStats.totalEnergyTraded).toLocaleString() : "—"} Wh
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Volume (ETH)</span>
                  <span className="stat-value">{chainStats.totalVolumeEth ?? "—"}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Active Listings</span>
                  <span className="stat-value">{chainStats.activeCount ?? "—"}</span>
                </div>
              </>
            ) : (
              <div className="stat-card wide">
                <span className="stat-label">Blockchain</span>
                <span className="stat-value muted">Mock mode — no chain connected</span>
              </div>
            )}
          </div>
        </section>

        <section className="analytics-section">
          <h2>Performance</h2>
          <div className="stats-cards">
            <div className="stat-card">
              <span className="stat-label">Avg Latency</span>
              <span className="stat-value">{latency?.avg ?? "—"} ms</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Max Latency</span>
              <span className="stat-value">{latency?.max ?? "—"} ms</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Gas Fees</span>
              <span className="stat-value">{gas?.totalFees ?? "—"} ETH</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Avg Gas/Trade</span>
              <span className="stat-value">{gas?.avgPerTrade ?? "—"} ETH</span>
            </div>
          </div>
        </section>

        {topEarners && topEarners.length > 0 && (
          <section className="analytics-section">
            <h2>Top Earners</h2>
            <div className="earners-list">
              {topEarners.map((h, i) => (
                <div key={h.id} className="earner-row">
                  <span className="rank">{i + 1}</span>
                  <span className="name">{h.name || h.id}</span>
                  <span className="earned mono">{parseFloat(h.earned || 0).toFixed(4)} ETH</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {hourlyTrading && Object.keys(hourlyTrading).length > 0 && (
          <section className="analytics-section wide">
            <h2>Trading by Hour</h2>
            <div className="hourly-chart">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="hour-bar-wrap">
                  <div
                    className="hour-bar"
                    style={{
                      height: `${Math.min(100, ((hourlyTrading[h] || 0) / (Math.max(...Object.values(hourlyTrading), 1) || 1)) * 100)}%`,
                    }}
                  />
                  <span className="hour-label">{h}h</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {recentTrades && recentTrades.length > 0 && (
          <section className="analytics-section wide">
            <h2>Recent Trades</h2>
            <div className="recent-trades">
              {recentTrades.slice(0, 10).map((t) => (
                <div key={t.id} className="recent-trade">
                  <span className="mono">{t.sellerId} → {t.buyerId}</span>
                  <span className="mono">{parseFloat(t.energyAmount).toFixed(0)} Wh</span>
                  <span className="mono">{parseFloat(t.totalPaidEth).toFixed(6)} ETH</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
