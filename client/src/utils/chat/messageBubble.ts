export type TransferDirection = "SENT" | "RECEIVED";

export interface ParsedReplyData {
  id: string | number;
  text: string;
  isMine: boolean;
  timestamp: number;
}

export interface ParsedDocumentData {
  fileName: string;
  fileData: string;
}

export interface ParsedCryptoData {
  hash: string;
  amount: string;
  receiptType?: "TX_SUCCESS" | "TRANSFER_SUCCESS" | "CRYPTO_RECEIPT";
}

export interface ParsedLegacyCryptoData {
  txType: TransferDirection;
  txAmountOrStatus: string;
  txHash: string;
  isVerification: boolean;
}

export interface ParsedMessageBubbleData {
  parsedText: string;
  replyData: ParsedReplyData | null;
  documentData: ParsedDocumentData | null;
  cryptoData: ParsedCryptoData | null;
  legacyCryptoData: ParsedLegacyCryptoData | null;
  isAudio: boolean;
  audioSource: string;
}

/**
 * Parses serialized message payloads and legacy tags for bubble routing.
 *
 * @param {string} rawText - Stored message text payload.
 * @returns {ParsedMessageBubbleData} Parsed message metadata.
 */
export const parseMessageBubbleData = (
  rawText: string,
): ParsedMessageBubbleData => {
  let parsedText = rawText;
  let replyData: ParsedReplyData | null = null;
  let documentData: ParsedDocumentData | null = null;
  let cryptoData: ParsedCryptoData | null = null;

  try {
    const parsed = JSON.parse(rawText) as {
      type?: unknown;
      text?: unknown;
      replyTo?: unknown;
      fileName?: unknown;
      fileData?: unknown;
      hash?: unknown;
      amount?: unknown;
      txAmount?: unknown;
      value?: unknown;
    };

    if (parsed.type === "DOCUMENT") {
      documentData = {
        fileName: parsed.fileName as string,
        fileData: parsed.fileData as string,
      };
    } else if (
      parsed.type === "TX_SUCCESS" ||
      parsed.type === "TRANSFER_SUCCESS" ||
      parsed.type === "CRYPTO_RECEIPT"
    ) {
      const receiptAmount =
        typeof parsed.amount === "string"
          ? parsed.amount
          : typeof parsed.txAmount === "string"
            ? parsed.txAmount
            : typeof parsed.value === "string"
              ? parsed.value
              : "0";

      cryptoData = {
        hash: String(parsed.hash ?? ""),
        amount: receiptAmount,
        receiptType: parsed.type as
          | "TX_SUCCESS"
          | "TRANSFER_SUCCESS"
          | "CRYPTO_RECEIPT",
      };
    } else if (typeof parsed.text === "string") {
      parsedText = parsed.text;
      replyData = (parsed.replyTo as ParsedReplyData) || null;
    }
  } catch {
    parsedText = rawText;
  }

  const isAudio = parsedText.startsWith("[AUDIO]");
  const audioSource = isAudio ? parsedText.replace("[AUDIO]", "") : "";

  const hasLegacyCryptoPrefix =
    parsedText.startsWith("[SENT]") || parsedText.startsWith("[RECEIVED]");

  let legacyCryptoData: ParsedLegacyCryptoData | null = null;

  if (hasLegacyCryptoPrefix) {
    const txType: TransferDirection = parsedText.startsWith("[SENT]")
      ? "SENT"
      : "RECEIVED";
    const parts = parsedText.split("\nTx Hash: ");
    const rawAmount = parts[0].replace(`[${txType}] `, "");
    const txHash = parts[1] || "";
    const isVerification = rawAmount.includes("Transfer Verified!");

    legacyCryptoData = {
      txType,
      txHash,
      isVerification,
      txAmountOrStatus: isVerification
        ? "Verified"
        : rawAmount.replace(" ETH", ""),
    };
  }

  return {
    parsedText,
    replyData,
    documentData,
    cryptoData,
    legacyCryptoData,
    isAudio,
    audioSource,
  };
};
