const express = require("express");
const {
  provider,
  identityContract,
  relayRegistryContract,
  MY_PUBLIC_URL,
  INTERNAL_SECRET,
  RPC_URL,
} = require("./config");
const { getKnownRelaysCount, getKnownRelaysArray } = require("./relayService");
const { getActiveUsersCount } = require("./socketManager");

module.exports = (io) => {
  const router = express.Router();

  /**
   * Formats uptime seconds into a compact human-readable string.
   * @param {number} totalSeconds - Total uptime in seconds.
   * @returns {string} The formatted uptime string.
   */
  const formatUptime = (totalSeconds) => {
    const units = [
      { label: "w", value: 60 * 60 * 24 * 7 },
      { label: "d", value: 60 * 60 * 24 },
      { label: "h", value: 60 * 60 },
      { label: "m", value: 60 },
      { label: "s", value: 1 },
    ];

    let remaining = Math.floor(totalSeconds);
    const parts = [];

    units.forEach((unit) => {
      const amount = Math.floor(remaining / unit.value);
      if (amount > 0 || parts.length > 0 || unit.label === "s") {
        parts.push(`${amount}${unit.label}`);
      }
      remaining -= amount * unit.value;
    });

    return parts.join(" ");
  };

  router.post("/internal/gossip", (req, res) => {
    const secret = req.headers["x-internal-secret"];
    if (INTERNAL_SECRET && secret !== INTERNAL_SECRET) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { event, to, data } = req.body;
    io.to(to).emit(event, data);
    res.sendStatus(200);
  });

  /**
   * Builds a health payload with relay and chain stats.
   * @returns {Promise<Object>} The structured health data.
   */
  const buildHealthPayload = async () => {
    const connectedRelays = getKnownRelaysArray();
    const relay = {
      status: "ok",
      relayUrl: MY_PUBLIC_URL,
      knownRelays: getKnownRelaysCount(),
      activeConnections: getActiveUsersCount(),
      uptime: formatUptime(process.uptime()),
    };

    const chain = {
      rpcUrl: RPC_URL,
      rpcOk: false,
      chainId: null,
      latestBlock: null,
      clientVersion: null,
    };

    const network = {
      totalNodes: connectedRelays.length,
      connectedRelays,
    };

    try {
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber(),
      ]);
      chain.rpcOk = true;
      chain.chainId = Number(network.chainId);
      chain.latestBlock = blockNumber;
      chain.clientVersion = await provider.send("web3_clientVersion", []);
    } catch (error) {
      chain.rpcOk = false;
    }

    const contractEntries = [
      { name: "Identity Registry", contract: identityContract },
      { name: "Relay Registry", contract: relayRegistryContract },
    ];

    const contracts = await Promise.all(
      contractEntries.map(async (entry) => {
        const address =
          entry.contract?.target || entry.contract?.address || null;
        if (!address) {
          return { name: entry.name, address, deployed: false };
        }

        const code = await provider.getCode(address);
        return { name: entry.name, address, deployed: code !== "0x" };
      }),
    );

    return { relay, network, chain, contracts };
  };

  router.get("/ping", (req, res) => {
    res.status(200).send("pong");
  });

  router.get("/health", async (req, res) => {
    try {
      const payload = await buildHealthPayload();
      res.set("Content-Type", "application/json");
      res.send(JSON.stringify(payload, null, 2));
    } catch (error) {
      res.status(500).json({ error: "Health check failed" });
    }
  });

  router.post("/admin/register-relay", async (req, res) => {
    const { url } = req.body;
    try {
      const tx = await relayRegistryContract.registerRelay(
        url || MY_PUBLIC_URL,
      );
      await tx.wait();
      res.json({
        success: true,
        message: "Relay successfully registered to Blockchain!",
        txHash: tx.hash,
      });
    } catch (error) {
      res
        .status(500)
        .json({ error: error.reason || "Blockchain transaction failed" });
    }
  });

  return router;
};
