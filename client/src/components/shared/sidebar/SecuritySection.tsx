import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ethers } from "ethers";
import { useSecurityHandlers } from "@/hooks/security/useSecurityHandlers";
import { useCrypto } from "@/hooks/security/useCrypto";
import GlassDropdown from "@/components/shared/GlassDropdown";
import {
  ImportIcon,
  ExportIcon,
  InfoIcon,
  TrashIcon,
  WarningIcon,
  WalletIcon,
} from "@/components/icons";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface SecuritySectionProps {
  nodeSelector?: React.ReactNode;
}

interface WalletDetails {
  balance: string;
  network: string;
  chainId: string;
}

/**
 * Renders the security and wallet management interface.
 * Handles generation and importation of internal wallets, and connection to external Web3 providers.
 *
 * @param {SecuritySectionProps} props - The component properties.
 * @returns {React.JSX.Element} The rendered Security Section component.
 */
export default function SecuritySection({
  nodeSelector,
}: SecuritySectionProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { encryptLocalDB } = useCrypto();
  const {
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
  } = useSecurityHandlers();

  const [showSecurityInfo, setShowSecurityInfo] = useState<boolean>(false);
  const [showWalletInfoTooltip, setShowWalletInfoTooltip] =
    useState<boolean>(false);
  const [showBackupInfo, setShowBackupInfo] = useState<boolean>(false);

  const [txWalletAddress, setTxWalletAddress] = useState<string | null>(null);
  const [txWalletType, setTxWalletType] = useState<
    "internal" | "external" | null
  >(null);
  const [walletDetails, setWalletDetails] = useState<WalletDetails | null>(
    null,
  );
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const [newInternalSeed, setNewInternalSeed] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importSeedInput, setImportSeedInput] = useState<string>("");
  const [importError, setImportError] = useState<string>("");

  const [autoBackupMode, setAutoBackupMode] = useState<string>("never");

  const deleteOptions = [
    { value: "never", label: "Auto-Delete: Never" },
    { value: "30", label: "Delete Older than 30 Days" },
    { value: "7", label: "Delete Older than 7 Days" },
    { value: "3", label: "Delete Older than 3 Days" },
    { value: "1", label: "Delete Older than 24 Hours" },
    { value: "close", label: "Burn on Close (Incognito)" },
  ];

  const backupOptions = [
    { value: "never", label: "Auto-Backup: Never" },
    { value: "1", label: "Daily (Every 24 Hours)" },
    { value: "3", label: "Every 3 Days" },
    { value: "7", label: "Weekly (Every 7 Days)" },
    { value: "30", label: "Monthly (Every 30 Days)" },
  ];

  const isIncognito = autoDeleteMode === "close";

  useEffect(() => {
    const savedExternal = localStorage.getItem("linked_metamask");
    const savedInternal = localStorage.getItem("internal_tx_wallet");

    if (savedInternal) {
      setTxWalletAddress(savedInternal);
      setTxWalletType("internal");
      fetchWalletDetails(savedInternal, false);
    } else if (savedExternal && typeof window.ethereum !== "undefined") {
      setTxWalletAddress(savedExternal);
      setTxWalletType("external");
      fetchWalletDetails(savedExternal, true);
    }

    const savedBackupMode = localStorage.getItem("securep2p_auto_backup_mode");
    if (savedBackupMode) {
      setAutoBackupMode(savedBackupMode);
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSecurityInfo(false);
        setShowWalletInfoTooltip(false);
        setShowBackupInfo(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Fetches the network and balance details for a given Ethereum address.
   *
   * @param {string} address - The wallet address to query.
   * @param {boolean} isExternal - Indicates if the request should use the injected provider.
   * @returns {Promise<void>} Resolves when the state is updated.
   */
  const fetchWalletDetails = async (
    address: string,
    isExternal: boolean,
  ): Promise<void> => {
    try {
      let provider;
      if (isExternal && typeof window.ethereum !== "undefined") {
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        provider = new ethers.JsonRpcProvider(
          import.meta.env.VITE_RPC_URL || "http://127.0.0.1:7545",
        );
      }

      const network = await provider.getNetwork();
      const balanceWei = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceWei);

      setWalletDetails({
        balance: parseFloat(balanceEth).toFixed(4),
        network: network.name === "unknown" ? "Localhost" : network.name,
        chainId: network.chainId.toString(),
      });
    } catch {
      setWalletDetails({
        balance: "0.0000",
        network: "Unknown",
        chainId: "0",
      });
    }
  };

  /**
   * Generates a new random HD wallet to serve as the internal transaction wallet.
   *
   * @returns {void}
   */
  const handleCreateInternalWallet = (): void => {
    setIsConnecting(true);
    try {
      const newWallet = ethers.Wallet.createRandom();
      if (newWallet.mnemonic) {
        const address = newWallet.address;
        const phrase = newWallet.mnemonic.phrase;
        const privateKey = newWallet.privateKey;

        localStorage.setItem("internal_tx_wallet", address);
        localStorage.setItem("internal_tx_pk", encryptLocalDB(privateKey));

        setTxWalletAddress(address);
        setTxWalletType("internal");
        setNewInternalSeed(phrase);
        fetchWalletDetails(address, false);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Restores an internal transaction wallet using a provided mnemonic phrase.
   *
   * @param {string} phrase - The 12-word seed phrase.
   * @returns {void}
   */
  const handleImportInternalWallet = (phrase: string): void => {
    setIsConnecting(true);
    setImportError("");
    try {
      const importedWallet = ethers.Wallet.fromPhrase(phrase.trim());
      const address = importedWallet.address;
      const privateKey = importedWallet.privateKey;

      localStorage.setItem("internal_tx_wallet", address);
      localStorage.setItem("internal_tx_pk", encryptLocalDB(privateKey));

      setTxWalletAddress(address);
      setTxWalletType("internal");
      fetchWalletDetails(address, false);
      setIsImportModalOpen(false);
      setImportSeedInput("");
    } catch (error) {
      setImportError("Invalid seed phrase. Please check your 12 words.");
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Requests connection to an injected Web3 provider to link an external wallet.
   *
   * @returns {Promise<void>}
   */
  const handleConnectExternalWallet = async (): Promise<void> => {
    if (typeof window.ethereum === "undefined") {
      showToast("MetaMask is not installed.", "error");
      return;
    }
    setIsConnecting(true);
    try {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts && accounts.length > 0) {
        const linkedAddress = accounts[0];
        setTxWalletAddress(linkedAddress);
        setTxWalletType("external");
        localStorage.setItem("linked_metamask", linkedAddress);
        localStorage.removeItem("internal_tx_wallet");
        localStorage.removeItem("internal_tx_pk");
        await fetchWalletDetails(linkedAddress, true);
      }
    } catch {
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Disconnects the currently active transaction wallet and clears local storage.
   *
   * @returns {void}
   */
  const handleDisconnectWallet = (): void => {
    setTxWalletAddress(null);
    setTxWalletType(null);
    setWalletDetails(null);
    localStorage.removeItem("linked_metamask");
    localStorage.removeItem("internal_tx_wallet");
    localStorage.removeItem("internal_tx_pk");
  };

  return (
    <>
      <div ref={containerRef} className="flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-1.5 mb-2 relative">
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Web3 Wallet (Transaction)
            </label>
            <button
              type="button"
              onClick={() => {
                setShowWalletInfoTooltip(!showWalletInfoTooltip);
                setShowSecurityInfo(false);
                setShowBackupInfo(false);
              }}
              className={`transition-colors focus:outline-none ${showWalletInfoTooltip ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <InfoIcon className="w-3.5 h-3.5" />
            </button>
            {showWalletInfoTooltip && (
              <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl text-xs text-zinc-300 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-150">
                Create or import an internal wallet, or link an external wallet
                (e.g., MetaMask) for P2P transfers.
              </div>
            )}
          </div>

          {!txWalletAddress ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={handleCreateInternalWallet}
                  disabled={isConnecting}
                  className="flex-1 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl border border-zinc-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  Create Internal
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  disabled={isConnecting}
                  className="flex-1 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl border border-zinc-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <ImportIcon className="w-4 h-4" /> Import Internal
                </button>
              </div>
              <button
                onClick={handleConnectExternalWallet}
                disabled={isConnecting}
                className="w-full text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl border border-indigo-500 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isConnecting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <WalletIcon className="w-4 h-4" />
                )}
                Link External Wallet
              </button>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-inner">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                    {txWalletType === "internal"
                      ? "Internal Wallet"
                      : "External Wallet"}
                  </span>
                </div>
                <button
                  onClick={handleDisconnectWallet}
                  className="text-[10px] text-red-400 hover:text-red-300 underline underline-offset-2"
                >
                  Disconnect
                </button>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-[9px] text-zinc-500 block mb-0.5">
                    ADDRESS
                  </span>
                  <span className="text-xs text-zinc-200 font-mono break-all bg-zinc-950 p-1.5 rounded-md border border-zinc-800/50 block">
                    {txWalletAddress}
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-zinc-950 p-2 rounded-lg border border-zinc-800/50">
                    <span className="text-[9px] text-zinc-500 block mb-0.5">
                      NETWORK
                    </span>
                    <span
                      className={`text-xs font-bold ${walletDetails?.chainId === "1" ? "text-red-400" : "text-indigo-400"}`}
                    >
                      {walletDetails?.network || "Loading..."}
                    </span>
                  </div>
                  <div className="flex-1 bg-zinc-950 p-2 rounded-lg border border-zinc-800/50">
                    <span className="text-[9px] text-zinc-500 block mb-0.5">
                      BALANCE
                    </span>
                    <span className="text-xs text-zinc-200 font-bold">
                      {walletDetails?.balance || "0.00"} ETH
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {nodeSelector && <div>{nodeSelector}</div>}

        <div>
          <div className="flex items-center gap-1.5 mb-2 relative">
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Auto-Delete Message
            </label>
            <button
              type="button"
              onClick={() => {
                setShowSecurityInfo(!showSecurityInfo);
                setShowWalletInfoTooltip(false);
                setShowBackupInfo(false);
              }}
              className={`transition-colors focus:outline-none ${showSecurityInfo ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <InfoIcon className="w-3.5 h-3.5" />
            </button>
            {showSecurityInfo && (
              <div className="absolute left-0 bottom-6 mb-2 z-50 w-64 p-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl text-xs text-zinc-300 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-150">
                <strong>Auto-Delete</strong> only removes messages from your
                local device.
              </div>
            )}
          </div>

          <GlassDropdown
            value={autoDeleteMode}
            options={deleteOptions}
            onChange={(val) => {
              handleModeChange({ target: { value: val } } as any);
              const selectedOpt = deleteOptions.find(
                (opt) => opt.value === val,
              );
              showToast(`Policy updated: ${selectedOpt?.label}`, "success");
            }}
          />
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2 relative">
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Data Backup
            </label>
            <button
              type="button"
              onClick={() => {
                setShowBackupInfo(!showBackupInfo);
                setShowWalletInfoTooltip(false);
                setShowSecurityInfo(false);
              }}
              className={`transition-colors focus:outline-none ${showBackupInfo ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <InfoIcon className="w-3.5 h-3.5" />
            </button>
            {showBackupInfo && (
              <div className="absolute left-0 bottom-6 mb-2 z-50 w-64 p-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl text-xs text-zinc-300 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-150">
                Export your chats and local identity as an encrypted backup
                file, or import to restore your data.
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (isIncognito) {
                  showToast("Disable Incognito Mode to import data.", "error");
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className={`flex-1 text-xs font-medium py-2.5 rounded-xl border transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                isIncognito
                  ? "bg-zinc-950 border-zinc-800/50 text-zinc-600 cursor-not-allowed opacity-60"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800"
              }`}
            >
              <ImportIcon className="w-3.5 h-3.5" /> Import
            </button>
            <button
              onClick={handleExportChat}
              className="flex-1 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-2.5 rounded-xl border border-zinc-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <ExportIcon className="w-3.5 h-3.5" /> Export
            </button>
          </div>
          <input
            type="file"
            accept=".securep2p"
            ref={fileInputRef}
            onChange={handleImportChat}
            className="hidden"
          />

          <div className="mt-3">
            <GlassDropdown
              value={autoBackupMode}
              options={backupOptions}
              onChange={(val) => {
                setAutoBackupMode(val);
                localStorage.setItem("securep2p_auto_backup_mode", val);
                const selectedOpt = backupOptions.find(
                  (opt) => opt.value === val,
                );
                showToast(`Schedule set: ${selectedOpt?.label}`, "success");
              }}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800/50">
          <button
            onClick={handleWipeData}
            className="w-full text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 py-2.5 rounded-xl border border-red-500/10 transition-colors flex items-center justify-center gap-2"
          >
            <TrashIcon className="w-3.5 h-3.5" /> Wipe Local Identity
          </button>
        </div>
      </div>

      {newInternalSeed &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-200 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-emerald-400 mb-2">
                Internal Wallet Created
              </h3>
              <p className="text-xs text-zinc-400 mb-4">
                Please save this 12-word seed phrase securely. This is the only
                way to recover your internal transaction wallet.
              </p>
              <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 font-mono text-center leading-relaxed">
                {newInternalSeed}
              </div>
              <button
                onClick={() => setNewInternalSeed(null)}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-medium transition-colors shadow-lg shadow-emerald-500/20"
              >
                I have saved this phrase
              </button>
            </div>
          </div>,
          document.body,
        )}

      {isImportModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-200 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-zinc-100 mb-2">
                Import Internal Wallet
              </h3>
              <p className="text-xs text-zinc-400 mb-4">
                Enter the 12-word seed phrase of your previously created
                internal wallet.
              </p>
              <textarea
                value={importSeedInput}
                onChange={(e) => setImportSeedInput(e.target.value)}
                placeholder="e.g. apple banana cat dog elephant frog grape hat ice juice kite lemon"
                className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 outline-none transition-all resize-none mb-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              {importError && (
                <p className="text-[11px] font-medium text-red-400 mb-4 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                  {importError}
                </p>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportSeedInput("");
                    setImportError("");
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleImportInternalWallet(importSeedInput)}
                  disabled={!importSeedInput.trim() || isConnecting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                >
                  {isConnecting ? "Importing..." : "Import"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {seedModal.isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-200 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
            <div
              className={`bg-zinc-900 border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${seedModal.type === "wipe" ? "border-red-500/30" : "border-zinc-800"}`}
            >
              <div className="flex items-center gap-3 mb-2">
                {seedModal.type === "wipe" && (
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 text-red-400">
                    <WarningIcon className="w-5 h-5" />
                  </div>
                )}
                <h3
                  className={`text-lg font-bold ${seedModal.type === "wipe" ? "text-red-400" : "text-zinc-100"}`}
                >
                  {seedModal.type === "export"
                    ? "Encrypt Backup"
                    : seedModal.type === "import"
                      ? "Decrypt Backup"
                      : "Confirm Data Wipe"}
                </h3>
              </div>

              <p className="text-xs text-zinc-400 mb-4">
                Enter your exact 12-word seed phrase to{" "}
                {seedModal.type === "export"
                  ? "encrypt"
                  : seedModal.type === "import"
                    ? "decrypt and restore"
                    : "authorize the permanent deletion of"}{" "}
                your data.
              </p>
              <textarea
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="e.g. apple banana cat dog elephant frog grape hat ice juice kite lemon"
                className={`w-full h-24 bg-zinc-950 border rounded-xl p-3 text-sm text-zinc-200 outline-none transition-all resize-none mb-2 ${
                  seedModal.type === "wipe"
                    ? "border-red-500/30 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : "border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                }`}
              />
              {modalError && (
                <p className="text-[11px] font-medium text-red-400 mb-4 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                  {modalError}
                </p>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={closeSeedModal}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitSeedModal}
                  disabled={!seedInput.trim()}
                  className={`flex-1 text-white py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 shadow-lg ${
                    seedModal.type === "wipe"
                      ? "bg-red-600 hover:bg-red-500 shadow-red-500/20"
                      : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"
                  }`}
                >
                  {seedModal.type === "wipe" ? "Wipe Data" : "Confirm"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
