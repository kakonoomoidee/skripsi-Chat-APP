/**
 * Copies text to clipboard using secure-context API with a DOM fallback.
 *
 * @param {string} text - Text to copy.
 * @returns {Promise<void>} Completion promise.
 */
export const copyTextWithFallback = async (text: string): Promise<void> => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
};
