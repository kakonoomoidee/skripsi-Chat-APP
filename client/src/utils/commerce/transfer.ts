import ms from "ms";

export const TRANSFER_REQUEST_TIMEOUT_MS = ms("8s");

export interface TransferValidationResult {
  isInvalidAmount: boolean;
  isInsufficientFunds: boolean;
  isDisabled: boolean;
}

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
