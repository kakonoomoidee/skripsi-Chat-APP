require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");

const {
  MNEMONIC,
  INFURA_PROJECT_ID,
  DEV_HOST,
  DEV_PORT,
  DEV_NETWORK_ID,
  PROD_HOST,
  PROD_PORT,
  PROD_NETWORK_ID,
  SEPOLIA_RPC_URL,
  MAINNET_RPC_URL,
} = process.env;

/**
 * Truffle configuration for multiple environments including local dev, local prod, testnet, and mainnet.
 * @type {Object}
 */
module.exports = {
  networks: {
    development: {
      host: DEV_HOST || "127.0.0.1",
      port: DEV_PORT || 7545,
      network_id: DEV_NETWORK_ID || "*",
    },
    production: {
      host: PROD_HOST || "127.0.0.1",
      port: PROD_PORT || 8545,
      network_id: PROD_NETWORK_ID || "*",
    },
    sepolia: {
      provider: () =>
        new HDWalletProvider(
          MNEMONIC,
          SEPOLIA_RPC_URL ||
            `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`,
        ),
      network_id: 11155111,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    mainnet: {
      provider: () =>
        new HDWalletProvider(
          MNEMONIC,
          MAINNET_RPC_URL ||
            `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
        ),
      network_id: 1,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: false,
    },
  },
  mocha: {},
  compilers: {
    solc: {
      version: "0.8.0",
    },
  },
};
