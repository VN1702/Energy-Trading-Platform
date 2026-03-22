require("dotenv").config();

const express     = require("express");
const cors        = require("cors");
const helmet      = require("helmet");
const morgan      = require("morgan");
const http        = require("http");
const WebSocket   = require("ws");
const rateLimit   = require("express-rate-limit");

// Services
const blockchain  = require("./services/blockchainService");
const simulation  = require("./services/simulationService");
const matching    = require("./services/matchingEngine");
const store       = require("./models/store");

// Routes
const energyRoutes    = require("./routes/energy");
const listingRoutes   = require("./routes/listings");
const tradeRoutes     = require("./routes/trades");
const analyticsRoutes = require("./routes/analytics");

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));
app.use(morgan("dev"));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 300 }));

// ── REST Routes ──────────────────────────────────────────────────────
app.use("/api/energy",    energyRoutes);
app.use("/api/listings",  listingRoutes);
app.use("/api/trades",    tradeRoutes);
app.use("/api/analytics", analyticsRoutes);

// Health check
app.get("/health", (req, res) =>
  res.json({
    status:     "ok",
    uptime:     process.uptime(),
    blockchain: blockchain.isReady,
    timestamp:  new Date().toISOString(),
  })
);

// ── WebSocket Server ─────────────────────────────────────────────────
const wss = new WebSocket.Server({ server, path: "/ws" });

function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload, timestamp: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

wss.on("connection", (ws) => {
  console.log("🔌 WebSocket client connected");

  // Send initial state
  ws.send(JSON.stringify({
    type: "INIT",
    payload: {
      houses:   store.getAllHouses(),
      listings: store.getActiveListings(),
      trades:   store.getRecentTrades(20),
    },
  }));

  ws.on("close", () => console.log("🔌 WebSocket client disconnected"));
});

// Broadcast energy updates every 3s
setInterval(() => {
  broadcast("ENERGY_UPDATE", { houses: store.getAllHouses() });
}, 3000);

// Broadcast listings every 5s
setInterval(() => {
  broadcast("LISTINGS_UPDATE", { listings: store.getActiveListings() });
}, 5000);

// Broadcast trades every 5s
setInterval(() => {
  broadcast("TRADES_UPDATE", { trades: store.getRecentTrades(20) });
}, 5000);

// ── Bootstrap ────────────────────────────────────────────────────────
async function bootstrap() {
  console.log("\n🚀 Energy Trading Platform — Backend Starting\n");

  // 1. Init blockchain
  await blockchain.init();

  // 2. Init simulation
  await simulation.init(parseInt(process.env.MAX_HOUSES) || 20);

  // 3. Start simulation loop
  simulation.start(parseInt(process.env.SIMULATION_INTERVAL_MS) || 3000);

  // 4. Start matching engine
  matching.start(5000);

  // 5. Listen
  server.listen(PORT, () => {
    console.log(`\n✅ API Server:     http://localhost:${PORT}`);
    console.log(`✅ WebSocket:      ws://localhost:${PORT}/ws`);
    console.log(`✅ Health Check:   http://localhost:${PORT}/health\n`);
  });
}

bootstrap().catch(err => {
  console.error("❌ Fatal startup error:", err);
  process.exit(1);
});

module.exports = { app, broadcast };
