import { expect } from "chai";
import { ethers } from "hardhat";
import { TrackingRegistry } from "../typechain-types";

describe("TrackingRegistry", function () {
    let trackingRegistry: TrackingRegistry;
    let owner: any;
    let otherAccount: any;

    beforeEach(async function () {
        [owner, otherAccount] = await ethers.getSigners();
        const TrackingRegistryFactory = await ethers.getContractFactory("TrackingRegistry");
        trackingRegistry = (await TrackingRegistryFactory.deploy()) as TrackingRegistry;
    });

    it("Should emit TrackingStarted event on registration", async function () {
        const target = "0x1234567890123456789012345678901234567890";
        const tracked = [
            "0x1111111111111111111111111111111111111111",
            "0x2222222222222222222222222222222222222222"
        ];

        await expect(trackingRegistry.registerTracking(target, tracked))
            .to.emit(trackingRegistry, "TrackingStarted")
            .withArgs(owner.address, target, tracked, await ethers.provider.getBlock("latest").then(b => b?.timestamp));
    });
});
