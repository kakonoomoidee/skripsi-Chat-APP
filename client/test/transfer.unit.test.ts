import { describe, expect, it } from "vitest";
import { assertSelfTransferAllowed } from "../src/utils/commerce/transfer";

/**
 * Executes the self-transfer validation for a sender/receiver pair.
 *
 * @param {string} senderAddress - Wallet address of the sender.
 * @param {string} receiverAddress - Wallet address of the receiver.
 * @returns {void} Returns nothing. Throws when the transfer is invalid.
 */
const executeSelfTransferValidation = (
  senderAddress: string,
  receiverAddress: string,
): void => {
  assertSelfTransferAllowed(senderAddress, receiverAddress);
};

describe("Transfer Logic Unit Tests", () => {
  it("TC-20: should throw and halt execution when sender and receiver are identical", () => {
    const senderAddress = "0xAbC1234567890dEfABC1234567890DefABC12345";
    const receiverAddress = "0xaBc1234567890DEfAbc1234567890dEFabC12345";

    expect(() =>
      executeSelfTransferValidation(senderAddress, receiverAddress),
    ).toThrowError(
      "Self-Transfer Blocked. You cannot send crypto to yourself.",
    );
  });
});
