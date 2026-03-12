import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ethers } from "ethers";
import { useSecurityHandlers } from "@/hooks/security/useSecurityHandlers";
import {
  ChevronDownIcon,
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

/**
 * Interface defining the properties for the SecuritySection component.
 */
export interface SecuritySectionProps {
  nodeSelector?: React.ReactNode;
}

/**
 * Interface representing the fetched state of a connected Web3 wallet.
 */
interface WalletDetails {
  balance: string;
  network: string;
  chainId: string;
}

/**
 * Renders the settings sidebar section dedicated to data security and cryptographic bindings.
 * Handles Web3 wallet connections, auto-delete policies, and local data import/export/wipe operations.
 *
 * @param {SecuritySectionProps} props - Component properties, allowing injection of layout-specific nodes.
 * @returns {React.JSX.Element} The security configuration UI.
 */
export default function SecuritySection({
  nodeSelector,
}: SecuritySectionProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showSecurityInfo, setShowSecurityInfo] = useState<boolean>(false);
  const [showWalletInfoTooltip, setShowWalletInfoTooltip] =
    useState<boolean>(false);
  const [showBackupInfo, setShowBackupInfo] = useState<boolean>(false);

  const [metaMaskAddress, setMetaMaskAddress] = useState<string | null>(null);
  const [walletDetails, setWalletDetails] = useState<WalletDetails | null>(
    null,
  );
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const deleteOptions = [
    { value: "never", label: "Auto-Delete: Never" },
    { value: "30", label: "Delete Older than 30 Days" },
    { value: "7", label: "Delete Older than 7 Days" },
    { value: "3", label: "Delete Older than 3 Days" },
    { value: "1", label: "Delete Older than 24 Hours" },
    { value: "close", label: "Burn on Close (Incognito)" },
  ];

  const isIncognito = autoDeleteMode === "close";

  useEffect(() => {
    const savedAddress = localStorage.getItem("linked_metamask");
    if (savedAddress && typeof window.ethereum !== "undefined") {
      setMetaMaskAddress(savedAddress);
      fetchWalletDetails(savedAddress);
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowSecurityInfo(false);
        setShowWalletInfoTooltip(false);
        setShowBackupInfo(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Retrieves the current balance and network information for a connected wallet address.
   *
   * @param {string} address - The public Ethereum address to query.
   * @returns {Promise<void>}
   */
  const fetchWalletDetails = async (address: string): Promise<void> => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const balanceWei = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceWei);
      setWalletDetails({
        balance: parseFloat(balanceEth).toFixed(4),
        network: network.name === "unknown" ? "Localhost" : network.name,
        chainId: network.chainId.toString(),
      });
    } catch {
      // Gracefully ignore fetch errors
    }
  };

  /**
   * Initiates the MetaMask connection flow via the injected window.ethereum provider.
   *
   * @returns {Promise<void>}
   */
  const handleConnectMetaMask = async (): Promise<void> => {
    if (typeof window.ethereum === "undefined") {
      alert("MetaMask is not installed. Please install the extension.");
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
        setMetaMaskAddress(linkedAddress);
        localStorage.setItem("linked_metamask", linkedAddress);
        await fetchWalletDetails(linkedAddress);
      }
    } catch {
      // Gracefully ignore connection cancellation or errors
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Clears the currently linked wallet address from local state and storage.
   *
   * @returns {void}
   */
  const handleDisconnectWallet = (): void => {
    setMetaMaskAddress(null);
    setWalletDetails(null);
    localStorage.removeItem("linked_metamask");
  };

  const activeLabel =
    deleteOptions.find((opt) => opt.value === autoDeleteMode)?.label ||
    "Select Mode";

  return (
    <>
      <div ref={containerRef} className="flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-1.5 mb-2 relative">
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Web3 Wallet (Payment)
            </label>
            <button
              type="button"
              onClick={() => {
                setShowWalletInfoTooltip(!showWalletInfoTooltip);
                setShowSecurityInfo(false);
                setShowBackupInfo(false);
                setIsOpen(false);
              }}
              className={`transition-colors focus:outline-none ${showWalletInfoTooltip ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <InfoIcon className="w-3.5 h-3.5" />
            </button>
            {showWalletInfoTooltip && (
              <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl text-xs text-zinc-300 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-150">
                Link your MetaMask wallet to send and receive direct P2P crypto
                transfers in chat.
              </div>
            )}
          </div>
          {!metaMaskAddress ? (
            <button
              onClick={handleConnectMetaMask}
              disabled={isConnecting}
              className="w-full text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl border border-indigo-500 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isConnecting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <WalletIcon className="w-4 h-4" />
              )}
              {isConnecting ? "Connecting..." : "Link MetaMask Wallet"}
            </button>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-inner">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                    Connected
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
                    {metaMaskAddress}
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
                      {walletDetails?.network || "Loading..."}{" "}
                      {walletDetails?.chainId === "1" && "(Mainnet!)"}
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
                setIsOpen(false);
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
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`w-full bg-zinc-900 border ${isOpen ? "border-indigo-500 ring-1 ring-indigo-500" : "border-zinc-800"} text-zinc-300 text-xs rounded-xl pl-3 pr-8 py-2.5 outline-none text-left transition-all shadow-sm flex items-center justify-between`}
            >
              <span className="truncate">{activeLabel}</span>
              <ChevronDownIcon
                className={`w-4 h-4 text-zinc-500 transition-transform duration-200 absolute right-3 ${isOpen ? "rotate-0 text-indigo-400" : "rotate-180"}`}
              />
            </button>
            {isOpen && (
              <div className="absolute z-100 bottom-full mb-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                <ul className="py-1">
                  {deleteOptions.map((opt) => (
                    <li key={opt.value}>
                      <button
                        onClick={() => {
                          handleModeChange({
                            target: { value: opt.value },
                          } as any);
                          setIsOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${autoDeleteMode === opt.value ? "bg-indigo-600/10 text-indigo-400 font-medium" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"}`}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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
                setIsOpen(false);
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
