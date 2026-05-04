const express = require("express");
const crypto = require("crypto");
const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const ms = require("ms");
const { identityContract, JWT_SECRET } = require("./config");

const router = express.Router();

const NONCE_TTL_MS = ms("5m");
const activeNonces = {};

const authLimiter = rateLimit({
  windowMs: ms("15m"),
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

router.post("/challenge", authLimiter, (req, res) => {
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

router.post("/login", authLimiter, async (req, res) => {
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
      res.status(401).json({ error: "Invalid signature or nonce." });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error." });
  }
});

router.post("/register", async (req, res) => {
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

router.get("/address/:username", async (req, res) => {
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

router.get("/user/:address", async (req, res) => {
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

module.exports = router;
