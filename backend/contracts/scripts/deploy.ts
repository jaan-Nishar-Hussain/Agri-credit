import { ethers } from "hardhat";

async function main() {
    console.log("Deploying AgriDataRegistry to Sepolia...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

    if (balance === 0n) {
        console.error("❌ Error: Account has no ETH. Get Sepolia ETH from:");
        console.error("   - https://sepoliafaucet.com/");
        console.error("   - https://www.alchemy.com/faucets/ethereum-sepolia");
        process.exit(1);
    }

    // Deploy the contract
    console.log("Deploying AgriDataRegistry...");
    const AgriDataRegistry = await ethers.getContractFactory("AgriDataRegistry");
    const contract = await AgriDataRegistry.deploy();

    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("\n✅ AgriDataRegistry deployed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Contract Address:", contractAddress);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\nNext steps:");
    console.log("1. Update CONTRACT_ADDRESS in your .env file:");
    console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
    console.log("\n2. Verify the contract on Etherscan:");
    console.log(`   npx hardhat verify --network sepolia ${contractAddress}`);
    console.log("\n3. View on Etherscan:");
    console.log(`   https://sepolia.etherscan.io/address/${contractAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
