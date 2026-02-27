import { useState, ChangeEvent } from "react";
import { ethers } from "ethers";
import { db } from "@/utils/db";
import { formatTime } from "@/utils/format";
import { useWallet } from "@/hooks/useWallet";
import { useUIStore, useSessionStore } from "@/store";

export const useSecurityHandlers = () => {
  const { address, resetWallet } = useWallet();
  const { showToast, seedModal, setSeedModal, closeSeedModal } = useUIStore();
  const { autoDeleteMode, setAutoDeleteMode } = useSessionStore();

  const [seedInput, setSeedInput] = useState("");
  const [modalError, setModalError] = useState("");

  const handleModeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setAutoDeleteMode(e.target.value);
  };

  const handleExportChat = async () => {
    const allMessages = await db.messages.toArray();
    if (allMessages.length === 0) {
      showToast("No chat history to export.", "error");
      return;
    }
    setSeedModal({ isOpen: true, type: "export" });
  };

  const handleImportChat = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // REFACTORED: Cek kalau mode incognito lagi nyala pas mau import
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

  const submitSeedModal = async () => {
    setModalError("");
    const seed = seedInput.trim();
    if (seed.split(/\s+/).length !== 12) {
      return setModalError("Invalid! Must be exactly 12 words.");
    }

    try {
      const derivedWallet = ethers.Wallet.fromPhrase(seed);
      if (derivedWallet.address.toLowerCase() !== address?.toLowerCase()) {
        return setModalError(
          "Access Denied! Seed phrase does not match the active account.",
        );
      }
    } catch (err) {
      return setModalError("Invalid seed phrase format or typo detected!");
    }

    if (seedModal.type === "export") {
      try {
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
      } catch (err) {
        setModalError("Failed to export chat history.");
      }
    } else if (seedModal.type === "import" && seedModal.payload) {
      try {
        const payload = JSON.parse(seedModal.payload);
        if (payload.encrypted) {
          const decodedStr = decodeURIComponent(escape(atob(payload.data)));
          const splitData = decodedStr.split("|||SECURE_P2P|||");

          if (splitData.length !== 2 || splitData[1] !== seed) {
            return setModalError(
              "Decryption failed! Seed phrase does not match this backup file.",
            );
          }

          const parsedMessages = JSON.parse(splitData[0]);
          await db.messages.bulkPut(parsedMessages);

          closeSeedModal();
          setSeedInput("");
          showToast("Chat history restored! Wait a moment...", "success");

          // REFACTORED: Refresh app manually to load new DB state,
          // we are safe to reload here because we blocked import in Incognito mode earlier
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (err) {
        setModalError("Failed to import. File might be corrupted.");
      }
    }
  };

  return {
    autoDeleteMode,
    handleModeChange,
    handleExportChat,
    handleImportChat,
    resetWallet,
    seedModal,
    closeSeedModal,
    seedInput,
    setSeedInput,
    modalError,
    submitSeedModal,
  };
};
