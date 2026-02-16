const { ethers } = require("ethers");

// Konfigurasi
const SERVER_URL = "http://localhost:3001";
const USERNAME = "KaisarGeminiTest";
const PUBLIC_KEY_DUMMY = "0x87B2bAE4173Af5e537c1B9CbB8Bd983D71aC0851";

async function main() {
  console.log("🚀 MEMULAI SIMULASI CLIENT...\n");

  // 1. BIKIN WALLET BARU (Pura-pura jadi User di Browser)
  const wallet = ethers.Wallet.createRandom();
  console.log("👤 User Wallet Address:", wallet.address);
  console.log("🔑 User Private Key:", wallet.privateKey); // Ssst rahasia

  // ==========================================
  // TEST 1: REGISTER GASLESS
  // ==========================================
  console.log("\n[TEST 1] Mencoba Register Gasless...");

  // A. Bikin Hash Data (Sama persis kayak logika Smart Contract)
  // Urutan: address, username, publicKey
  const registerHash = ethers.solidityPackedKeccak256(
    ["address", "string", "string"],
    [wallet.address, USERNAME, PUBLIC_KEY_DUMMY],
  );

  // B. Sign Hash tersebut (User tanda tangan)
  // Note: getBytes itu penting biar dianggap binary, bukan string
  const registerSignature = await wallet.signMessage(
    ethers.getBytes(registerHash),
  );

  // C. Kirim ke Relay
  try {
    const regResponse = await fetch(`${SERVER_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userAddress: wallet.address,
        username: USERNAME,
        publicKey: PUBLIC_KEY_DUMMY,
        signature: registerSignature,
      }),
    });

    const regResult = await regResponse.json();
    console.log("📤 Response Register:", regResult);

    if (regResult.success) {
      console.log("✅ REGISTER SUKSES! Hash Transaksi:", regResult.txHash);
    } else {
      console.log("❌ REGISTER GAGAL:", regResult.error);
      return; // Stop kalau gagal
    }
  } catch (err) {
    console.error("❌ Error Koneksi Register:", err);
  }

  // ==========================================
  // TEST 2: LOGIN CHALLENGE (NONCE)
  // ==========================================
  console.log("\n[TEST 2] Mencoba Login...");

  // A. Minta Nonce dulu
  let nonce = "";
  try {
    const chalResponse = await fetch(`${SERVER_URL}/auth/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: wallet.address }),
    });
    const chalResult = await chalResponse.json();
    nonce = chalResult.nonce;
    console.log("🎫 Dapet Nonce dari Relay:", nonce);
  } catch (err) {
    console.error("❌ Gagal minta nonce:", err);
    return;
  }

  // B. Sign Nonce (User ngerjain soal ujian)
  // Ingat: Di Contract kita hashing nonce dulu, baru sign.
  const nonceHash = ethers.solidityPackedKeccak256(["string"], [nonce]);
  const loginSignature = await wallet.signMessage(ethers.getBytes(nonceHash));

  // C. Kirim Jawaban ke Relay
  try {
    const loginResponse = await fetch(`${SERVER_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: wallet.address,
        signature: loginSignature,
      }),
    });

    const loginResult = await loginResponse.json();

    if (loginResult.token) {
      console.log(
        "✅ LOGIN SUKSES! Dapet JWT:",
        loginResult.token.substring(0, 20) + "...",
      );
      console.log("🎉 SEMUA SISTEM BERJALAN LANCAR!");
    } else {
      console.log("❌ LOGIN GAGAL:", loginResult.error);
    }
  } catch (err) {
    console.error("❌ Error Koneksi Login:", err);
  }
}

main();
