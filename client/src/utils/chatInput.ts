import ms from "ms";

export const DOCUMENT_MAX_SIZE_BYTES = 1024 * 1024;
export const RECORDING_TIMER_TICK_MS = ms("1s");
export const WALLET_LINK_CHECK_INTERVAL_MS = ms("1500ms");

const SAFE_FILE_SIGNATURES = [
  "25504446",
  "504b34",
  "89504e47",
  "ffd8ffe0",
  "ffd8ffe1",
  "ffd8ffe2",
];

/**
 * Evaluates file signatures for supported safe document and image formats.
 *
 * @param {File} file - Uploaded file instance.
 * @returns {Promise<boolean>} True if signature or MIME type is allowed.
 */
export const isFileSignatureSafe = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onloadend = (event) => {
      if (!event.target || !event.target.result) {
        resolve(false);
        return;
      }

      const bytes = new Uint8Array(event.target.result as ArrayBuffer).subarray(
        0,
        4,
      );
      let header = "";

      for (let index = 0; index < bytes.length; index += 1) {
        header += bytes[index].toString(16);
      }

      const normalizedHeader = header.toLowerCase();
      const isKnownSignature = SAFE_FILE_SIGNATURES.some((signature) =>
        normalizedHeader.startsWith(signature),
      );

      resolve(isKnownSignature || file.type.startsWith("text/"));
    };

    reader.readAsArrayBuffer(file.slice(0, 4));
  });
};
