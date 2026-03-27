# EnergyGrid Frontend

React + Vite frontend for the Decentralized Energy Trading Platform.

## Setup

```bash
cd frontend
npm install
```

## Development

```bash
npm run dev
```

Runs at http://localhost:5173. Requires the backend to be running on port 5000.

## Production (Vercel) env vars

Set these in Vercel → Project → Settings → Environment Variables:

- `VITE_API_BASE`: `https://<your-render-service>.onrender.com`
- `VITE_WS_BASE` (optional): `wss://<your-render-service>.onrender.com`

If `VITE_WS_BASE` is not set, the app derives the WebSocket URL from `VITE_API_BASE`.

## Build

```bash
npm run build
```

## Proxy

The Vite dev server proxies:
- `/api` → backend (http://localhost:5000)
- `/ws` → WebSocket (ws://localhost:5000)
- `/health` → backend health check

## Features

- **Dashboard** — Real-time household energy data (produced, consumed, surplus, wallet)
- **Marketplace** — Active energy listings (lowest price first)
- **Trades** — Transaction history
- **Execute Trade** — Manual P2P trade execution
- **Analytics** — Blockchain stats, performance, top earners, hourly trading

Data updates in real time via WebSocket.
