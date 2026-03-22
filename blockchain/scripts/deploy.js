const { ethers } = require("hardhat");
const fs          = require("fs");
const path        = require("path");

async function main() {
  console.log("🚀 Deploying EnergyTrading contract...\n");

  const [deployer, ...accounts] = await ethers.getSigners();
  console.log(`📦 Deployer: ${deployer.address}`);
  console.log(`💰 Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // ── Deploy ──────────────────────────────────
  const Factory = await ethers.getContractFactory("EnergyTrading");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`✅ EnergyTrading deployed at: ${contractAddress}`);

  // ── Export config ────────────────────────────
  const artifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/EnergyTrading.sol/EnergyTrading.json"),
      "utf8"
    )
  );

  // Write to backend
  const backendConfig = {
    contractAddress,
    abi: artifact.abi,
    network: "localhost",
    deployedAt: new Date().toISOString(),
    deployerAddress: deployer.address,
    // Export first 20 accounts as house wallets
    houseWallets: accounts.slice(0, 20).map((a, i) => ({
      houseId: `house_${String(i + 1).padStart(2, "0")}`,
      address: a.address,
    })),
  };

  const backendPath = path.join(__dirname, "../../backend/src/config/contract.json");
  fs.mkdirSync(path.dirname(backendPath), { recursive: true });
  fs.writeFileSync(backendPath, JSON.stringify(backendConfig, null, 2));
  console.log(`\n📝 Config written → backend/src/config/contract.json`);

  // Write to frontend
  const frontendPath = path.join(__dirname, "../../frontend/src/config/contract.json");
  fs.mkdirSync(path.dirname(frontendPath), { recursive: true });
  fs.writeFileSync(
    frontendPath,
    JSON.stringify({ contractAddress, abi: artifact.abi, network: "localhost" }, null, 2)
  );
  console.log(`📝 Config written → frontend/src/config/contract.json`);

  // ── Print house wallets ──────────────────────
  console.log("\n🏠 House Wallets:");
  accounts.slice(0, 20).forEach((a, i) => {
    console.log(`  house_${String(i + 1).padStart(2, "0")}: ${a.address}`);
  });

  console.log("\n✨ Deployment complete!\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
