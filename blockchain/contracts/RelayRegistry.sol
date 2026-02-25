// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Decentralized registry for storing and retrieving active relay node URLs
 */
contract RelayRegistry {
    struct RelayNode {
        string url;
        address owner;
        bool isActive;
    }

    RelayNode[] public relays;
    mapping(address => bool) public hasRegistered;

    event NewRelayRegistered(string url, address indexed owner);

    /**
     * Register a new relay node URL to the blockchain
     * @param _url string - The endpoint URL of the new relay server
     * returns void
     */
    function registerRelay(string memory _url) public {
        require(
            !hasRegistered[msg.sender],
            "Address already registered a relay"
        );

        relays.push(RelayNode(_url, msg.sender, true));
        hasRegistered[msg.sender] = true;

        emit NewRelayRegistered(_url, msg.sender);
    }

    /**
     * Retrieve all registered relay nodes
     * returns RelayNode[] - Array of all registered relay nodes
     */
    function getAllRelays() public view returns (RelayNode[] memory) {
        return relays;
    }
}
