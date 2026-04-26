const LAST_CHAT_EXPORT_TIME_KEY = "last_chat_export_time";

/**
 * Persists the current timestamp as the latest successful chat export time.
 *
 * @returns {void}
 */
export const updateLastExportTime = (): void => {
  localStorage.setItem(LAST_CHAT_EXPORT_TIME_KEY, Date.now().toString());
};

/**
 * Reads the latest successful chat export timestamp from localStorage.
 *
 * @returns {number} The parsed timestamp in milliseconds, or 0 when unavailable.
 */
export const getLastExportTime = (): number => {
  const rawValue = localStorage.getItem(LAST_CHAT_EXPORT_TIME_KEY);
  if (!rawValue) return 0;
  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsedValue) ? 0 : parsedValue;
};
