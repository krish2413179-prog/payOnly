const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying FlexPass Contract to Sepolia...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  // Get account balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  // USDC Contract Address on Sepolia
  const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  console.log("💵 USDC Address:", SEPOLIA_USDC);
  
  // Deploy FlexPass contract
  const FlexPass = await ethers.getContractFactory("FlexPass");
  console.log("⏳ Deploying contract...");
  
  const flexPass = await FlexPass.deploy(SEPOLIA_USDC);
  await flexPass.waitForDeployment();
  
  const contractAddress = await flexPass.getAddress();
  console.log("✅ FlexPass deployed to:", contractAddress);
  
  // Wait for a few confirmations
  console.log("⏳ Waiting for confirmations...");
  await flexPass.deploymentTransaction().wait(2);
  
  console.log("\n🎉 Deployment Complete!");
  console.log("📄 Contract Details:");
  console.log("   Address:", contractAddress);
  console.log("   Owner:", deployer.address);
  console.log("   USDC Token:", SEPOLIA_USDC);
  console.log("   Network: Sepolia Testnet");
  
  console.log("\n📝 Update your .env file with:");
  console.log(`NEXT_PUBLIC_FLEXPASS_CONTRACT_ADDRESS=${contractAddress}`);
  
  console.log("\n🔍 Verify on Etherscan:");
  console.log(`npx hardhat verify --network sepolia ${contractAddress} "${SEPOLIA_USDC}"`);
  
  return {
    contractAddress,
    usdcAddress: SEPOLIA_USDC,
    deployerAddress: deployer.address,
    network: "sepolia"
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });