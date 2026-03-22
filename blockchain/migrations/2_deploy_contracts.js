const fs = require("fs");
const path = require("path");

const IdentityRegistry = artifacts.require("IdentityRegistry");
const RelayRegistry = artifacts.require("RelayRegistry");

/**
 * Deploys Identity and Relay Registry contracts, synchronizes ABIs, and updates environment variables.
 * Defers all deployment logs to the end of the execution stream for a cleaner CLI output format.
 *
 * @param {object} deployer - The Truffle deployer object.
 * @returns {Promise<void>}
 */
module.exports = async function (deployer) {
  await deployer.deploy(IdentityRegistry);
  const identityInstance = await IdentityRegistry.deployed();

  await deployer.deploy(RelayRegistry);
  const relayInstance = await RelayRegistry.deployed();

  const relayServerRootPath = path.join(__dirname, "../../relay-server");
  const abisFolderPath = path.join(relayServerRootPath, "abis");

  if (!fs.existsSync(abisFolderPath)) {
    fs.mkdirSync(abisFolderPath, { recursive: true });
  }

  const targetIdentityAbiPath = path.join(abisFolderPath, "identity_abi.json");
  const targetRelayAbiPath = path.join(
    abisFolderPath,
    "relay_registry_abi.json",
  );
  const targetEnvPath = path.join(relayServerRootPath, ".env");

  fs.writeFileSync(
    targetIdentityAbiPath,
    JSON.stringify(IdentityRegistry.abi, null, 2),
  );

  fs.writeFileSync(
    targetRelayAbiPath,
    JSON.stringify(RelayRegistry.abi, null, 2),
  );

  let isEnvUpdated = false;
  let envWarningMsg = "";

  if (fs.existsSync(targetEnvPath)) {
    let envContent = fs.readFileSync(targetEnvPath, "utf8");

    if (envContent.match(/CONTRACT_ADDRESS=.*/)) {
      envContent = envContent.replace(
        /CONTRACT_ADDRESS=.*/g,
        `CONTRACT_ADDRESS="${identityInstance.address}"`,
      );
    } else {
      envContent += `\nCONTRACT_ADDRESS="${identityInstance.address}"`;
    }

    if (envContent.match(/RELAY_REGISTRY_ADDRESS=.*/)) {
      envContent = envContent.replace(
        /RELAY_REGISTRY_ADDRESS=.*/g,
        `RELAY_REGISTRY_ADDRESS="${relayInstance.address}"`,
      );
    } else {
      envContent += `\nRELAY_REGISTRY_ADDRESS="${relayInstance.address}"`;
    }

    fs.writeFileSync(targetEnvPath, envContent);
    isEnvUpdated = true;
  } else {
    envWarningMsg = `[Deployer Warning] Environment file not found at path: ${targetEnvPath}`;
  }

  console.log("\n========================================================");
  console.log("[Deployer] POST-DEPLOYMENT SYNCHRONIZATION SUMMARY");
  console.log("========================================================");
  console.log(
    `[Deployer] IdentityRegistry Address : ${identityInstance.address}`,
  );
  console.log(`[Deployer] RelayRegistry Address    : ${relayInstance.address}`);
  console.log(`[Deployer] Identity ABI             : Synchronized`);
  console.log(`[Deployer] Relay ABI                : Synchronized`);

  if (isEnvUpdated) {
    console.log(`[Deployer] Environment Variables    : Updated Successfully`);
  } else {
    console.warn(envWarningMsg);
  }
  console.log("========================================================\n");
};
