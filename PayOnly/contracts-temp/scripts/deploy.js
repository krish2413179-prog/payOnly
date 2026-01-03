import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  console.log("🚀 Deploying FlexPass Contract to Base Sepolia...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  // Get account balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  // fUSDC Contract Address on Base Sepolia (18 decimals)
  const BASE_SEPOLIA_USDC = "0x6B0dacea6a72E759243c99Eaed840DEe9564C194";
  console.log("💵 fUSDC Address (18 decimals):", BASE_SEPOLIA_USDC);
  
  // Deploy FlexPass contract
  const FlexPass = await ethers.getContractFactory("FlexPass");
  console.log("⏳ Deploying contract...");
  
  const flexPass = await FlexPass.deploy(BASE_SEPOLIA_USDC);
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
  console.log("   fUSDC Token:", BASE_SEPOLIA_USDC);
  console.log("   Network: Base Sepolia Testnet");
  
  console.log("\n📝 Update your .env file with:");
  console.log(`NEXT_PUBLIC_FLEXPASS_CONTRACT_ADDRESS=${contractAddress}`);
  
  console.log("\n🔍 Verify on BaseScan:");
  console.log(`npx hardhat verify --network baseSepolia ${contractAddress} "${BASE_SEPOLIA_USDC}"`);
  
  return {
    contractAddress,
    usdcAddress: BASE_SEPOLIA_USDC,
    deployerAddress: deployer.address,
    network: "base-sepolia"
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });