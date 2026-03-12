const fs = require("fs");
const path = require("path");

const IdentityRegistry = artifacts.require("IdentityRegistry");
const RelayRegistry = artifacts.require("RelayRegistry");

/**
 * Deploy Identity and Relay Registry contracts, then sync ABIs and addresses to relay-server
 * @param {object} deployer - The Truffle deployer object
 * @returns {Promise<void>}
 */
module.exports = async function (deployer) {
  await deployer.deploy(IdentityRegistry);
  const identityInstance = await IdentityRegistry.deployed();
  console.log(`IdentityRegistry deployed at: ${identityInstance.address}`);

  await deployer.deploy(RelayRegistry);
  const relayInstance = await RelayRegistry.deployed();
  console.log(`RelayRegistry deployed at: ${relayInstance.address}`);

  const relayServerPath = path.join(__dirname, "../../relay-server/abis");

  const targetIdentityAbiPath = path.join(relayServerPath, "identity_abi.json");
  const targetRelayAbiPath = path.join(
    relayServerPath,
    "relay_registry_abi.json",
  );
  const targetEnvPath = path.join(relayServerPath, ".env");

  fs.writeFileSync(
    targetIdentityAbiPath,
    JSON.stringify(IdentityRegistry.abi, null, 2),
  );
  console.log("Identity ABI synced from memory!");

  fs.writeFileSync(
    targetRelayAbiPath,
    JSON.stringify(RelayRegistry.abi, null, 2),
  );
  console.log("Relay ABI synced from memory!");

  if (fs.existsSync(targetEnvPath)) {
    let envContent = fs.readFileSync(targetEnvPath, "utf8");

    envContent = envContent.replace(
      /CONTRACT_ADDRESS=.*/g,
      `CONTRACT_ADDRESS="${identityInstance.address}"`,
    );

    if (envContent.match(/RELAY_REGISTRY_ADDRESS=.*/)) {
      envContent = envContent.replace(
        /RELAY_REGISTRY_ADDRESS=.*/g,
        `RELAY_REGISTRY_ADDRESS="${relayInstance.address}"`,
      );
    } else {
      envContent += `\nRELAY_REGISTRY_ADDRESS="${relayInstance.address}"`;
    }

    fs.writeFileSync(targetEnvPath, envContent);
    console.log("Contract addresses updated in .env!");
  }
};
