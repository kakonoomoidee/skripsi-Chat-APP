require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");

const cors = require("cors");
const bodyParser = require("body-parser");
const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");

// Load ABI
const IdentityRegistryABI = require("./identity_abi.json");

// Setup Express
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Setup HTTP Server
const httpServer = http.createServer(app);

// --- 1. SETUP BLOCKCHAIN CONNECTION ---
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const relayerWallet = new ethers.Wallet(
  process.env.RELAYER_PRIVATE_KEY,
  provider,
);
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  IdentityRegistryABI,
  relayerWallet,
);

console.log(`Blockchain connected via: ${process.env.RPC_URL}`);
console.log(`Relayer Address: ${relayerWallet.address}`);

// --- 2. SETUP REDIS (PUBSUB MESSAGING) ---
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

// --- 3. SETUP SOCKET.IO ---
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

// Initialize Redis & Socket Adapter
Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Redis Adapter connected. Pub/Sub mode active.");
  })
  .catch((err) => {
    console.error("Redis connection failed:", err);
  });

// --- IN-MEMORY STORAGE (For Auth Nonces) ---
// Note: In a production cluster, use Redis for this storage too.
const activeNonces = {};

// ==========================================
// SOCKET MIDDLEWARE (Authentication)
// ==========================================
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

    // Attach user address to the socket session
    socket.userAddress = decoded.address;
    next();
  });
});

// ==========================================
// SOCKET EVENTS (Messaging Logic)
// ==========================================
io.on("connection", (socket) => {
  const user = socket.userAddress.toLowerCase();
  console.log(`Client connected: ${user}`);

  // Automatically join a room based on their Wallet Address
  socket.join(user);

  // Handle sending messages
  socket.on("send_message", (data) => {
    const to = data.to.toLowerCase();
    const { encryptedMessage } = data;

    console.log(
      `Message routed: ${user} -> ${to}, Encrypted: ${encryptedMessage}`,
    );

    // Relay the message to the target room
    io.to(to).emit("receive_message", {
      from: user,
      message: encryptedMessage,
      timestamp: Date.now(),
    });
  });

  // ======================================================
  // HANDSHAKE SIGNALING
  // ======================================================
  // STEP 1: User A initiates handshake with User B
  socket.on("handshake_init", (data) => {
    const to = data.to.toLowerCase();
    const { ephemeralPublicKey } = data;
    console.log(`Handshake Init: ${user} -> ${to}`);

    io.in(to).emit("handshake_offer", {
      from: user,
      ephemeralPublicKey: ephemeralPublicKey,
    });
  });

  // STEP 2: User B responds to handshake offer
  socket.on("handshake_response", (data) => {
    const to = data.to.toLowerCase();
    const { ephemeralPublicKey } = data;
    console.log(`Handshake Response: ${user} -> ${to}`);

    io.in(to).emit("handshake_answer", {
      from: user,
      ephemeralPublicKey: ephemeralPublicKey,
    });
  });

  // ======================================================
  // WEBRTC SIGNALING (For P2P Data Channel)
  // ======================================================
  socket.on("webrtc_signal", (data) => {
    const to = data.to.toLowerCase();

    io.in(to).emit("webrtc_signal", {
      from: user,
      signal: data.signal,
    });
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${user}`);
  });
});

// ==========================================
// AUTHENTICATION API
// ==========================================

/**
 * 1. Request Challenge (Nonce)
 * Payload: { address: "0x..." }
 */
app.post("/auth/challenge", (req, res) => {
  const { address } = req.body;
  if (!address) {
    return res.status(400).json({ error: "Wallet address is required." });
  }

  // Generate a random nonce with a standard prefix
  const nonce = `AUTH-CHALLENGE-${Math.floor(Math.random() * 1000000)}`;

  // Store nonce temporarily
  activeNonces[address] = nonce;

  console.log(`Nonce generated for ${address}: ${nonce}`);
  res.json({ nonce });
});

/**
 * 2. Login (Verify Signature & Check Blockchain Identity)
 * Payload: { address: "0x...", signature: "0x..." }
 */
app.post("/auth/login", async (req, res) => {
  const { address, signature } = req.body;

  // Retrieve the nonce assigned to this address
  const nonce = activeNonces[address];
  if (!nonce) {
    return res.status(400).json({
      error: "Nonce not found or expired. Please request a new challenge.",
    });
  }

  try {
    const userData = await contract.users(address);

    // Verify the isRegistered property from the User struct
    if (!userData || userData.isRegistered === false) {
      console.warn(
        `Login rejected: ${address} attempted to login without registration.`,
      );
      return res.status(403).json({
        error: "Identity not found on the blockchain. Please register first.",
      });
    }

    const sig = ethers.Signature.from(signature);

    const isValid = await contract.verifyLoginSignature(
      address,
      nonce,
      sig.v,
      sig.r,
      sig.s,
    );

    if (isValid) {
      // Generate JWT Token
      const token = jwt.sign({ address }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      // Cleanup nonce to prevent replay attacks
      delete activeNonces[address];

      console.log(`Authentication successful: ${address}`);
      res.json({ token, message: "Login successful." });
    } else {
      console.warn(`Authentication failed: Invalid signature for ${address}`);
      res
        .status(401)
        .json({ error: "Invalid signature. Authentication failed." });
    }
  } catch (error) {
    console.error("Login System Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error during verification." });
  }
});

/**
 * 3. Gasless Registration
 * Payload: { userAddress, username, publicKey, signature }
 */
app.post("/auth/register", async (req, res) => {
  const { userAddress, username, publicKey, signature } = req.body;
  console.log(`Incoming registration request for: ${username}`);

  try {
    const sig = ethers.Signature.from(signature);

    // Execute transaction on Blockchain (Relayer pays gas)
    const tx = await contract.registerUser(
      userAddress,
      username,
      publicKey,
      sig.v,
      sig.r,
      sig.s,
    );

    console.log(`Transaction sent. Hash: ${tx.hash}`);

    // Wait for confirmation
    await tx.wait();

    console.log(`Registration confirmed for ${username}`);
    res.json({
      success: true,
      txHash: tx.hash,
      message: "User registered successfully.",
    });
  } catch (error) {
    console.error("Registration Failed:", error);

    // Return a cleaner error message if possible
    const errorMessage = error.reason || "Blockchain transaction failed.";
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * 4. Resolve Username to Wallet Address
 * Endpoint: GET /auth/address/:username
 */
app.get("/auth/address/:username", async (req, res) => {
  const { username } = req.params;

  console.log(`Resolving address for username: ${username}`);

  try {
    // Query the Blockchain via getAddressByUsername function
    const resolvedAddress = await contract.getAddressByUsername(username);

    // In Solidity, non-existent data defaults to address(0)
    if (
      resolvedAddress === "0x0000000000000000000000000000000000000000" ||
      resolvedAddress === ethers.ZeroAddress
    ) {
      return res.status(404).json({
        error: "Username not found on the Blockchain network.",
      });
    }

    // If found, return the resolved address
    res.json({
      username: username,
      address: resolvedAddress,
    });
  } catch (error) {
    console.error("Failed to resolve username:", error);
    res.status(500).json({
      error: "Internal server error occurred while resolving identity.",
    });
  }
});

/**
 * 5. Resolve Wallet Address to Username (Reverse Lookup)
 * Endpoint: GET /auth/user/:address
 */
app.get("/auth/user/:address", async (req, res) => {
  try {
    const userData = await contract.users(req.params.address);
    if (!userData || !userData.isRegistered) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ username: userData.username });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// START SERVER
httpServer.listen(process.env.PORT, () => {
  console.log(`Relay Server running on port ${process.env.PORT}`);
  console.log(`STATUS: WebSocket Active | Redis Active | Blockchain Active`);
});
