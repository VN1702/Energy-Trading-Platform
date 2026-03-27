import { Routes, Route, NavLink } from "react-router-dom";
import { useWebSocket } from "./hooks/useWebSocket";
import Dashboard from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";
import Trades from "./pages/Trades";
import Analytics from "./pages/Analytics";
import ExecuteTrade from "./pages/ExecuteTrade";
import "./App.css";

function Layout({ children }) {
  const { connected } = useWebSocket();

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <NavLink to="/" className="logo">
            <span className="logo-icon">⚡</span>
            <span>EnergyGrid</span>
          </NavLink>
          <nav className="nav">
            <NavLink to="/" end>Dashboard</NavLink>
            <NavLink to="/marketplace">Marketplace</NavLink>
            <NavLink to="/trades">Trades</NavLink>
            <NavLink to="/execute">Execute Trade</NavLink>
            <NavLink to="/analytics">Analytics</NavLink>
          </nav>
          <div className={`status-dot ${connected ? "online" : "offline"}`} title={connected ? "Live" : "Disconnected"} />
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/trades" element={<Trades />} />
        <Route path="/execute" element={<ExecuteTrade />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Layout>
  );
}
