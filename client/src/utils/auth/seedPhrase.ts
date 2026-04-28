import ms from "ms";

export const MAX_SEED_PHRASE_WORDS = 12;
export const SEED_MODAL_PROCEED_DELAY_MS = ms("1500ms");

/**
 * Splits a phrase value into normalized words.
 *
 * @param {string} value - Raw phrase value.
 * @returns {string[]} Normalized seed words.
 */
export const getSeedWords = (value: string): string[] =>
  value.trim().split(/\s+/).filter(Boolean);

/**
 * Calculates current seed phrase progress against required word count.
 *
 * @param {string} value - Raw phrase value.
 * @returns {{ wordCount: number; isComplete: boolean }} Progress summary.
 */
export const getSeedPhraseProgress = (value: string) => {
  const wordCount = getSeedWords(value).length;
  return {
    wordCount,
    isComplete: wordCount === MAX_SEED_PHRASE_WORDS,
  };
};

/**
 * Sanitizes and limits seed phrase input to alphabetic characters and 12 words.
 *
 * @param {string} rawValue - Incoming textarea value.
 * @param {string} previousValue - Previous controlled value.
 * @returns {string} Next valid value.
 */
export const processSeedPhraseInput = (
  rawValue: string,
  previousValue: string,
): string => {
  let sanitizedValue = rawValue.replace(/[^a-zA-Z\s]/g, "");
  sanitizedValue = sanitizedValue.replace(/\s+/g, " ");

  if (sanitizedValue.length < previousValue.length) return sanitizedValue;

  const newWords = getSeedWords(sanitizedValue);

  if (
    newWords.length > MAX_SEED_PHRASE_WORDS ||
    (newWords.length === MAX_SEED_PHRASE_WORDS && sanitizedValue.endsWith(" "))
  ) {
    return newWords.slice(0, MAX_SEED_PHRASE_WORDS).join(" ");
  }

  return sanitizedValue;
};
