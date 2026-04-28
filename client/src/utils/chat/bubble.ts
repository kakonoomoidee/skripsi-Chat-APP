export interface ReplyTarget {
  id: string | number;
  text: string;
  isMine: boolean;
  timestamp: number;
}

export interface ReplySourceMessage {
  id: string | number;
  isMine: boolean;
  timestamp: number | string | null | undefined;
}

/**
 * Normalizes message timestamps into a numeric epoch value.
 *
 * @param {number | string | null | undefined} timestamp - Source timestamp value.
 * @returns {number} Numeric timestamp suitable for `ReplyMessage`.
 */
export const normalizeReplyTimestamp = (
  timestamp: number | string | null | undefined,
): number => {
  if (typeof timestamp === "number" && Number.isFinite(timestamp)) {
    return timestamp;
  }

  if (typeof timestamp === "string") {
    const numericTimestamp = Number(timestamp);
    if (Number.isFinite(numericTimestamp)) return numericTimestamp;

    const parsedTimestamp = Date.parse(timestamp);
    if (!Number.isNaN(parsedTimestamp)) return parsedTimestamp;
  }

  return Date.now();
};

/**
 * Creates a normalized reply payload for the session store.
 *
 * @param {ReplySourceMessage} msg - Source message metadata.
 * @param {string} text - Preview text shown in the reply bar.
 * @returns {ReplyTarget} Reply payload for `setReplyingTo`.
 */
export const createReplyTarget = (
  msg: ReplySourceMessage,
  text: string,
): ReplyTarget => ({
  id: msg.id,
  text,
  isMine: msg.isMine,
  timestamp: normalizeReplyTimestamp(msg.timestamp),
});

/**
 * Returns whether a DOM event target occurred outside a container element.
 *
 * @param {HTMLElement | null} element - Container element reference.
 * @param {EventTarget | null} target - Event target to evaluate.
 * @returns {boolean} True when target is outside container.
 */
export const isEventOutsideElement = (
  element: HTMLElement | null,
  target: EventTarget | null,
): boolean => {
  if (!element || !(target instanceof Node)) return false;
  return !element.contains(target);
};

/**
 * Returns whether pressing a keyboard key should close bubble menus.
 *
 * @param {string} key - Keyboard event key value.
 * @returns {boolean} True if key should close menus.
 */
export const shouldCloseMenuOnEscape = (key: string): boolean =>
  key === "Escape";
