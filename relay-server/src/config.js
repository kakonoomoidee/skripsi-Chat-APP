require("dotenv").config();
const { ethers } = require("ethers");
const IdentityRegistryABI = require("../abis/identity_abi.json");
const RelayRegistryABI = require("..abis/relay_registry_abi.json");

const REQUIRED_ENV_VARS = [
  "PORT",
  "RPC_URL",
  "CONTRACT_ADDRESS",
  "RELAY_REGISTRY_ADDRESS",
  "JWT_SECRET",
];

const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error(
    `FATAL: Missing required environment variables: ${missingVars.join(", ")}`,
  );
  process.exit(1);
}

const relayerKey =
  process.env.RELAYER_PRIVATE_KEY || process.env.DEFAULT_RELAYER_KEY;
if (!relayerKey) {
  console.error(
    "FATAL: Missing required environment variable: RELAYER_PRIVATE_KEY",
  );
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
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

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

const MY_PUBLIC_URL =
  process.env.RELAY_PUBLIC_URL || `http://localhost:${process.env.PORT}`;

module.exports = {
  provider,
  relayerWallet,
  identityContract,
  relayRegistryContract,
  allowedOrigins,
  MY_PUBLIC_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: process.env.PORT,
  INTERNAL_SECRET: process.env.INTERNAL_SECRET,
  RPC_URL: process.env.RPC_URL,
};
