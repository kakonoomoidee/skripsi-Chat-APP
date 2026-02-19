/**
 * Memotong Wallet Address biar enak dilihat
 * Contoh: 0x1234567890abcdef -> 0x1234...cdef
 */
export const shortenAddress = (address) => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Format Timestamp jadi Jam yang bisa dibaca manusia
 * Contoh: 1678899 -> 14:30
 */
export const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
