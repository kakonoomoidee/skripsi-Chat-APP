const express = require("express");
const { ethers } = require("ethers");
const {
  provider,
  identityContract,
  relayRegistryContract,
  MY_PUBLIC_URL,
  INTERNAL_SECRET,
  RPC_URL,
} = require("./config");
const { getKnownRelaysCount } = require("./relayService");
const { getActiveUsersCount } = require("./socketManager");

module.exports = (io) => {
  const router = express.Router();

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
    const relay = {
      status: "ok",
      relayUrl: MY_PUBLIC_URL,
      knownRelays: getKnownRelaysCount(),
      activeConnections: getActiveUsersCount(),
      uptime: process.uptime(),
    };

    const chain = {
      rpcUrl: RPC_URL,
      rpcOk: false,
      chainId: null,
      latestBlock: null,
      clientVersion: null,
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

    return { relay, chain, contracts };
  };

  router.get("/health", async (req, res) => {
    try {
      const payload = await buildHealthPayload();
      res.json(payload);
    } catch (error) {
      res.status(500).json({ error: "Health check failed" });
    }
  });
  router.get("/ping", (req, res) => {
    res.status(200).send("pong");
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
