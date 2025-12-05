import { ethers } from "hardhat";

async function main() {
    console.log("Deploying TrackingRegistry...");

    const trackingRegistry = await ethers.deployContract("TrackingRegistry");

    await trackingRegistry.waitForDeployment();

    console.log(
        `TrackingRegistry deployed to ${trackingRegistry.target}`
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
