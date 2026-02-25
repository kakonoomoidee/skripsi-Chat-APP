require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const bodyParser = require("body-parser");
const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const IdentityRegistryABI = require("./identity_abi.json");
const RelayRegistryABI = require("./relay_registry_abi.json");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const httpServer = http.createServer(app);

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const relayerKey =
  process.env.RELAYER_PRIVATE_KEY || process.env.DEFAULT_RELAYER_KEY;
const relayerWallet = new ethers.Wallet(relayerKey, provider);

const identityContract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  IdentityRegistryABI,
  relayerWallet,
);

const relayRegistryContract = new ethers.Contract(
  process.env.RELAY_REGISTRY_ADDRESS,
  RelayRegistryABI,
  relayerWallet,
);

console.log(`Blockchain connected via: ${process.env.RPC_URL}`);
console.log(`Relayer Address: ${relayerWallet.address}`);

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const activeNonces = {};
let knownRelays = [];
const MY_PUBLIC_URL = `http://localhost:${process.env.PORT}`;

/**
 * Synchronizes the list of active relay nodes directly from the blockchain smart contract.
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

relayRegistryContract.on("NewRelayRegistered", (url, owner) => {
  console.log(`New relay registered on blockchain: ${url} by ${owner}`);
  syncRelaysFromBlockchain();
});

checkAndAutoRegister();

/**
 * Broadcasts socket events to all known external relay servers (Gossip Protocol).
 * @param {string} event - The socket event name
 * @param {string} to - The target user's wallet address
 * @param {object} data - The payload to transmit
 * @returns {void}
 */
const gossipToOtherRelays = (event, to, data) => {
  knownRelays.forEach((relayUrl) => {
    axios
      .post(`${relayUrl}/internal/gossip`, { event, to, data })
      .catch(() => {});
  });
};

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Authentication failed: No token provided."));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(
        new Error("Authentication failed: Invalid or expired token."),
      );
    }
    socket.userAddress = decoded.address;
    next();
  });
});

io.on("connection", (socket) => {
  const user = socket.userAddress.toLowerCase();
  console.log(`Client connected locally: ${user}`);

  socket.join(user);

  socket.on("send_message", (data) => {
    const to = data.to.toLowerCase();
    const payload = {
      from: user,
      message: data.encryptedMessage,
      timestamp: Date.now(),
    };

    io.to(to).emit("receive_message", payload);
    gossipToOtherRelays("receive_message", to, payload);
  });

  socket.on("handshake_init", (data) => {
    const to = data.to.toLowerCase();
    const payload = { from: user, ephemeralPublicKey: data.ephemeralPublicKey };

    io.to(to).emit("handshake_offer", payload);
    gossipToOtherRelays("handshake_offer", to, payload);
  });

  socket.on("handshake_response", (data) => {
    const to = data.to.toLowerCase();
    const payload = { from: user, ephemeralPublicKey: data.ephemeralPublicKey };

    io.to(to).emit("handshake_answer", payload);
    gossipToOtherRelays("handshake_answer", to, payload);
  });

  socket.on("webrtc_signal", (data) => {
    const to = data.to.toLowerCase();
    const payload = { from: user, signal: data.signal };

    io.to(to).emit("webrtc_signal", payload);
    gossipToOtherRelays("webrtc_signal", to, payload);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${user}`);
  });
});

app.post("/internal/gossip", (req, res) => {
  const { event, to, data } = req.body;
  io.to(to).emit(event, data);
  res.sendStatus(200);
});

app.post("/admin/register-relay", async (req, res) => {
  const { url } = req.body;
  try {
    const tx = await relayRegistryContract.registerRelay(url || MY_PUBLIC_URL);
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

app.post("/auth/challenge", (req, res) => {
  const { address } = req.body;
  if (!address)
    return res.status(400).json({ error: "Wallet address is required." });

  const nonce = `AUTH-CHALLENGE-${Math.floor(Math.random() * 1000000)}`;
  activeNonces[address] = nonce;
  res.json({ nonce });
});

app.post("/auth/login", async (req, res) => {
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
      const token = jwt.sign({ address }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
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
    if (!userData || !userData.isRegistered)
      return res.status(404).json({ error: "User not found" });
    res.json({ username: userData.username });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

httpServer.listen(process.env.PORT, () => {
  console.log(`Relay Server running on port ${process.env.PORT}`);
  console.log(`STATUS: WebSocket Active | Decentralized Gossip Active`);
});
