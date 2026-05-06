const RelayRegistry = artifacts.require("RelayRegistry");

/**
 * Comprehensive test suite for RelayRegistry Smart Contract.
 * Covers relay node registration, URL updates, deactivation, and retrieval operations.
 */
contract("RelayRegistry Complete Test Suite", (accounts) => {
  let contractInstance;

  // Test Identity Accounts
  const RELAY_OWNER_1 = accounts[0];
  const RELAY_OWNER_2 = accounts[1];
  const RELAY_OWNER_3 = accounts[2];
  const UNAUTHORIZED_USER = accounts[3];

  // Test Relay URLs
  const RELAY_URL_1 = "http://relay-node-1.example.com:3003";
  const RELAY_URL_2 = "http://relay-node-2.example.com:3003";
  const RELAY_URL_3 = "http://relay-node-3.example.com:3003";
  const UPDATED_RELAY_URL_1 = "http://relay-node-1-updated.example.com:3003";

  before(async () => {
    contractInstance = await RelayRegistry.deployed();
    console.log("\n========== RelayRegistry Test Suite Setup ==========");
    console.log("Contract Address:", contractInstance.address);
    console.log("Relay Owner 1 Address:", RELAY_OWNER_1);
    console.log("Relay Owner 2 Address:", RELAY_OWNER_2);
    console.log("Relay Owner 3 Address:", RELAY_OWNER_3);
    console.log("Unauthorized User Address:", UNAUTHORIZED_USER);
    console.log("====================================================\n");
  });

  describe("Relay Registration Tests", () => {
    it("Should successfully register a new relay with valid URL", async () => {
      // Arrange & Act
      const tx = await contractInstance.registerRelay(RELAY_URL_1, {
        from: RELAY_OWNER_1,
      });

      // Assert
      assert.isTrue(
        tx.receipt.status,
        "Transaction should succeed"
      );
      assert.isTrue(
        tx.logs.some((log) => log.event === "NewRelayRegistered"),
        "NewRelayRegistered event should be emitted"
      );

      const allRelays = await contractInstance.getAllRelays();
      const registeredRelay = allRelays.find((r) => r.url === RELAY_URL_1);

      assert.isDefined(
        registeredRelay,
        "Relay URL should be found in registry"
      );
      assert.equal(
        registeredRelay.owner,
        RELAY_OWNER_1,
        "Owner address should match"
      );
      assert.isTrue(registeredRelay.isActive, "Relay should be active");

      const hasRegistered = await contractInstance.hasRegistered(RELAY_OWNER_1);
      assert.isTrue(
        hasRegistered,
        "Owner should be marked as registered"
      );

      console.log(
        "✓ Passed: Relay Owner 1 successfully registered relay at",
        RELAY_URL_1
      );
    });

    it("Should prevent the same address from registering twice", async () => {
      // Arrange - RELAY_OWNER_1 is already registered from previous test

      // Act & Assert
      try {
        await contractInstance.registerRelay(RELAY_URL_2, {
          from: RELAY_OWNER_1,
        });
        assert.fail("Should have thrown an error for duplicate registration");
      } catch (error) {
        assert.include(
          error.message,
          "already registered",
          "Error message should indicate address is already registered"
        );
        console.log(
          "✓ Passed: Duplicate registration rejected for RELAY_OWNER_1"
        );
      }
    });

      const { ethers } = require("ethers");

    it("Should allow different addresses to register relay nodes", async () => {
      // Arrange & Act - Register RELAY_OWNER_2
      const tx2 = await contractInstance.registerRelay(RELAY_URL_2, {
        from: RELAY_OWNER_2,
      });

      // Assert
      assert.isTrue(tx2.receipt.status, "RELAY_OWNER_2 registration should succeed");

      // Arrange & Act - Register RELAY_OWNER_3
      const tx3 = await contractInstance.registerRelay(RELAY_URL_3, {
        from: RELAY_OWNER_3,
      });

      // Assert
      assert.isTrue(tx3.receipt.status, "RELAY_OWNER_3 registration should succeed");

      const allRelays = await contractInstance.getAllRelays();
      assert.equal(allRelays.length, 3, "Contract should have 3 registered relays");

      console.log(
        "✓ Passed: Multiple relay owners successfully registered different nodes"
      );
    });
  });

  describe("Relay URL Update Tests", () => {
    it("Should allow registered relay owner to update their URL", async () => {
      // Arrange - RELAY_OWNER_1 is registered and can update

      // Act
      const tx = await contractInstance.updateRelayUrl(UPDATED_RELAY_URL_1, {
        from: RELAY_OWNER_1,
      });

      // Assert
      assert.isTrue(
        tx.receipt.status,
        "URL update transaction should succeed"
      );
      assert.isTrue(
        tx.logs.some((log) => log.event === "RelayUrlUpdated"),
        "RelayUrlUpdated event should be emitted"
      );

      const allRelays = await contractInstance.getAllRelays();
      const updatedRelay = allRelays.find(
        (r) => r.owner === RELAY_OWNER_1
      );

      assert.equal(
        updatedRelay.url,
        UPDATED_RELAY_URL_1,
        "Relay URL should be updated"
      );

      console.log(
        "✓ Passed: RELAY_OWNER_1 successfully updated URL to",
        UPDATED_RELAY_URL_1
      );
    });

    it("Should reject URL update from unregistered address", async () => {
      // Arrange - UNAUTHORIZED_USER has not registered a relay

      // Act & Assert
      try {
        await contractInstance.updateRelayUrl("http://new-url.example.com", {
          from: UNAUTHORIZED_USER,
        });
        assert.fail("Should have thrown an error for unregistered user");
      } catch (error) {
        assert.include(
          error.message,
          "Relay not registered",
          "Error message should indicate relay is not registered"
        );
        console.log(
          "✓ Passed: URL update rejected for unregistered user"
        );
      }
    });

    it("Should reject URL update for deactivated relay", async () => {
      // Arrange - Deactivate RELAY_OWNER_2's relay first
      await contractInstance.deactivateRelay({
        from: RELAY_OWNER_2,
      });

      // Act & Assert
      try {
        await contractInstance.updateRelayUrl("http://new-url-2.example.com", {
          from: RELAY_OWNER_2,
        });
        assert.fail("Should have thrown an error for deactivated relay");
      } catch (error) {
        assert.include(
          error.message,
          "not active",
          "Error message should indicate relay is not active"
        );
        console.log(
          "✓ Passed: URL update rejected for deactivated relay"
        );
      }
    });
  });

  describe("Relay Deactivation Tests", () => {
    it("Should allow registered relay owner to deactivate their relay", async () => {
      // Arrange - RELAY_OWNER_3 is registered and active

      // Act
      const tx = await contractInstance.deactivateRelay({
        from: RELAY_OWNER_3,
      });

      // Assert
      assert.isTrue(
        tx.receipt.status,
        "Deactivation transaction should succeed"
      );
      assert.isTrue(
        tx.logs.some((log) => log.event === "RelayDeactivated"),
        "RelayDeactivated event should be emitted"
      );

      const allRelays = await contractInstance.getAllRelays();
      const deactivatedRelay = allRelays.find(
        (r) => r.owner === RELAY_OWNER_3
      );

      assert.isFalse(
        deactivatedRelay.isActive,
        "Relay should be marked as inactive"
      );

      console.log(
        "✓ Passed: RELAY_OWNER_3 successfully deactivated their relay"
      );
    });

    it("Should reject deactivation from unregistered address", async () => {
      // Arrange - UNAUTHORIZED_USER has not registered a relay

      // Act & Assert
      try {
        await contractInstance.deactivateRelay({
          from: UNAUTHORIZED_USER,
        });
        assert.fail("Should have thrown an error for unregistered user");
      } catch (error) {
        assert.include(
          error.message,
          "Relay not registered",
          "Error message should indicate relay is not registered"
        );
        console.log(
          "✓ Passed: Deactivation rejected for unregistered user"
        );
      }
    });

    it("Should reject double deactivation of same relay", async () => {
      // Arrange - RELAY_OWNER_3's relay is already deactivated

      // Act & Assert
      try {
        await contractInstance.deactivateRelay({
          from: RELAY_OWNER_3,
        });
        assert.fail("Should have thrown an error for already deactivated relay");
      } catch (error) {
        assert.include(
          error.message,
          "already deactivated",
          "Error message should indicate relay is already deactivated"
        );
        console.log(
          "✓ Passed: Double deactivation rejected"
        );
      }
    });
  });

  describe("Relay Retrieval Tests", () => {
    it("Should retrieve all registered relay nodes with correct data", async () => {
      // Arrange & Act
      const allRelays = await contractInstance.getAllRelays();

      // Assert
      assert.isAtLeast(
        allRelays.length,
        3,
        "Should have at least 3 relays registered"
      );

      // Verify RELAY_OWNER_1's updated relay
      const relay1 = allRelays.find((r) => r.owner === RELAY_OWNER_1);
      assert.isDefined(relay1, "RELAY_OWNER_1 relay should exist");
      assert.equal(relay1.url, UPDATED_RELAY_URL_1, "URL should be updated");
      assert.isTrue(relay1.isActive, "RELAY_OWNER_1 relay should be active");

      // Verify RELAY_OWNER_2's relay (deactivated earlier)
      const relay2 = allRelays.find((r) => r.owner === RELAY_OWNER_2);
      assert.isDefined(relay2, "RELAY_OWNER_2 relay should exist");
      assert.isFalse(relay2.isActive, "RELAY_OWNER_2 relay should be inactive");

      // Verify RELAY_OWNER_3's relay (deactivated)
      const relay3 = allRelays.find((r) => r.owner === RELAY_OWNER_3);
      assert.isDefined(relay3, "RELAY_OWNER_3 relay should exist");
      assert.isFalse(relay3.isActive, "RELAY_OWNER_3 relay should be inactive");

      console.log(
        "✓ Passed: Retrieved all relays with correct data"
      );
    });

    it("Should maintain correct data structure for relay nodes", async () => {
      // Arrange & Act
      const allRelays = await contractInstance.getAllRelays();
      const relay = allRelays[0];

      // Assert - Verify structure
      assert.hasAllKeys(
        relay,
        ["url", "owner", "isActive"],
        "Relay should have url, owner, and isActive properties"
      );
      assert.isString(relay.url, "URL should be a string");
      assert.isString(relay.owner, "Owner should be a string");
      assert.isBoolean(relay.isActive, "isActive should be a boolean");

      console.log(
        "✓ Passed: Relay data structure is correct"
      );
    });
  });

  describe("Registration Status Tests", () => {
    it("Should correctly track registration status for each address", async () => {
      // Arrange, Act & Assert
      const isOwner1Registered = await contractInstance.hasRegistered(
        RELAY_OWNER_1
      );
      assert.isTrue(isOwner1Registered, "RELAY_OWNER_1 should be registered");

      const isOwner2Registered = await contractInstance.hasRegistered(
        RELAY_OWNER_2
      );
      assert.isTrue(isOwner2Registered, "RELAY_OWNER_2 should be registered");

      const isUnauthorizedRegistered = await contractInstance.hasRegistered(
        UNAUTHORIZED_USER
      );
      assert.isFalse(
        isUnauthorizedRegistered,
        "UNAUTHORIZED_USER should not be registered"
      );

      console.log(
        "✓ Passed: Registration status tracked correctly"
      );
    });
  });

  describe("Event Emission Tests", () => {
    it("Should emit correct events with proper parameters during relay registration", async () => {
      // Arrange
      const newRelayOwner = accounts[4];
      const newRelayUrl = "http://relay-node-4.example.com:3003";

      // Act
      const tx = await contractInstance.registerRelay(newRelayUrl, {
        from: newRelayOwner,
      });

      // Assert
      const registeredEvent = tx.logs.find(
        (log) => log.event === "NewRelayRegistered"
      );
      assert.isDefined(registeredEvent, "NewRelayRegistered event should exist");
      assert.equal(
        registeredEvent.args.url,
        newRelayUrl,
        "Event should contain correct URL"
      );
      assert.equal(
        registeredEvent.args.owner,
        newRelayOwner,
        "Event should contain correct owner address"
      );

      console.log(
        "✓ Passed: Registration events emitted with correct parameters"
      );
    });
  });
});
