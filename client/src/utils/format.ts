/**
 * Truncates a long cryptographic address into a shorter, readable format for UI presentation.
 *
 * @param {string | null | undefined} address - The full wallet address.
 * @returns {string} The shortened address (e.g., 0x1234...cdef), or an empty string if invalid.
 */
export const shortenAddress = (address: string | null | undefined): string => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Converts a raw timestamp into a human-readable 24-hour time format string.
 *
 * @param {number | string | null | undefined} timestamp - The raw Unix timestamp or date string.
 * @returns {string} The formatted time string (e.g., "14:30"), or an empty string if invalid.
 */
export const formatTime = (
  timestamp: number | string | null | undefined,
): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
