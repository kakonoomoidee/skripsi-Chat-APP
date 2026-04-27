import ms from "ms";

export const CALL_DURATION_TICK_MS = ms("1s");

/**
 * Returns a safe, uppercase initial for avatar-style call UI.
 *
 * @param {string | null | undefined} username - Current peer username.
 * @returns {string} A single-character initial for display.
 */
export const getCallDisplayInitial = (
  username: string | null | undefined,
): string => {
  if (!username) return "?";
  return username.charAt(0).toUpperCase();
};
