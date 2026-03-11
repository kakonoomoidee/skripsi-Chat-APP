const express = require("express");
const crypto = require("crypto");
const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const {
  identityContract,
  relayRegistryContract,
  MY_PUBLIC_URL,
  JWT_SECRET,
  INTERNAL_SECRET,
} = require("./config");
const { getKnownRelaysCount } = require("./relayService");
const { getActiveUsersCount } = require("./socketManager");

const NONCE_TTL_MS = 5 * 60 * 1000;
const activeNonces = {};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

/**
 * Mounts all Express routes to the application.
 *
 * @param {object} app - The Express application instance.
 * @param {object} io - The Socket.IO server instance.
 * @returns {void}
 */
const setupRoutes = (app, io) => {
  app.post("/internal/gossip", (req, res) => {
    const secret = req.headers["x-internal-secret"];
    if (INTERNAL_SECRET && secret !== INTERNAL_SECRET) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { event, to, data } = req.body;
    io.to(to).emit(event, data);
    res.sendStatus(200);
  });

  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      relayUrl: MY_PUBLIC_URL,
      knownRelays: getKnownRelaysCount(),
      activeConnections: getActiveUsersCount(),
      uptime: process.uptime(),
    });
  });

  app.get("/ping", (req, res) => {
    res.status(200).send("pong");
  });

  app.post("/admin/register-relay", async (req, res) => {
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

  app.post("/auth/challenge", authLimiter, (req, res) => {
    const { address } = req.body;
    if (!address)
      return res.status(400).json({ error: "Wallet address is required." });

    const nonce = `AUTH-CHALLENGE-${crypto.randomBytes(32).toString("hex")}`;
    activeNonces[address] = nonce;

    setTimeout(() => {
      if (activeNonces[address] === nonce) {
        delete activeNonces[address];
      }
    }, NONCE_TTL_MS);

    res.json({ nonce });
  });

  app.post("/auth/login", authLimiter, async (req, res) => {
    const { address, signature } = req.body;
    const nonce = activeNonces[address];

    if (!nonce)
      return res.status(400).json({ error: "Nonce not found or expired." });

    try {
      const userData = await identityContract.users(address);
      if (!userData || userData.isRegistered === false) {
        return res
          .status(403)
          .json({ error: "Identity not found. Please register first." });
      }

      const sig = ethers.Signature.from(signature);
      const isValid = await identityContract.verifyLoginSignature(
        address,
        nonce,
        sig.v,
        sig.r,
        sig.s,
      );

      if (isValid) {
        const token = jwt.sign({ address }, JWT_SECRET, { expiresIn: "1d" });
        delete activeNonces[address];
        res.json({ token, message: "Login successful." });
      } else {
        res.status(401).json({ error: "Invalid signature." });
      }
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error." });
    }
  });

  app.post("/auth/register", async (req, res) => {
    const { userAddress, username, publicKey, signature } = req.body;
    try {
      const sig = ethers.Signature.from(signature);
      const tx = await identityContract.registerUser(
        userAddress,
        username,
        publicKey,
        sig.v,
        sig.r,
        sig.s,
      );
      await tx.wait();
      res.json({ success: true, txHash: tx.hash });
    } catch (error) {
      res.status(500).json({ error: error.reason || "Transaction failed." });
    }
  });

  app.get("/auth/address/:username", async (req, res) => {
    try {
      const resolvedAddress = await identityContract.getAddressByUsername(
        req.params.username,
      );
      if (resolvedAddress === ethers.ZeroAddress) {
        return res.status(404).json({ error: "Username not found." });
      }
      res.json({ username: req.params.username, address: resolvedAddress });
    } catch (error) {
      res.status(500).json({ error: "Server error resolving identity." });
    }
  });

  app.get("/auth/user/:address", async (req, res) => {
    try {
      const userData = await identityContract.users(req.params.address);
      if (!userData || !userData.isRegistered) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ username: userData.username });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });
};

module.exports = { setupRoutes };
