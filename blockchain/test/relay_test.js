const RelayRegistry = artifacts.require("RelayRegistry");

/**
 * Test suite for RelayRegistry Smart Contract.
 * Verifies the registration, retrieval, and duplication checks of relay node URLs.
 */
contract("RelayRegistry", (accounts) => {
  let contractInstance;

  const RELAY_OWNER = accounts[0];
  const TEST_URL = "http://localhost:3003";

  before(async () => {
    contractInstance = await RelayRegistry.deployed();
    console.log("Contract Address:", contractInstance.address);
    console.log("Relay Owner Address:", RELAY_OWNER);
  });

  it("Should successfully register a new relay URL", async () => {
    const tx = await contractInstance.registerRelay(TEST_URL, {
      from: RELAY_OWNER,
    });
    console.log("Transaction Hash:", tx.receipt.transactionHash);

    const allRelays = await contractInstance.getAllRelays();

    const registeredRelay = allRelays.find((r) => r.url === TEST_URL);

    assert.isDefined(
      registeredRelay,
      "Relay URL was not found in the registry",
    );
    assert.equal(
      registeredRelay.owner,
      RELAY_OWNER,
      "Owner address does not match",
    );
    assert.equal(registeredRelay.isActive, true, "Relay should be active");

    console.log("Successfully registered relay:", registeredRelay.url);
  });

  it("Should prevent the same address from registering twice", async () => {
    try {
      await contractInstance.registerRelay("http://another-url.com", {
        from: RELAY_OWNER,
      });
      assert.fail("Should have thrown an error due to duplicate registration");
    } catch (error) {
      assert.include(
        error.message,
        "Address already registered",
        "Expected revert message not found",
      );
      console.log("Properly rejected duplicate registration.");
    }
  });
});
