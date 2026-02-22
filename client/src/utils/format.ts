/**
 * cut addres to be short and readable
 * example : 0x1234567890abcdef -> 0x1234...cdef
 */
export const shortenAddress = (address: string | null | undefined): string => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * format timestamp to human-readable time (HH:mm)
 * example : 1678899 -> 14:30
 */
export const formatTime = (
  timestamp: number | string | null | undefined,
): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
