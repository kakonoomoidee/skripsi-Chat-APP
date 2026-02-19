const { ethers } = require("ethers");
const io = require("socket.io-client");
const axios = require("axios");

// Konfigurasi Server
const SERVER_URL = "http://localhost:3001";

// Fungsi Helper: Delay biar gak terlalu ngebut log-nya
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// 🦸‍♂️ CLASS USER SIMULATION
// ==========================================
class TestUser {
  constructor(name) {
    this.name = name;
    this.wallet = ethers.Wallet.createRandom();
    this.token = null;
    this.socket = null;
    this.publicKeyDummy = `PUBKEY_${name}_${Date.now()}`; // Pura-pura Public Key Enc
  }

  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }

  // --- 1. REGISTER ---
  async register() {
    this.log(`🚀 Mencoba Register Address: ${this.wallet.address}`);

    // Hash Data (Sesuai Logic Smart Contract)
    const hash = ethers.solidityPackedKeccak256(
      ["address", "string", "string"],
      [this.wallet.address, this.name, this.publicKeyDummy],
    );
    const signature = await this.wallet.signMessage(ethers.getBytes(hash));

    try {
      const res = await axios.post(`${SERVER_URL}/auth/register`, {
        userAddress: this.wallet.address,
        username: this.name,
        publicKey: this.publicKeyDummy,
        signature: signature,
      });
      this.log(
        `✅ Register Sukses! TxHash: ${res.data.txHash.substring(0, 20)}...`,
      );
    } catch (err) {
      this.log(
        `❌ Register Gagal: ${err.response?.data?.error || err.message}`,
      );
      throw err;
    }
  }

  // --- 2. LOGIN ---
  async login() {
    this.log(`🔑 Mencoba Login...`);

    // A. Minta Nonce
    const resChal = await axios.post(`${SERVER_URL}/auth/challenge`, {
      address: this.wallet.address,
    });
    const nonce = resChal.data.nonce;

    // B. Sign Nonce
    const nonceHash = ethers.solidityPackedKeccak256(["string"], [nonce]);
    const signature = await this.wallet.signMessage(ethers.getBytes(nonceHash));

    // C. Kirim Jawaban
    const resLogin = await axios.post(`${SERVER_URL}/auth/login`, {
      address: this.wallet.address,
      signature: signature,
    });

    this.token = resLogin.data.token;
    this.log(`✅ Login Sukses! Dapet Token.`);
  }

  // --- 3. CONNECT SOCKET ---
  connectSocket() {
    return new Promise((resolve, reject) => {
      this.log(`🔌 Connecting to Socket...`);
      this.socket = io(SERVER_URL, {
        auth: { token: this.token },
      });

      this.socket.on("connect", () => {
        this.log(`✅ Socket Connected! ID: ${this.socket.id}`);
        resolve();
      });

      this.socket.on("connect_error", (err) => {
        this.log(`❌ Socket Error: ${err.message}`);
        reject(err);
      });
    });
  }
}

// ==========================================
// 🎬 SKENARIO INTEGRATION TEST
// ==========================================
async function main() {
  console.log("==========================================");
  console.log("🔥 MULAI INTEGRATION TEST: FULL FEATURES 🔥");
  console.log("==========================================\n");

  const romi = new TestUser("Romi_Alpha");
  const juli = new TestUser("Juli_Beta");

  try {
    // STEP 1: REGISTER KEDUANYA
    await romi.register();
    await juli.register();
    console.log(""); // Spasi biar rapi

    // STEP 2: LOGIN KEDUANYA
    await romi.login();
    await juli.login();
    console.log("");

    // STEP 3: SOCKET CONNECTION
    await romi.connectSocket();
    await juli.connectSocket();
    console.log("");

    // STEP 4: HANDSHAKE SCENARIO
    console.log("--- 🤝 TEST HANDSHAKE ---");

    // Setup Listener Juli (Nunggu diajak salaman)
    const juliHandshakePromise = new Promise((resolve) => {
      juli.socket.on("handshake_offer", (data) => {
        juli.log(`📨 Terima Handshake Offer dari ${data.from}`);

        // Juli bales
        juli.log(`📤 Mengirim Handshake Response ke ${data.from}`);
        juli.socket.emit("handshake_response", {
          to: data.from,
          ephemeralPublicKey: "KEY_SEMENTARA_JULI_123",
        });
        resolve();
      });
    });

    // Setup Listener Romi (Nunggu balasan salaman)
    const romiHandshakePromise = new Promise((resolve) => {
      romi.socket.on("handshake_answer", (data) => {
        romi.log(`📨 Terima Handshake Answer dari ${data.from}`);
        if (data.ephemeralPublicKey === "KEY_SEMENTARA_JULI_123") {
          romi.log(`✅ HANDSHAKE COMPLETED! Kunci Juli valid.`);
          resolve();
        }
      });
    });

    // Romi Mulai Duluan
    romi.log(`📤 Mengirim Handshake Init ke Juli (${juli.wallet.address})`);
    romi.socket.emit("handshake_init", {
      to: juli.wallet.address,
      ephemeralPublicKey: "KEY_SEMENTARA_ROMI_999",
    });

    await Promise.all([juliHandshakePromise, romiHandshakePromise]);
    console.log("✅ FEATURE HANDSHAKE: PASSED\n");

    // STEP 5: CHAT SCENARIO
    console.log("--- 💬 TEST CHATTING ---");

    // Juli siap-siap denger pesan
    const chatPromise = new Promise((resolve) => {
      juli.socket.on("receive_message", (data) => {
        juli.log(`📬 PESAN DITERIMA: "${data.message}" dari ${data.from}`);
        resolve();
      });
    });

    // Romi kirim pesan
    romi.log(`📤 Kirim pesan ke Juli...`);
    romi.socket.emit("send_message", {
      to: juli.wallet.address,
      encryptedMessage: "Halo Juli, ini pesan rahasia kita! 🤫",
    });

    await chatPromise;
    console.log("✅ FEATURE CHAT: PASSED\n");

    console.log("==========================================");
    console.log("🎉🎉 SEMUA TEST BERHASIL! SYSTEM READY! 🎉🎉");
    console.log("==========================================");

    process.exit(0);
  } catch (error) {
    console.error("\n❌❌ TEST GAGAL! ADA ERROR! ❌❌");
    console.error(error);
    process.exit(1);
  }
}

main();
