export const MY_AVATAR_STORAGE_KEY = "my_avatar";

/**
 * Reads persisted avatar data URL from storage.
 *
 * @returns {string | null} Stored avatar payload.
 */
export const getStoredAvatar = (): string | null =>
  localStorage.getItem(MY_AVATAR_STORAGE_KEY);

/**
 * Persists avatar data URL into storage.
 *
 * @param {string} avatarDataUrl - Cropped avatar payload.
 * @returns {void}
 */
export const setStoredAvatar = (avatarDataUrl: string): void => {
  localStorage.setItem(MY_AVATAR_STORAGE_KEY, avatarDataUrl);
};

/**
 * Reads a file as base64 data URL.
 *
 * @param {File} file - Selected file.
 * @returns {Promise<string>} Data URL result.
 */
export const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve((event.target?.result as string) || "");
    reader.onerror = () => reject(new Error("Failed to read selected file."));
    reader.readAsDataURL(file);
  });
};
