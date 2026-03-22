const { ethers } = require("ethers");
const path       = require("path");
const fs         = require("fs");

/**
 * Blockchain service — wraps Ethers.js for all on-chain operations.
 * Uses an array of signers (one per house) to simulate independent wallets.
 */
class BlockchainService {
  constructor() {
    this.provider   = null;
    this.contract   = null;
    this.signers    = [];       // house wallet signers
    this.owner      = null;
    this.config     = null;
    this.isReady    = false;
  }

  async init() {
    try {
      const configPath = path.join(__dirname, "../config/contract.json");

      if (!fs.existsSync(configPath)) {
        console.warn("⚠️  contract.json not found — blockchain disabled (mock mode)");
        this.isReady = false;
        return;
      }

      this.config   = JSON.parse(fs.readFileSync(configPath, "utf8"));
      this.provider = new ethers.JsonRpcProvider(
        process.env.RPC_URL || "http://127.0.0.1:8545"
      );

      // Verify connection
      const network = await this.provider.getNetwork();
      console.log(`🔗 Connected to chain ID: ${network.chainId}`);

      // Load signers from hardhat local node
      // In production, use private keys from env
      const hardhatAccounts = await this._getHardhatAccounts();
      this.owner   = hardhatAccounts[0];
      this.signers = hardhatAccounts.slice(1, 21); // 20 house wallets

      // Bind contract
      this.contract = new ethers.Contract(
        this.config.contractAddress,
        this.config.abi,
        this.owner
      );

      console.log(`✅ Contract at: ${this.config.contractAddress}`);
      this.isReady = true;
    } catch (err) {
      console.error("❌ Blockchain init failed:", err.message);
      this.isReady = false;
    }
  }

  // ── CONTRACT CALLS ──────────────────────────────────────────────────

  async createListing(houseIndex, energyWh, priceWei, sellerId) {
    if (!this.isReady) return this._mockTx("createListing");

    const signer    = this.signers[houseIndex % this.signers.length];
    const connected = this.contract.connect(signer);

    const startTime = Date.now();
    const tx        = await connected.createListing(
      BigInt(Math.round(energyWh)),
      BigInt(priceWei),
      sellerId
    );
    const receipt = await tx.wait();

    return {
      txHash:       tx.hash,
      blockNumber:  receipt.blockNumber,
      gasUsed:      receipt.gasUsed.toString(),
      gasFeeEth:    ethers.formatEther(receipt.gasUsed * tx.gasPrice),
      latencyMs:    Date.now() - startTime,
      success:      true,
    };
  }

  async buyEnergy(buyerIndex, listingId, totalPriceWei, buyerId) {
    if (!this.isReady) return this._mockTx("buyEnergy");

    const signer    = this.signers[buyerIndex % this.signers.length];
    const connected = this.contract.connect(signer);

    const startTime = Date.now();
    const tx        = await connected.buyEnergy(BigInt(listingId), buyerId, {
      value: BigInt(totalPriceWei),
    });
    const receipt = await tx.wait();

    return {
      txHash:             tx.hash,
      blockNumber:        receipt.blockNumber,
      gasUsed:            receipt.gasUsed.toString(),
      gasFeeEth:          ethers.formatEther(receipt.gasUsed * tx.gasPrice),
      confirmationTimeMs: Date.now() - startTime,
      success:            true,
    };
  }

  async cancelListing(houseIndex, listingId) {
    if (!this.isReady) return this._mockTx("cancelListing");

    const signer    = this.signers[houseIndex % this.signers.length];
    const connected = this.contract.connect(signer);

    const tx      = await connected.cancelListing(BigInt(listingId));
    const receipt = await tx.wait();

    return { txHash: tx.hash, blockNumber: receipt.blockNumber, success: true };
  }

  async getContractStats() {
    if (!this.isReady) return null;
    const stats = await this.contract.getStats();
    return {
      listingCount:      stats[0].toString(),
      tradeCount:        stats[1].toString(),
      totalEnergyTraded: stats[2].toString(),
      totalVolumeEth:    ethers.formatEther(stats[3]),
      activeCount:       stats[4].toString(),
    };
  }

  async getWalletBalance(houseIndex) {
    if (!this.isReady) return "0.0";
    const signer  = this.signers[houseIndex % this.signers.length];
    const balance = await this.provider.getBalance(await signer.getAddress());
    return ethers.formatEther(balance);
  }

  getHouseAddress(houseIndex) {
    if (!this.isReady || !this.signers[houseIndex]) return null;
    // return cached address (synchronous)
    return this.config?.houseWallets?.[houseIndex]?.address || null;
  }

  // ── PRIVATE ─────────────────────────────────────────────────────────

  async _getHardhatAccounts() {
    // Uses default hardhat test accounts with deterministic private keys
    const HARDHAT_PRIVATE_KEYS = [
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
      "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926b",
      "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
      "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
      "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
      "0xdbda1821b80551c9d65939329250132c0f85dc27a652a33db3e92c3d84f57c25",
      "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
      "0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897",
      "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82",
      "0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b2",
      "0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd",
      "0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa",
      "0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61",
      "0xea6c44ac03bff858b476bba28179e80bf0617bca3cf11b3fd6e6e258cb9acf10",
      "0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd",
      "0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0",
      "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e",
      "0xeaa861a9a01391a3b6a436669716ad9950d5acc7fc54eff0f2c28bff3d9e3023",
    ];
    return HARDHAT_PRIVATE_KEYS.map(pk => new ethers.Wallet(pk, this.provider));
  }

  _mockTx(method) {
    return {
      txHash:             `0xMOCK_${method}_${Date.now()}`,
      blockNumber:        Math.floor(Math.random() * 1000),
      gasUsed:            "21000",
      gasFeeEth:          "0.000021",
      confirmationTimeMs: Math.floor(Math.random() * 200) + 50,
      success:            true,
      mock:               true,
    };
  }
}

module.exports = new BlockchainService();
