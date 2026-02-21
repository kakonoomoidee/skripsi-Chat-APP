const fs = require("fs");
const path = require("path");

// Sesuaikan nama ini dengan nama contract punya yang mulia
const IdentityRegistry = artifacts.require("IdentityRegistry");

module.exports = async function (deployer) {
  // 1. Proses "Deploy" ke Blockchain
  await deployer.deploy(IdentityRegistry);
  const instance = await IdentityRegistry.deployed();

  console.log(
    `\n✅ "Smart Contract" berhasil ter-deploy di: ${instance.address}`,
  );

  // ==========================================
  // 2. Lengan Robot: "Auto-Copy" ABI & Address
  // ==========================================
  console.log("Mulai kirim paket ke relay-server...");

  // Setup jalur file (asumsi folder blockchain dan relay-server sebelahan)
  const buildPath = path.join(
    __dirname,
    "../build/contracts/IdentityRegistry.json",
  );
  const targetAbiPath = path.join(
    __dirname,
    "../../relay-server/identity_abi.json",
  );
  const targetEnvPath = path.join(__dirname, "../../relay-server/.env");

  // A. Eksekusi lempar "ABI"
  if (fs.existsSync(buildPath)) {
    const contractData = JSON.parse(fs.readFileSync(buildPath, "utf8"));
    // Cuma ambil array "abi"-nya aja biar file di relay-server tetep enteng
    fs.writeFileSync(targetAbiPath, JSON.stringify(contractData.abi, null, 2));
    console.log(`✅ "ABI" sukses dikirim ke gudang relay-server!`);
  } else {
    console.log(`❌ Gagal: File hasil build Truffle nggak ketemu!`);
  }

  // B. Eksekusi update "Address" di .env
  if (fs.existsSync(targetEnvPath)) {
    let envContent = fs.readFileSync(targetEnvPath, "utf8");

    // Replace address lama sama address baru yang fresh
    envContent = envContent.replace(
      /CONTRACT_ADDRESS=.*/g,
      `CONTRACT_ADDRESS="${instance.address}"`,
    );
    fs.writeFileSync(targetEnvPath, envContent);
    console.log(`✅ "Contract Address" di .env relay-server udah di-update!`);
  } else {
    console.log(`❌ Gagal: File .env di relay-server nggak ketemu!`);
  }

  console.log("🚀 SEMUA PROSES AUTOMASI BERES!\n");
};
