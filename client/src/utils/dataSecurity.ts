export const AUTO_BACKUP_MODE_STORAGE_KEY = "securep2p_auto_backup_mode";

export const DELETE_OPTIONS = [
  { value: "never", label: "Auto-Delete: Never" },
  { value: "30", label: "Delete Older than 30 Days" },
  { value: "7", label: "Delete Older than 7 Days" },
  { value: "3", label: "Delete Older than 3 Days" },
  { value: "1", label: "Delete Older than 24 Hours" },
  { value: "close", label: "Burn on Close (Incognito)" },
];

export const BACKUP_OPTIONS = [
  { value: "never", label: "Auto-Backup: Never" },
  { value: "1", label: "Daily (Every 24 Hours)" },
  { value: "3", label: "Every 3 Days" },
  { value: "7", label: "Weekly (Every 7 Days)" },
  { value: "30", label: "Monthly (Every 30 Days)" },
];

/**
 * Reads persisted auto-backup mode.
 *
 * @returns {string} Backup mode value.
 */
export const getStoredAutoBackupMode = (): string =>
  localStorage.getItem(AUTO_BACKUP_MODE_STORAGE_KEY) || "never";

/**
 * Persists auto-backup mode in storage.
 *
 * @param {string} mode - Backup mode.
 * @returns {void}
 */
export const setStoredAutoBackupMode = (mode: string): void => {
  localStorage.setItem(AUTO_BACKUP_MODE_STORAGE_KEY, mode);
};

/**
 * Returns option label for a selected dropdown value.
 *
 * @param {{ value: string; label: string }[]} options - Dropdown options.
 * @param {string} value - Selected value.
 * @returns {string | undefined} Matching label.
 */
export const findOptionLabel = (
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
): string | undefined => options.find((option) => option.value === value)?.label;
