/**
 * Builds a consistent uppercase initial for usernames and labels.
 *
 * @param {string | null | undefined} value - Source text value.
 * @param {string} fallback - Fallback character when input is missing.
 * @returns {string} Uppercase initial character.
 */
export const getDisplayInitial = (
  value: string | null | undefined,
  fallback = "?",
): string => {
  if (!value) return fallback;
  return value.charAt(0).toUpperCase();
};
