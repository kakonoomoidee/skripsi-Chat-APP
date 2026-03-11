import { useState, ChangeEvent } from "react";
import { ethers } from "ethers";
import { db } from "@/utils/db";
import { formatTime } from "@/utils/format";
import { useWallet } from "@/hooks/useWallet";
import { useUIStore, useSessionStore, useWalletStore } from "@/store";

/**
 * Interface defining the methods and states provided by the useSecurityHandlers hook.
 */
export interface UseSecurityHandlersReturn {
  autoDeleteMode: string;
  handleModeChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  handleExportChat: () => Promise<void>;
  handleImportChat: (e: ChangeEvent<HTMLInputElement>) => void;
  handleWipeData: () => void;
  seedModal: {
    isOpen: boolean;
    type: "import" | "export" | "wipe" | null;
    payload?: string;
  };
  closeSeedModal: () => void;
  seedInput: string;
  setSeedInput: (val: string) => void;
  modalError: string;
  submitSeedModal: () => Promise<void>;
  showToast: (message: string, type?: "success" | "error") => void;
}

/**
 * Custom hook to handle all security-related actions within the application.
 * Encapsulates logic for exporting/importing chats, wiping identities, and verifying seed phrases.
 *
 * @returns {UseSecurityHandlersReturn} Handlers and states for the security section.
 */
export const useSecurityHandlers = (): UseSecurityHandlersReturn => {
  const { address, resetWallet } = useWallet();
  const { showToast, seedModal, setSeedModal, closeSeedModal } = useUIStore();
  const { autoDeleteMode, setAutoDeleteMode } = useSessionStore();
  const { setPeerWalletAddress } = useWalletStore();

  const [seedInput, setSeedInput] = useState<string>("");
  const [modalError, setModalError] = useState<string>("");

  /**
   * Updates the global auto-delete (incognito) mode preference.
   * @param {ChangeEvent<HTMLSelectElement>} e - The select input change event.
   */
  const handleModeChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    setAutoDeleteMode(e.target.value);
  };

  /**
   * Initiates the chat export process by verifying if history exists and opening the verification modal.
   * @returns {Promise<void>}
   */
  const handleExportChat = async (): Promise<void> => {
    const allMessages = await db.messages.toArray();
    if (allMessages.length === 0) {
      showToast("No chat history to export.", "error");
      return;
    }
    setSeedModal({ isOpen: true, type: "export" });
  };

  /**
   * Reads an imported backup file and opens the verification modal to restore chat history.
   * Prevents import if Incognito Mode is active.
   * @param {ChangeEvent<HTMLInputElement>} e - The file input change event.
   */
  const handleImportChat = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (autoDeleteMode === "close") {
      showToast(
        "Cannot import while in Incognito Mode. Change mode first.",
        "error",
      );
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setSeedModal({ isOpen: true, type: "import", payload: content });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /**
   * Initiates the identity wipe process by opening the verification modal.
   */
  const handleWipeData = (): void => {
    setSeedModal({ isOpen: true, type: "wipe" });
  };

  /**
   * Verifies the provided seed phrase against the active wallet address.
   * If verified, executes the requested action (Wipe, Export, or Import).
   * @returns {Promise<void>}
   */
  const submitSeedModal = async (): Promise<void> => {
    setModalError("");
    const seed = seedInput.trim();

    if (seed.split(/\s+/).length !== 12) {
      return setModalError("Invalid! Must be exactly 12 words.");
    }

    try {
      const derivedWallet = ethers.Wallet.fromPhrase(seed);
      if (derivedWallet.address.toLowerCase() !== address?.toLowerCase()) {
        console.warn(
          "[Security] Seed verification failed: Mismatch with active account.",
        );
        return setModalError(
          "Access Denied! Seed phrase does not match the active account.",
        );
      }
    } catch {
      return setModalError("Invalid seed phrase format or typo detected!");
    }

    if (seedModal.type === "wipe") {
      try {
        console.log(
          "[Security] Authorized Wipe initiated. Clearing local databases and storage...",
        );
        await db.messages.clear();
        localStorage.clear();
        setPeerWalletAddress(null);
        resetWallet();

        closeSeedModal();
        setSeedInput("");
        showToast("Identity Wiped. Redirecting to Login...", "success");

        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } catch (error) {
        console.error(
          "[Security Error] Failed to execute wipe operation:",
          error,
        );
        setModalError("Failed to wipe data.");
      }
      return;
    }

    if (seedModal.type === "export") {
      try {
        console.log(
          "[Security] Authorized Export initiated. Compiling chat history...",
        );
        const allMessages = await db.messages.toArray();
        const dataStr = JSON.stringify(allMessages);

        const encodedData = btoa(
          unescape(encodeURIComponent(dataStr + "|||SECURE_P2P|||" + seed)),
        );
        const backupPayload = {
          version: "3.0",
          encrypted: true,
          data: encodedData,
        };

        const blob = new Blob([JSON.stringify(backupPayload)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `securep2p_backup_${formatTime(Date.now()).replace(/:/g, "-")}.securep2p`;
        a.click();
        URL.revokeObjectURL(url);

        closeSeedModal();
        setSeedInput("");
        showToast("Backup exported successfully!", "success");
      } catch (error) {
        console.error("[Security Error] Failed to export chat history:", error);
        setModalError("Failed to export chat history.");
      }
    } else if (seedModal.type === "import" && seedModal.payload) {
      try {
        console.log(
          "[Security] Authorized Import initiated. Parsing backup payload...",
        );
        const payload = JSON.parse(seedModal.payload);

        if (payload.encrypted) {
          const decodedStr = decodeURIComponent(escape(atob(payload.data)));
          const splitData = decodedStr.split("|||SECURE_P2P|||");

          if (splitData.length !== 2 || splitData[1] !== seed) {
            console.warn(
              "[Security] Import aborted: Backup payload signature mismatch.",
            );
            return setModalError(
              "Decryption failed! Seed phrase does not match this backup file.",
            );
          }

          const parsedMessages = JSON.parse(splitData[0]);
          await db.messages.bulkPut(parsedMessages);

          closeSeedModal();
          setSeedInput("");
          showToast("Chat history restored! Wait a moment...", "success");

          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (error) {
        console.error(
          "[Security Error] Failed to parse or import backup file:",
          error,
        );
        setModalError("Failed to import. File might be corrupted.");
      }
    }
  };

  return {
    autoDeleteMode,
    handleModeChange,
    handleExportChat,
    handleImportChat,
    handleWipeData,
    seedModal,
    closeSeedModal,
    seedInput,
    setSeedInput,
    modalError,
    submitSeedModal,
    showToast,
  };
};
