const express = require("express");
const {
  relayRegistryContract,
  MY_PUBLIC_URL,
  INTERNAL_SECRET,
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

  router.get("/health", (req, res) => {
    res.json({
      status: "ok",
      relayUrl: MY_PUBLIC_URL,
      knownRelays: getKnownRelaysCount(),
      activeConnections: getActiveUsersCount(),
      uptime: process.uptime(),
    });
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
