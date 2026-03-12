const axios = require("axios");
const {
  relayRegistryContract,
  MY_PUBLIC_URL,
  relayerWallet,
  INTERNAL_SECRET,
} = require("./config");

let knownRelays = [];

/**
 * Synchronizes the list of active relay nodes directly from the blockchain smart contract.
 *
 * @returns {Promise<void>}
 */
async function syncRelaysFromBlockchain() {
  try {
    const relays = await relayRegistryContract.getAllRelays();
    knownRelays = relays
      .filter((r) => r.isActive && r.url !== MY_PUBLIC_URL)
      .map((r) => r.url);
    console.log(
      `Synced ${knownRelays.length} external relay(s) from Blockchain.`,
    );
  } catch (error) {
    console.error("Failed to sync relays from blockchain:", error.message);
  }
}

/**
 * Automatically checks and registers the relay to the blockchain upon startup.
 *
 * @returns {Promise<void>}
 */
async function checkAndAutoRegister() {
  try {
    const relays = await relayRegistryContract.getAllRelays();
    const isRegistered = relays.find(
      (r) => r.owner.toLowerCase() === relayerWallet.address.toLowerCase(),
    );

    if (!isRegistered) {
      console.log(`Auto-registering ${MY_PUBLIC_URL} to Blockchain...`);
      const tx = await relayRegistryContract.registerRelay(MY_PUBLIC_URL);
      await tx.wait();
      console.log("Auto-registration successful!");
    } else {
      console.log(`Relay already registered: ${isRegistered.url}`);
    }

    syncRelaysFromBlockchain();
  } catch (error) {
    console.error("Auto-registration failed:", error.reason || error.message);
  }
}

/**
 * Broadcasts socket events to all known external relay servers.
 *
 * @param {string} event - The socket event name.
 * @param {string} to - The target user's wallet address.
 * @param {object} data - The payload to transmit.
 * @returns {void}
 */
const gossipToOtherRelays = (event, to, data) => {
  knownRelays.forEach((relayUrl) => {
    axios
      .post(
        `${relayUrl}/internal/gossip`,
        { event, to, data },
        INTERNAL_SECRET
          ? { headers: { "x-internal-secret": INTERNAL_SECRET } }
          : {},
      )
      .catch((err) => {
        console.warn(`Gossip to ${relayUrl} failed: ${err.message}`);
      });
  });
};

/**
 * Initializes relay registry event listeners.
 *
 * @returns {void}
 */
const initRelayService = () => {
  relayRegistryContract.on("NewRelayRegistered", (url, owner) => {
    console.log(`New relay registered on blockchain: ${url} by ${owner}`);
    syncRelaysFromBlockchain();
  });
  checkAndAutoRegister();
};

/**
 * Retrieves the count of known external relays.
 *
 * @returns {number}
 */
const getKnownRelaysCount = () => knownRelays.length;

module.exports = {
  syncRelaysFromBlockchain,
  checkAndAutoRegister,
  gossipToOtherRelays,
  initRelayService,
  getKnownRelaysCount,
};
