const IdentityRegistry = artifacts.require("IdentityRegistry");

contract("IdentityRegistry", (accounts) => {
  let contractInstance;

  // KITA PURA-PURA JADI 2 ORANG:
  const RELAYER = accounts[0]; // Akun Relay (yang bayar gas)
  const USER = accounts[1]; // Akun User (yang punya identitas)

  const USERNAME = "KaisarGemini";
  const PUBKEY =
    "0x04bfcabf1c9e5e8a1d2c3e4f567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"; // Contoh Public Key (format uncompressed)

  before(async () => {
    contractInstance = await IdentityRegistry.deployed();
    console.log("📍 Contract Address:", contractInstance.address);
    console.log("👤 User Address:", USER);
    console.log("🤖 Relayer Address:", RELAYER);
  });

  // --- SKENARIO 1: REGISTER GASLESS ---
  it("Harus bisa Register Gasless (Meta-Transaction)", async () => {
    // 1. Siapkan Hash Pesan (Sama persis kayak logika Solidity)
    // Ingat urutannya: user address + username + publicKey
    const messageHash = web3.utils.soliditySha3(
      { t: "address", v: USER },
      { t: "string", v: USERNAME },
      { t: "string", v: PUBKEY },
    );
    console.log("🔐 Message Hash yang akan ditandatangani:", messageHash);

    // 2. User Menandatangani Pesan (Off-Chain)
    // Ini pura-puranya terjadi di Frontend/Metamask/LocalWallet
    const signature = await web3.eth.sign(messageHash, USER);
    console.log("✍️ Signature yang dihasilkan User:", signature);

    // 3. Pecah Signature jadi v, r, s (Ribet emang, tapi wajib buat Solidity)
    // Signature itu string panjang 132 karakter. Kita potong-potong.
    const r = signature.slice(0, 66);
    const s = "0x" + signature.slice(66, 130);
    const v = web3.utils.toDecimal("0x" + signature.slice(130, 132)) + 27;

    console.log("✍️ Signature User Generated!");
    console.log("   v:", v);
    console.log("   r:", r);
    console.log("   s:", s);

    // 4. KIRIM KE BLOCKCHAIN LEWAT RELAYER
    // Perhatikan: yang kirim transaksi 'from: RELAYER', bukan USER.
    await contractInstance.registerUser(USER, USERNAME, PUBKEY, v, r, s, {
      from: RELAYER,
    });

    // 5. Cek Hasilnya: Apakah User terdaftar?
    const userInfo = await contractInstance.getUser(USER);

    assert.equal(userInfo[0], USERNAME, "Username harus sesuai!");
    console.log("✅ Register Sukses! Username terdaftar:", userInfo[0]);
  });

  // --- SKENARIO 2: LOGIN CHALLENGE (NONCE) ---
  it("Harus bisa Validasi Login pake Nonce", async () => {
    const NONCE = "LOGIN-RAHASIA-12345";

    // 1. Hash Nonce
    const nonceHash = web3.utils.soliditySha3(NONCE);
    console.log("🔐 Nonce Hash yang akan ditandatangani:", nonceHash);

    // 2. User Sign Nonce
    const signature = await web3.eth.sign(nonceHash, USER);
    console.log("✍️ Signature untuk Login Challenge:", signature);

    // 3. Pecah Signature lagi
    const r = signature.slice(0, 66);
    const s = "0x" + signature.slice(66, 130);
    const v = web3.utils.toDecimal("0x" + signature.slice(130, 132)) + 27;
    console.log("✍️ Signature Login Challenge Generated!");
    console.log("   v:", v);
    console.log("   r:", r);
    console.log("   s:", s);

    // 4. Panggil Fungsi Verify di Contract (Gratis / Pure View)
    const isValid = await contractInstance.verifyLoginSignature(
      USER,
      NONCE,
      v,
      r,
      s,
    );

    assert.equal(isValid, true, "Signature harus valid!");
    console.log("✅ Login Validasi Sukses! User adalah pemilik asli.");
  });

  // --- SKENARIO 3: TES MALING (NEGATIVE CASE) ---
  it("Harus MENOLAK kalau Maling coba login", async () => {
    const NONCE = "LOGIN-RAHASIA-12345";
    const MALING = accounts[2]; // Orang asing

    // Maling coba sign nonce yang sama
    const nonceHash = web3.utils.soliditySha3(NONCE);
    const signature = await web3.eth.sign(nonceHash, MALING); // Maling yang sign!
    console.log("🕵️‍♂️ Maling coba sign Nonce:", signature);

    const r = signature.slice(0, 66);
    const s = "0x" + signature.slice(66, 130);
    const v = web3.utils.toDecimal("0x" + signature.slice(130, 132)) + 27;
    console.log("🕵️‍♂️ Maling Signature Generated!");
    console.log("   v:", v);
    console.log("   r:", r);
    console.log("   s:", s);

    // Cek ke contract, ngakunya User Asli (USER), tapi signature punya MALING
    const isValid = await contractInstance.verifyLoginSignature(
      USER,
      NONCE,
      v,
      r,
      s,
    );

    assert.equal(isValid, false, "Harus return False karena maling!");
    console.log("🛡️ Keamanan Terjamin! Maling gagal login.");
  });
});
