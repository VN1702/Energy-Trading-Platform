import { useWebSocket } from "../hooks/useWebSocket";
import "./Trades.css";

export default function Trades() {
  const { trades } = useWebSocket();

  return (
    <div className="trades-page">
      <div className="page-header">
        <h1>Transaction History</h1>
        <p>Recent P2P energy trades settled on-chain</p>
      </div>

      {trades.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📜</span>
          <p>No trades yet.</p>
          <p className="empty-hint">Trades execute automatically when buyers are matched with listings.</p>
        </div>
      ) : (
        <div className="trades-table-wrap">
          <table className="trades-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Seller</th>
                <th>Buyer</th>
                <th>Energy</th>
                <th>Total Paid</th>
                <th>Gas</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <TradeRow key={trade.id} trade={trade} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TradeRow({ trade }) {
  const time = new Date(trade.timestamp).toLocaleTimeString();
  const energy = parseFloat(trade.energyAmount || 0).toFixed(2);
  const paid = parseFloat(trade.totalPaidEth || 0).toFixed(6);
  const gas = trade.gasFeeEth ? parseFloat(trade.gasFeeEth).toFixed(6) : "—";

  return (
    <tr>
      <td className="mono">{time}</td>
      <td className="mono">{trade.sellerId}</td>
      <td className="mono">{trade.buyerId}</td>
      <td className="mono">{energy} Wh</td>
      <td className="mono">{paid} ETH</td>
      <td className="mono">{gas}</td>
      <td>
        {trade.txHash ? (
          <span className="tx-badge" title={trade.txHash}>
            {trade.txHash.startsWith("0xMOCK") ? "Mock" : "✓"}
          </span>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}
