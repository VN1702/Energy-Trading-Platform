⚡ Decentralized Energy Trading Platform

A full-stack **hybrid (off-chain + blockchain)** application that simulates real-time energy production and consumption across multiple households, enabling **peer-to-peer energy trading** using smart contracts.



## 🚀 Overview

This project demonstrates how blockchain can be integrated with traditional backend systems to build a **scalable, efficient, and decentralized energy marketplace**.

* ⚙️ Off-chain: Simulation, matching engine, APIs
* ⛓️ On-chain: Secure trade settlement via smart contracts
* 🌐 Frontend: Interactive dashboard for monitoring and trading



## 🧩 Architecture

```
Frontend (Vite + React)
        ↓
Backend (Node.js + Express)
        ↓
Blockchain (Solidity + Hardhat + Sepolia)
```



## 🔥 Features

### ⚡ Simulation Engine

* Simulates **10–20 households**
* Updates energy data every few seconds
* Each house has:

  * `id`
  * `energyProduced`
  * `energyConsumed`
  * `surplus`
  * `wallet balance`
* Automatically:

  * Creates **sell listings** (surplus)
  * Creates **buy requests** (deficit)



### 🧠 Backend (Node.js + Express)
https://energy-trading-platform-0eo4.onrender.com
* REST APIs for:

  * Updating energy data
  * Fetching listings
  * Executing trades
  * Viewing transaction history
* **Matching Engine**

  * Matches buyers & sellers based on lowest price
* Stores:

  * Houses
  * Listings
  * Trades
* Uses **Ethers.js** to interact with blockchain



### ⛓️ Smart Contract (Solidity)

Handles:

* Creating listings
* Buying energy
* Secure fund transfer
* Marking trades complete

Includes:

* Input validation (`require`)
* Secure transaction handling



### 💻 Frontend (React + Vite)
https://energy-grid-platform.netlify.app/
* Real-time dashboard
* View:

  * Houses
  * Energy stats
  * Listings
  * Trades
* Execute trades with UI interaction
* Connected to backend APIs



## 🌐 Live Demo

👉 [https://energy-grid-platform.netlify.app/]


## 🛠️ Tech Stack

* **Frontend:** React, Vite
* **Backend:** Node.js, Express
* **Blockchain:** Solidity, Hardhat, Ethers.js
* **Network:** Sepolia Testnet
* **Deployment:** Netlify (Frontend), Render (Backend)



## ⚙️ Setup Instructions

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/energy-trading-platform.git
cd energy-trading-platform
```



### 2️⃣ Backend Setup(https://energy-trading-platform-0eo4.onrender.com)

```bash
cd backend
npm install
npm run dev
```



### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```



### 4️⃣ Blockchain Setup

```bash
cd blockchain
npm install
```

#### Configure `.env`

```
RPC_URL=your_sepolia_rpc_url
PRIVATE_KEY=your_wallet_private_key
```

#### Deploy Contract

```bash
npx hardhat run scripts/deploy.js --network sepolia
```


## 🔗 API Configuration (Frontend)

Set environment variable:

```
VITE_API_BASE=https://your-backend.onrender.com
```



## 📊 Key Concepts Used

* Hybrid Architecture (Off-chain + On-chain)
* Smart Contract Integration
* Matching Engine Design
* Real-time Simulation
* REST API Design



## ⚠️ Challenges Solved

* Efficient off-chain matching with on-chain settlement
* Handling real-time energy updates
* Integrating blockchain with traditional backend
* Deployment issues (Netlify + Render + Vite fixes)



## 🔮 Future Improvements

* Add authentication (wallet-based login)
* Store data in MongoDB
* Real-time charts & analytics
* Gas optimization for contracts
* Multi-chain support


## 👩‍💻 Author

**Varsha KN**



