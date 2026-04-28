export const CHAT_PROTOCOL_TYPES = {
  profileSync: "PROFILE_SYNC",
  walletRequest: "WALLET_REQUEST",
  walletResponse: "WALLET_RESPONSE",
  txSuccess: "TX_SUCCESS",
  typing: "TYPING",
} as const;

export type ChatProtocolType =
  (typeof CHAT_PROTOCOL_TYPES)[keyof typeof CHAT_PROTOCOL_TYPES];

export type ChatProtocolPayload =
  | { type: typeof CHAT_PROTOCOL_TYPES.walletRequest }
  | { type: typeof CHAT_PROTOCOL_TYPES.walletResponse; address: string }
  | { type: typeof CHAT_PROTOCOL_TYPES.profileSync; avatar: string }
  | { type: typeof CHAT_PROTOCOL_TYPES.txSuccess; hash: string }
  | { type: typeof CHAT_PROTOCOL_TYPES.typing };

const NON_RENDERABLE_PROTOCOL_TYPES = new Set<ChatProtocolType>([
  CHAT_PROTOCOL_TYPES.profileSync,
  CHAT_PROTOCOL_TYPES.walletRequest,
  CHAT_PROTOCOL_TYPES.walletResponse,
]);

export const parseChatProtocolPayload = (
  text: string,
): ChatProtocolPayload | null => {
  try {
    const parsed = JSON.parse(text) as {
      type?: unknown;
      address?: unknown;
      avatar?: unknown;
      hash?: unknown;
    };

    if (parsed.type === CHAT_PROTOCOL_TYPES.walletRequest) {
      return { type: CHAT_PROTOCOL_TYPES.walletRequest };
    }

    if (
      parsed.type === CHAT_PROTOCOL_TYPES.walletResponse &&
      typeof parsed.address === "string" &&
      parsed.address
    ) {
      return {
        type: CHAT_PROTOCOL_TYPES.walletResponse,
        address: parsed.address,
      };
    }

    if (
      parsed.type === CHAT_PROTOCOL_TYPES.profileSync &&
      typeof parsed.avatar === "string" &&
      parsed.avatar
    ) {
      return {
        type: CHAT_PROTOCOL_TYPES.profileSync,
        avatar: parsed.avatar,
      };
    }

    if (
      parsed.type === CHAT_PROTOCOL_TYPES.txSuccess &&
      typeof parsed.hash === "string" &&
      parsed.hash
    ) {
      return {
        type: CHAT_PROTOCOL_TYPES.txSuccess,
        hash: parsed.hash,
      };
    }

    if (parsed.type === CHAT_PROTOCOL_TYPES.typing) {
      return { type: CHAT_PROTOCOL_TYPES.typing };
    }

    return null;
  } catch {
    return null;
  }
};

export const isNonRenderableProtocolMessage = (text: string): boolean => {
  const normalized = text.trim();
  if (!normalized || !normalized.startsWith("{")) {
    return false;
  }

  const payload = parseChatProtocolPayload(normalized);
  if (!payload) {
    return false;
  }

  return NON_RENDERABLE_PROTOCOL_TYPES.has(payload.type);
};
