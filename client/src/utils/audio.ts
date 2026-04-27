import ms from "ms";

export const AUDIO_METADATA_DELAY_MS = ms("200ms");

/**
 * Formats audio duration in seconds to m:ss.
 *
 * @param {number} time - Duration in seconds.
 * @returns {string} Human-readable duration string.
 */
export const formatAudioDuration = (time: number): string => {
  if (!time || Number.isNaN(time) || time === Infinity) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

/**
 * Creates pseudo waveform bars for visual audio progress rendering.
 *
 * @param {number} barsCount - Number of bars to generate.
 * @param {number} minHeight - Minimum bar height.
 * @param {number} maxHeight - Maximum bar height.
 * @returns {number[]} Waveform bar heights.
 */
export const generateWaveformHeights = (
  barsCount: number,
  minHeight = 6,
  maxHeight = 18,
): number[] =>
  Array.from({ length: barsCount }, () =>
    Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight),
  );
