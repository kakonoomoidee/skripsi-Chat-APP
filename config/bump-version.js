/**
 * File Name:
 * bump-version.js
 *
 * Save in:
 * apps/config/bump-version.js
 *
 * Usage:
 * node bump-version.js patch
 * node bump-version.js minor
 * node bump-version.js major
 *
 * Example:
 * 1.10.0 + patch = 1.10.1
 * 1.10.0 + minor = 1.11.0
 * 1.10.0 + major = 2.0.0
 *
 * This script will:
 * 1. Read current version from blockchain/package.json
 * 2. Increase version
 * 3. Update all package.json files
 * 4. Run npm install in each folder
 * 5. Git add .
 * 6. Git commit -m "core: update old -> new"
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// =====================================
// CONFIG
// =====================================
const ROOT = path.resolve(__dirname, "..");

const apps = [
  "blockchain",
  "client",
  "relay-server"
];

const type = process.argv[2]; // patch / minor / major

// =====================================
// LOGGING
// =====================================
function log(msg) {
  console.log(`[INFO] ${msg}`);
}

function success(msg) {
  console.log(`[SUCCESS] ${msg}`);
}

function fail(msg) {
  console.log(`[ERROR] ${msg}`);
}

// =====================================
// VALIDATE ARGUMENT
// =====================================
if (!["patch", "minor", "major"].includes(type)) {
  console.log("");
  console.log("Usage:");
  console.log("node bump-version.js patch");
  console.log("node bump-version.js minor");
  console.log("node bump-version.js major");
  console.log("");
  process.exit(1);
}

// =====================================
// VERSION HELPERS
// =====================================
function bumpVersion(version, mode) {
  let [major, minor, patch] = version.split(".").map(Number);

  if (mode === "patch") {
    patch += 1;
  }

  if (mode === "minor") {
    minor += 1;
    patch = 0;
  }

  if (mode === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  }

  return `${major}.${minor}.${patch}`;
}

function getCurrentVersion() {
  const file = path.join(ROOT, "blockchain", "package.json");
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  return json.version;
}

// =====================================
// UPDATE VERSION
// =====================================
function updatePackage(appName, newVersion) {
  const file = path.join(ROOT, appName, "package.json");

  try {
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    json.version = newVersion;

    fs.writeFileSync(
      file,
      JSON.stringify(json, null, 2) + "\n",
      "utf8"
    );

    success(`${appName}: updated to ${newVersion}`);
  } catch (err) {
    fail(`${appName}: failed updating package.json`);
  }
}

// =====================================
// NPM INSTALL
// =====================================
function runInstall(appName) {
  try {
    log(`${appName}: npm install`);

    execSync("npm install", {
      cwd: path.join(ROOT, appName),
      stdio: "inherit"
    });

    success(`${appName}: npm install done`);
  } catch (err) {
    fail(`${appName}: npm install failed`);
  }
}

// =====================================
// GIT COMMIT
// =====================================
function gitCommit(oldVersion, newVersion) {
  const message = `core: update ${oldVersion} -> ${newVersion}`;

  try {
    log("Running git add .");
    execSync("git add .", {
      cwd: ROOT,
      stdio: "inherit"
    });

    log(`Running git commit`);
    execSync(`git commit -m "${message}"`, {
      cwd: ROOT,
      stdio: "inherit"
    });

    success(`Git commit created: ${message}`);
  } catch (err) {
    fail("Git commit failed");
  }
}

// =====================================
// MAIN
// =====================================
(async () => {
  console.log("===================================");
  console.log("AUTO VERSION BUMP STARTED");
  console.log("===================================\n");

  const oldVersion = getCurrentVersion();
  const newVersion = bumpVersion(oldVersion, type);

  log(`Version mode : ${type}`);
  log(`Old version  : ${oldVersion}`);
  log(`New version  : ${newVersion}\n`);

  for (const app of apps) {
    updatePackage(app, newVersion);
    runInstall(app);
    console.log("");
  }

  gitCommit(oldVersion, newVersion);

  console.log("\n===================================");
  success("All tasks completed");
  console.log("===================================");
})();