/**
 * Generates a clean preview string for a message payload, handling different content types.
 * Parses message structure to identify images, documents, crypto transfers, and audio,
 * returning appropriate labels or truncated text.
 *
 * @param {string} messageText - The raw or encrypted message text payload.
 * @returns {string} A clean preview string suitable for display in chat lists.
 */
export const getMessagePreview = (messageText: string): string => {
  if (!messageText || messageText.trim() === "") {
    return "Empty message";
  }

  const trimmedText = messageText.trim();

  if (trimmedText.startsWith("data:image/")) {
    return "Photo";
  }

  if (trimmedText.startsWith("[AUDIO]")) {
    return "Voice Message";
  }

  if (
    trimmedText.startsWith("[SENT]") ||
    trimmedText.startsWith("[RECEIVED]")
  ) {
    return "Crypto Transfer";
  }

  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(trimmedText);
  } catch {
    return truncateText(trimmedText);
  }

  if (!parsedPayload || typeof parsedPayload !== "object") {
    return truncateText(trimmedText);
  }

  const payload = parsedPayload as Record<string, unknown>;

  if (payload.type === "DOCUMENT") {
    return "Document Attachment";
  }

  if (payload.type === "TX_SUCCESS") {
    return (
      "Crypto Transfer" +
      (typeof payload.amount === "string" ? `: ${payload.amount}` : "")
    );
  }

  if (payload.isImage === true) {
    return "Photo";
  }

  if (typeof payload.text === "string") {
    return truncateText(payload.text);
  }

  return truncateText(trimmedText);
};

/**
 * Truncates text to a maximum length with ellipsis.
 * Preserves word boundaries where possible.
 *
 * @param {string} text - The text to truncate.
 * @param {number} maxLength - Maximum character count (default 60).
 * @returns {string} Truncated text with ellipsis if needed.
 */
export const truncateText = (text: string, maxLength: number = 60): string => {
  const trimmed = text.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  const truncated = trimmed.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength - 20) {
    return truncated.slice(0, lastSpace) + "...";
  }

  return truncated + "...";
};
