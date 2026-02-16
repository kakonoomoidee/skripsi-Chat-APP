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
const IdentityRegistryABI = require("./identity_abi.json").abi;

// Setup Express
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Setup HTTP Server (Bungkus Express)
const httpServer = http.createServer(app);

// --- 1. SETUP BLOCKCHAIN ---
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, IdentityRegistryABI, relayerWallet);

// --- 2. SETUP REDIS (THE SPEAKER) ---
const pubClient = createClient({ url: "redis://localhost:6379" });
const subClient = pubClient.duplicate();

// --- 3. SETUP SOCKET.IO ---
const io = new Server(httpServer, {
    cors: {
        origin: "*",
    }
});

// Jalankan Redis & Socket Adapter
Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log("🔊 Redis Adapter Connected: Mode 'Speaker' Aktif!");
});

// --- MEMORY SEMENTARA (Auth Nonce) ---
const activeNonces = {};

// ==========================================
// 🛡️ MIDDLEWARE SOCKET
// ==========================================
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
        return next(new Error("MANA TIKETNYA? (Authentication error)"));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("TIKET PALSU! (Invalid Token)"));
        
        socket.userAddress = decoded.address;
        next();
    });
});

// ==========================================
// 💬 EVENT SOCKET (Logic Chatting)
// ==========================================
io.on("connection", (socket) => {
    const user = socket.userAddress;
    console.log(`🔌 User Online: ${user}`);

    socket.join(user); 

    socket.on("send_message", (data) => {
        const { to, encryptedMessage } = data;

        console.log(`📨 Pesan dari ${user} -> ${to}`);

        io.to(to).emit("receive_message", {
            from: user,
            message: encryptedMessage,
            timestamp: Date.now()
        });
    });

    socket.on("disconnect", () => {
        console.log(`❌ User Offline: ${user}`);
    });
});

// ==========================================
// 🛡️ API AUTH
// ==========================================
app.post("/auth/challenge", (req, res) => {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: "Address required" });
    const nonce = `LOGIN-KAISAR-${Math.floor(Math.random() * 1000000)}`;
    activeNonces[address] = nonce;
    console.log(`🎫 Nonce: ${nonce} -> ${address}`);
    res.json({ nonce });
});

app.post("/auth/login", async (req, res) => {
    const { address, signature } = req.body;
    const nonce = activeNonces[address];
    if (!nonce) return res.status(400).json({ error: "Nonce not found" });

    try {
        const sig = ethers.Signature.from(signature);
        const isValid = await contract.verifyLoginSignature(address, nonce, sig.v, sig.r, sig.s);

        if (isValid) {
            const token = jwt.sign({ address }, process.env.JWT_SECRET, { expiresIn: "1d" });
            delete activeNonces[address];
            res.json({ token });
        } else {
            res.status(401).json({ error: "Invalid Signature" });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Verification Failed" });
    }
});

app.post("/auth/register", async (req, res) => {
    const { userAddress, username, publicKey, signature } = req.body;
    console.log(`📝 Register: ${username}`);
    try {
        const sig = ethers.Signature.from(signature);
        const tx = await contract.registerUser(userAddress, username, publicKey, sig.v, sig.r, sig.s);
        console.log(`⏳ Tx Hash: ${tx.hash}`);
        await tx.wait();
        console.log(`🎉 Register Success!`);
        res.json({ success: true, txHash: tx.hash });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ error: error.reason || "Blockchain Error" });
    }
});

// JALANKAN HTTP SERVER (Bukan app.listen lagi)
httpServer.listen(process.env.PORT, () => {
    console.log(`🚀 Relay Server + Socket.io + Redis siap di port ${process.env.PORT}`);
});