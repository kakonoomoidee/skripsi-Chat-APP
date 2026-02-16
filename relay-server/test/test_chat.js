const { ethers } = require("ethers");
const io = require("socket.io-client");

const SERVER_URL = "http://localhost:3001"; // URL Relay

// Fungsi Helper: Login & Dapet Token
async function loginUser(wallet) {
  // 1. Minta Nonce
  const res1 = await fetch(`${SERVER_URL}/auth/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: wallet.address }),
  });
  const { nonce } = await res1.json();

  // 2. Sign Nonce
  const hash = ethers.solidityPackedKeccak256(["string"], [nonce]);
  const signature = await wallet.signMessage(ethers.getBytes(hash));

  // 3. Login
  const res2 = await fetch(`${SERVER_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: wallet.address, signature }),
  });
  const { token } = await res2.json();
  return token;
}

async function main() {
  console.log("🤖 MENYIAPKAN 2 USER...");

  // User A (Pengirim)
  const userA = ethers.Wallet.createRandom();
  const tokenA = await loginUser(userA);
  console.log(`👤 User A Ready: ${userA.address}`);

  // User B (Penerima)
  const userB = ethers.Wallet.createRandom();
  const tokenB = await loginUser(userB);
  console.log(`👤 User B Ready: ${userB.address}`);

  // --- KONEK SOCKET ---
  console.log("\n🔌 MENGHUBUNGKAN SOCKET...");

  const socketA = io(SERVER_URL, { auth: { token: tokenA } });
  const socketB = io(SERVER_URL, { auth: { token: tokenB } });

  // --- SETUP LISTENER (User B siap dengerin) ---
  socketB.on("connect", () => {
    console.log("✅ User B Terhubung ke Relay!");
  });

  socketB.on("receive_message", (data) => {
    console.log("\n📬 [USER B] TERIMA PESAN!");
    console.log(`   Dari: ${data.from}`);
    console.log(`   Pesan (Encrypted): ${data.message}`);
    console.log(`   Waktu: ${data.timestamp}`);

    console.log("\n🎉 TEST CHAT SUKSES! MATIKAN SCRIPT.");
    process.exit(0);
  });

  // --- USER A KIRIM PESAN ---
  socketA.on("connect", () => {
    console.log("✅ User A Terhubung! Mengirim pesan...");

    setTimeout(() => {
      const pesanRahasia = "Halo B, ini pesan rahasia!";
      // Pura-puranya ini udah dienkripsi di frontend

      socketA.emit("send_message", {
        to: userB.address, // Kirim ke B
        encryptedMessage: pesanRahasia,
      });
      console.log("📨 [USER A] Pesan Terkirim.");
    }, 1000);
  });
}

main();
