// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TrackingRegistry
 * @notice A simple registry to log tracking events on-chain for the SkillWatch hackathon project.
 */
contract TrackingRegistry {
    // Event emitted when a user starts tracking a target wallet
    event TrackingStarted(
        address indexed owner,
        address indexed target,
        address[] trackedWallets,
        uint256 timestamp
    );

    /**
     * @notice Registers a new tracking session.
     * @param target The address being monitored.
     * @param trackedWallets The list of discovered addresses that will be tracked.
     */
    function registerTracking(address target, address[] calldata trackedWallets) external {
        emit TrackingStarted(msg.sender, target, trackedWallets, block.timestamp);
    }
}
