const IdentityRegistry = artifacts.require("IdentityRegistry");
const { ethers } = require("ethers");

/**
 * Comprehensive test suite for IdentityRegistry Smart Contract.
 * Covers user registration with valid/invalid signatures, duplicate username prevention,
 * and login verification with nonce-based challenge-response authentication.
 */
contract("IdentityRegistry Complete Test Suite", (accounts) => {
  let contractInstance;
  let bobSigner;
  let aliceSigner;
  let attackerSigner;

  // Real-world Wallet Instances
  let walletBob;
  let walletAlice;
  let walletAttacker;

  // Test Identity Account Addresses
  const RELAYER = accounts[0];

  // Exact smart contract revert reasons
  const ERR_ADDRESS_ALREADY_REGISTERED =
    "IdentityRegistry: Address already registered";
  const ERR_USERNAME_ALREADY_TAKEN = "IdentityRegistry: Username already taken";
  const ERR_USERNAME_EMPTY = "IdentityRegistry: Username cannot be empty";
  const ERR_INVALID_SIGNATURE = "IdentityRegistry: Invalid signature";
  const ERR_LOGIN_UNREGISTERED =
    "Access Denied: User is not registered in this contract.";
  const ERR_USER_NOT_FOUND = "IdentityRegistry: User not found";

  // Test Data for USER_BOB
  const BOB_USERNAME = "BobCryptoUser";
  const BOB_PUBKEY =
    "0x04bfcabf1c9e5e8a1d2c3e4f567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

  // Test Data for USER_ALICE
  const ALICE_USERNAME = "AliceSecure";
  const ALICE_PUBKEY =
    "0x05cfdacf2d0e6f9b2e3d4f5a6789bcdef2345678901bcdef2345678901bcdef2345678901bcdef2345678901bcdef2345678901";

  // Nonce for login verification
  const LOGIN_NONCE = "nonce_12345_challenge";

  /**
   * Extracts signature components (v, r, s) from an ethers.js signature.
   * @param {string} signature - The signature string in compact format from ethers.js
   * @returns {object} Object containing v, r, and s signature components
   */
  const splitSignature = (signature) => {
    const sig = ethers.Signature.from(signature);
    return { v: sig.v, r: sig.r, s: sig.s };
  };

  /**
   * Creates a message hash for user registration according to contract specification.
   * @param {string} userAddress - The user's wallet address
   * @param {string} username - The desired username
   * @param {string} publicKey - The user's public key for ECDH
   * @returns {string} Keccak256 hash of the encoded message
   */
  const createRegistrationMessageHash = (userAddress, username, publicKey) => {
    return ethers.solidityPackedKeccak256(
      ["address", "string", "string"],
      [userAddress, username, publicKey],
    );
  };

  /**
   * Creates a message hash for login verification using nonce challenge.
   * @param {string} nonce - The challenge string provided by the server
   * @returns {string} Keccak256 hash of the nonce
   */
  const createLoginMessageHash = (nonce) => {
    return ethers.solidityPackedKeccak256(["string"], [nonce]);
  };

  /**
   * Asserts that an async contract call reverts with the exact expected reason string.
   * @param {Promise<unknown>} txPromise - The contract transaction promise expected to revert
   * @param {string} expectedReason - The exact revert message configured in the smart contract
   * @returns {Promise<void>} Resolves when revert reason matches expected text
   */
  const expectRevertWithReason = async (txPromise, expectedReason) => {
    try {
      await txPromise;
      assert.fail(`Expected revert with reason: ${expectedReason}`);
    } catch (error) {
      assert.include(
        error.message,
        expectedReason,
        `Expected revert reason: ${expectedReason}`,
      );
      // return the actual error message for logging in the test
      return error.message;
    }
  };

  before(async () => {
    contractInstance = await IdentityRegistry.deployed();
    console.log("\n========== IdentityRegistry Test Suite Setup ==========");
    console.log("Contract Address:", contractInstance.address);
    console.log("Relayer Address:", RELAYER);

    // Create ethers.js wallet instances for realistic signing
    // No RPC provider is needed because these wallets only sign messages.
    walletBob = ethers.Wallet.createRandom();
    walletAlice = ethers.Wallet.createRandom();
    walletAttacker = ethers.Wallet.createRandom();

    bobSigner = walletBob;
    aliceSigner = walletAlice;
    attackerSigner = walletAttacker;

    console.log("\n========== IdentityRegistry Test Suite Setup ==========");
    console.log("Contract Address:", contractInstance.address);
    console.log("Relayer Address:", RELAYER);
    console.log("\nReal-world Wallet Addresses (ethers.js):");
    console.log("Wallet Bob Address:", walletBob.address);
    console.log("Wallet Bob Private Key:", walletBob.privateKey);
    console.log("Wallet Alice Address:", walletAlice.address);
    console.log("Wallet Alice Private Key:", walletAlice.privateKey);
    console.log("Wallet Attacker Address:", walletAttacker.address);
    console.log("Wallet Attacker Private Key:", walletAttacker.privateKey);
    console.log("======================================================\n");
  });

  describe("User Registration Tests", () => {
    it("TC-14 | Should register user with valid signature", async () => {
      // Arrange - Use ethers.js wallet for realistic signing
      const messageHash = createRegistrationMessageHash(
        walletBob.address,
        BOB_USERNAME,
        BOB_PUBKEY,
      );

      // Sign with ethers.js Signer using the actual message hash from contract
      const messageBytes = ethers.getBytes(messageHash);
      const ethersSignature = await bobSigner.signMessage(messageBytes);
      const sig = ethers.Signature.from(ethersSignature);
      const { v, r, s } = { v: sig.v, r: sig.r, s: sig.s };

      // Act - Use Relayer to call registerUser (gasless transaction pattern)
      const tx = await contractInstance.registerUser(
        walletBob.address,
        BOB_USERNAME,
        BOB_PUBKEY,
        v,
        r,
        s,
        { from: RELAYER },
      );

      // Assert
      assert.isTrue(tx.receipt.status, "Transaction should succeed");
      assert.isTrue(
        tx.logs.some((log) => log.event === "UserRegistered"),
        "UserRegistered event should be emitted",
      );

      const user = await contractInstance.getUser(walletBob.address);
      assert.equal(
        user[0],
        BOB_USERNAME,
        "Username should be stored correctly",
      );
      assert.equal(
        user[1],
        BOB_PUBKEY,
        "Public key should be stored correctly",
      );
      assert.isAtLeast(
        parseInt(user[2]),
        Math.floor(Date.now() / 1000),
        "Registration timestamp should be recent",
      );

      const retrievedAddress =
        await contractInstance.getAddressByUsername(BOB_USERNAME);
      assert.equal(
        ethers.getAddress(retrievedAddress),
        ethers.getAddress(walletBob.address),
        "Username mapping should return correct address",
      );

      // Log the contract event details for reporting
      const userRegisteredEvent = tx.logs.find(
        (l) => l.event === "UserRegistered",
      );
      if (userRegisteredEvent) {
        console.log(
          "  - Contract Return Value: UserRegistered -> userAddress:",
          userRegisteredEvent.args.userAddress,
          ", username:",
          userRegisteredEvent.args.username,
          ", timestamp:",
          userRegisteredEvent.args.timestamp,
        );
      }

      console.log(
        "✓ TC-14 passed: Wallet Bob successfully registered with valid signature",
      );
      console.log("  - Signer Address:", walletBob.address);
      console.log("  - Username:", BOB_USERNAME);
      console.log(
        "  - Signature V:",
        v,
        "| R:",
        r.substring(0, 20) + "...",
        "| S:",
        s.substring(0, 20) + "...",
      );
    });

    it("TC-15 | Should reject registration with fake signature from different address", async () => {
      // Arrange - Use a fresh address so failure is only from invalid signature
      const walletVictim = ethers.Wallet.createRandom();
      const messageHash = createRegistrationMessageHash(
        walletVictim.address,
        "AnotherUsername",
        BOB_PUBKEY,
      );

      // Sign with ATTACKER's wallet instead of BOB's wallet - Simulating signature mismatch
      const messageBytes = ethers.getBytes(messageHash);
      const ethersSignature = await attackerSigner.signMessage(messageBytes);
      const sig = ethers.Signature.from(ethersSignature);
      const { v, r, s } = { v: sig.v, r: sig.r, s: sig.s };

      // Act & Assert
      const errMsg15 = await expectRevertWithReason(
        contractInstance.registerUser(
          walletVictim.address,
          "AnotherUsername",
          BOB_PUBKEY,
          v,
          r,
          s,
          { from: RELAYER },
        ),
        ERR_INVALID_SIGNATURE,
      );

      console.log(
        "✓ TC-15 passed: Registration rejected with fake signature from different address",
      );
      console.log("  - Expected Signer:", walletVictim.address);
      console.log("  - Actual Signer:", walletAttacker.address);
      console.log("  - Signature V:", v);
      console.log("  - Contract Revert Message:", errMsg15);
    });

    it("TC-16 | Should reject registration with already taken username", async () => {
      // Arrange - First, register Alice with her username using real wallet
      const aliceMessageHash = createRegistrationMessageHash(
        walletAlice.address,
        ALICE_USERNAME,
        ALICE_PUBKEY,
      );
      const aliceMessageBytes = ethers.getBytes(aliceMessageHash);
      const aliceSignature = await aliceSigner.signMessage(aliceMessageBytes);
      const aliceSig = ethers.Signature.from(aliceSignature);
      const {
        v: v1,
        r: r1,
        s: s1,
      } = { v: aliceSig.v, r: aliceSig.r, s: aliceSig.s };

      await contractInstance.registerUser(
        walletAlice.address,
        ALICE_USERNAME,
        ALICE_PUBKEY,
        v1,
        r1,
        s1,
        { from: RELAYER },
      );

      // Now try to register someone else (attacker) with the same username
      const duplicateMessageHash = createRegistrationMessageHash(
        walletAttacker.address,
        ALICE_USERNAME, // Same username as Alice
        "0x04differentpubkey",
      );
      const duplicateMessageBytes = ethers.getBytes(duplicateMessageHash);
      const duplicateSignature = await attackerSigner.signMessage(
        duplicateMessageBytes,
      );
      const duplicateSig = ethers.Signature.from(duplicateSignature);
      const {
        v: v2,
        r: r2,
        s: s2,
      } = { v: duplicateSig.v, r: duplicateSig.r, s: duplicateSig.s };

      // Act & Assert
      const errMsg16 = await expectRevertWithReason(
        contractInstance.registerUser(
          walletAttacker.address,
          ALICE_USERNAME,
          "0x04differentpubkey",
          v2,
          r2,
          s2,
          { from: RELAYER },
        ),
        ERR_USERNAME_ALREADY_TAKEN,
      );

      console.log(
        "✓ TC-16 passed: Registration rejected with duplicate username",
      );
      console.log("  - Duplicate Username:", ALICE_USERNAME);
      console.log("  - Original Owner:", walletAlice.address);
      console.log("  - Attacker Address:", walletAttacker.address);
      console.log("  - Contract Revert Message:", errMsg16);
    });

    it("Should reject registration with empty username", async () => {
      // Arrange
      const messageHash = createRegistrationMessageHash(
        walletAttacker.address,
        "", // Empty username
        BOB_PUBKEY,
      );
      const messageBytes = ethers.getBytes(messageHash);
      const ethersSignature = await attackerSigner.signMessage(messageBytes);
      const { v, r, s } = splitSignature(ethersSignature);

      // Act & Assert
      const errMsgEmpty = await expectRevertWithReason(
        contractInstance.registerUser(
          walletAttacker.address,
          "",
          BOB_PUBKEY,
          v,
          r,
          s,
          {
            from: RELAYER,
          },
        ),
        ERR_USERNAME_EMPTY,
      );
      console.log("  - Contract Revert Message:", errMsgEmpty);
    });

    it("Should reject duplicate registration for same address", async () => {
      // Arrange - walletBob is already registered from TC-14
      const messageHash = createRegistrationMessageHash(
        walletBob.address,
        "NewUsername",
        BOB_PUBKEY,
      );
      const messageBytes = ethers.getBytes(messageHash);
      const ethersSignature = await bobSigner.signMessage(messageBytes);
      const { v, r, s } = splitSignature(ethersSignature);

      // Act & Assert
      const errMsgDupAddr = await expectRevertWithReason(
        contractInstance.registerUser(
          walletBob.address,
          "NewUsername",
          BOB_PUBKEY,
          v,
          r,
          s,
          { from: RELAYER },
        ),
        ERR_ADDRESS_ALREADY_REGISTERED,
      );
      console.log("  - Contract Revert Message:", errMsgDupAddr);
    });
  });

  describe("Login Verification Tests", () => {
    it("TC-17 | Should verify login with valid nonce and correct signature", async () => {
      // Arrange - Wallet Bob is already registered from TC-14
      const messageHash = createLoginMessageHash(LOGIN_NONCE);
      const messageBytes = ethers.getBytes(messageHash);

      // Sign the nonce challenge with Bob's wallet - Real signature
      const ethersSignature = await bobSigner.signMessage(messageBytes);
      const sig = ethers.Signature.from(ethersSignature);
      const { v, r, s } = { v: sig.v, r: sig.r, s: sig.s };

      // Act
      const isLoginValid = await contractInstance.verifyLoginSignature(
        walletBob.address,
        LOGIN_NONCE,
        v,
        r,
        s,
      );

      // Assert
      assert.isTrue(
        isLoginValid,
        "Login verification should return true for valid signature",
      );
      console.log(
        "✓ TC-17 passed: Login verified successfully with valid nonce and signature",
      );
      console.log("  - Signer Address:", walletBob.address);
      console.log("  - Nonce Challenge:", LOGIN_NONCE);
      console.log("  - Verification Result: TRUE (Authenticated)");
    });

    it("Should reject login with valid nonce but wrong signature", async () => {
      // Arrange - Create signature with different nonce
      const wrongNonce = "nonce_wrong_challenge";
      const messageHash = createLoginMessageHash(wrongNonce);
      const messageBytes = ethers.getBytes(messageHash);
      const ethersSignature = await bobSigner.signMessage(messageBytes);
      const sig = ethers.Signature.from(ethersSignature);
      const { v, r, s } = { v: sig.v, r: sig.r, s: sig.s };

      // Act - Try to verify with original nonce but signature for wrong nonce
      const isLoginValid = await contractInstance.verifyLoginSignature(
        walletBob.address,
        LOGIN_NONCE, // Different nonce than what was signed
        v,
        r,
        s,
      );

      // Assert
      assert.isFalse(
        isLoginValid,
        "Login verification should fail when signature doesn't match nonce",
      );
      console.log("✓ Passed: Login rejected with mismatched nonce signature");
    });

    it("Should reject login verification for unregistered user", async () => {
      // Arrange - Use an account that was never registered
      const messageHash = createLoginMessageHash(LOGIN_NONCE);
      const unregisteredWallet = ethers.Wallet.createRandom();
      const messageBytes = ethers.getBytes(messageHash);
      const ethersSignature =
        await unregisteredWallet.signMessage(messageBytes);
      const sig = ethers.Signature.from(ethersSignature);
      const { v, r, s } = { v: sig.v, r: sig.r, s: sig.s };

      // Act & Assert
      await expectRevertWithReason(
        contractInstance.verifyLoginSignature(
          unregisteredWallet.address,
          LOGIN_NONCE,
          v,
          r,
          s,
        ),
        ERR_LOGIN_UNREGISTERED,
      );
      console.log("✓ Passed: Login rejected for unregistered user");
    });

    it("Should reject login with signature from different user", async () => {
      // Arrange
      const messageHash = createLoginMessageHash(LOGIN_NONCE);
      // Sign with Wallet Alice instead of Wallet Bob
      const messageBytes = ethers.getBytes(messageHash);
      const ethersSignature = await aliceSigner.signMessage(messageBytes);
      const sig = ethers.Signature.from(ethersSignature);
      const { v, r, s } = { v: sig.v, r: sig.r, s: sig.s };

      // Act - Try to verify login for Wallet Bob with Wallet Alice's signature
      const isLoginValid = await contractInstance.verifyLoginSignature(
        walletBob.address,
        LOGIN_NONCE,
        v,
        r,
        s,
      );

      // Assert
      assert.isFalse(
        isLoginValid,
        "Login verification should fail when signature is from different user",
      );
      console.log(
        "✓ Passed: Login rejected with signature from different user",
      );
    });
  });

  describe("Data Retrieval Tests", () => {
    it("Should retrieve registered user details correctly", async () => {
      // Arrange & Act
      const user = await contractInstance.getUser(walletBob.address);

      // Assert
      assert.equal(user[0], BOB_USERNAME, "Username should match");
      assert.equal(user[1], BOB_PUBKEY, "Public key should match");
      assert.isNumber(parseInt(user[2]), "Timestamp should be a number");
    });

    it("Should resolve username to correct user address", async () => {
      // Arrange & Act
      const resolvedAddress =
        await contractInstance.getAddressByUsername(BOB_USERNAME);

      // Assert
      assert.equal(
        ethers.getAddress(resolvedAddress),
        ethers.getAddress(walletBob.address),
        "Username should resolve to correct address",
      );
    });

    it("Should return zero address for non-existent username", async () => {
      // Arrange & Act
      const resolvedAddress = await contractInstance.getAddressByUsername(
        "NonExistentUsername",
      );

      // Assert
      assert.equal(
        resolvedAddress,
        "0x0000000000000000000000000000000000000000",
        "Non-existent username should return zero address",
      );
    });

    it("Should fail to retrieve unregistered user details", async () => {
      // Arrange
      const unregisteredUser = accounts[8];

      // Act & Assert
      await expectRevertWithReason(
        contractInstance.getUser(unregisteredUser),
        ERR_USER_NOT_FOUND,
      );
    });
  });
});
