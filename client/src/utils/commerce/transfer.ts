import ms from "ms";

export const TRANSFER_REQUEST_TIMEOUT_MS = ms("8s");

export interface TransferValidationResult {
  isInvalidAmount: boolean;
  isInsufficientFunds: boolean;
  isDisabled: boolean;
}

/**
 * Ensures sender and receiver addresses are different before transfer execution.
 *
 * @param {string | null | undefined} senderAddress - Transaction sender wallet address.
 * @param {string} receiverAddress - Transaction receiver wallet address.
 * @returns {void} Returns nothing. Throws when sender and receiver are identical.
 */
export const assertSelfTransferAllowed = (
  senderAddress: string | null | undefined,
  receiverAddress: string,
): void => {
  if (!senderAddress) {
    return;
  }

  if (senderAddress.toLowerCase() === receiverAddress.toLowerCase()) {
    throw new Error(
      "Self-Transfer Blocked. You cannot send crypto to yourself.",
    );
  }
};

/**
 * Validates transfer amount and compares it against available balance.
 *
 * @param {string} transferAmount - Input amount in ETH.
 * @param {string | null} currentBalance - Active wallet balance in ETH.
 * @returns {TransferValidationResult} Validation flags for transfer submission.
 */
export const getTransferValidationState = (
  transferAmount: string,
  currentBalance: string | null,
): TransferValidationResult => {
  const numericAmount = Number(transferAmount);
  const numericBalance = Number(currentBalance);

  const isInvalidAmount =
    !transferAmount || Number.isNaN(numericAmount) || numericAmount <= 0;
  const isInsufficientFunds =
    currentBalance !== null && numericAmount > numericBalance;

  return {
    isInvalidAmount,
    isInsufficientFunds,
    isDisabled: isInvalidAmount || isInsufficientFunds,
  };
};

/**
 * Estimated gas fee for P2P crypto transfers (in ETH).
 * Used to prevent sending full balance and leaving no funds for gas costs.
 */
export const ESTIMATED_GAS_ETH = 0.001;

export interface P2PTransferValidationResult {
  isInvalidAmount: boolean;
  isInsufficientFunds: boolean;
  isDisabled: boolean;
  safeMax: number;
}

/**
 * Computes safe maximum transfer amount after gas reservation.
 *
 * @param {number} currentBalance - Current wallet balance.
 * @param {number} estimatedGas - Reserved gas fee.
 * @returns {number} Safe maximum transferable amount.
 */
export const getSafeMaxTransfer = (
  currentBalance: number,
  estimatedGas: number,
): number => Math.max(0, currentBalance - estimatedGas);

/**
 * Validates P2P transfer amount accounting for gas fees and balance.
 * Prevents self-transfers and ensures sufficient funds for transaction + gas.
 *
 * @param {string} transferAmount - Input amount in ETH.
 * @param {string | null} currentBalance - Active wallet balance in ETH.
 * @param {number} estimatedGas - Reserved gas fee in ETH.
 * @returns {P2PTransferValidationResult} Validation flags including safe maximum.
 */
export const getP2PTransferValidationState = (
  transferAmount: string,
  currentBalance: string | null,
  estimatedGas: number = ESTIMATED_GAS_ETH,
): P2PTransferValidationResult => {
  const numericAmount = Number(transferAmount);
  const numericBalance = Number(currentBalance || "0");
  const safeMax = getSafeMaxTransfer(numericBalance, estimatedGas);

  const isInvalidAmount =
    !transferAmount || Number.isNaN(numericAmount) || numericAmount <= 0;
  const isInsufficientFunds = numericAmount > safeMax;

  return {
    isInvalidAmount,
    isInsufficientFunds,
    isDisabled: isInvalidAmount || isInsufficientFunds,
    safeMax,
  };
};
