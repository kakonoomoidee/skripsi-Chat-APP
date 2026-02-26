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
    mapping(address => uint256) private ownerToIndex;

    event NewRelayRegistered(string url, address indexed owner);
    event RelayUrlUpdated(address indexed owner, string newUrl);
    event RelayDeactivated(address indexed owner);

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

        ownerToIndex[msg.sender] = relays.length;
        relays.push(RelayNode(_url, msg.sender, true));
        hasRegistered[msg.sender] = true;

        emit NewRelayRegistered(_url, msg.sender);
    }

    /**
     * Update the URL of an already-registered relay node
     * @param _newUrl string - The new endpoint URL
     */
    function updateRelayUrl(string memory _newUrl) public {
        require(hasRegistered[msg.sender], "Relay not registered");
        uint256 index = ownerToIndex[msg.sender];
        require(relays[index].isActive, "Relay is not active");

        relays[index].url = _newUrl;

        emit RelayUrlUpdated(msg.sender, _newUrl);
    }

    /**
     * Deactivate the caller's relay node, removing it from the active pool
     */
    function deactivateRelay() public {
        require(hasRegistered[msg.sender], "Relay not registered");
        uint256 index = ownerToIndex[msg.sender];
        require(relays[index].isActive, "Relay already deactivated");

        relays[index].isActive = false;

        emit RelayDeactivated(msg.sender);
    }

    /**
     * Retrieve all registered relay nodes
     * returns RelayNode[] - Array of all registered relay nodes
     */
    function getAllRelays() public view returns (RelayNode[] memory) {
        return relays;
    }
}
