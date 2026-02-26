import { ChangeEvent, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

// ... [ICON COMPONENTS TETAP SAMA] ...
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
    />
  </svg>
);

const ImportIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

const ExportIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
    />
  </svg>
);

const InfoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const WarningIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const WalletIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 9v3m-9 3h1.5"
    />
  </svg>
);

export interface SecuritySectionProps {
  autoDeleteMode: string;
  handleModeChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  handleExportChat: () => void;
  handleImportChat: (e: ChangeEvent<HTMLInputElement>) => void;
  resetWallet: () => void;
}

export default function SecuritySection({
  autoDeleteMode,
  handleModeChange,
  handleExportChat,
  handleImportChat,
  resetWallet,
}: SecuritySectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showSecurityInfo, setShowSecurityInfo] = useState<boolean>(false);
  const [showWalletInfoTooltip, setShowWalletInfoTooltip] =
    useState<boolean>(false);
  const [showBackupInfo, setShowBackupInfo] = useState<boolean>(false);

  const [isWipeModalOpen, setIsWipeModalOpen] = useState<boolean>(false);
  const [wipeConfirmation, setWipeConfirmation] = useState<string>("");

  const [metaMaskAddress, setMetaMaskAddress] = useState<string | null>(null);
  const [walletDetails, setWalletDetails] = useState<{
    balance: string;
    network: string;
    chainId: string;
  } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const deleteOptions = [
    { value: "never", label: "Auto-Delete: Never" },
    { value: "30", label: "Delete Older than 30 Days" },
    { value: "7", label: "Delete Older than 7 Days" },
    { value: "3", label: "Delete Older than 3 Days" },
    { value: "1", label: "Delete Older than 24 Hours" },
    { value: "close", label: "Burn on Close (Incognito)" },
  ];

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

  const fetchWalletDetails = async (address: string) => {
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
    } catch (err) {
      console.error("Failed to fetch wallet details:", err);
    }
  };

  const handleConnectMetaMask = async () => {
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
    } catch (error: any) {
      console.error("MetaMask connection failed or rejected:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectWallet = () => {
    setMetaMaskAddress(null);
    setWalletDetails(null);
    localStorage.removeItem("linked_metamask");
  };

  const handleOptionSelect = (value: string) => {
    const syntheticEvent = {
      target: { value },
    } as ChangeEvent<HTMLSelectElement>;
    handleModeChange(syntheticEvent);
    setIsOpen(false);
  };

  const executeWipe = () => {
    handleDisconnectWallet();
    setIsWipeModalOpen(false);
    setWipeConfirmation("");
    resetWallet();
  };

  const openWipeModal = () => {
    setWipeConfirmation("");
    setIsWipeModalOpen(true);
  };

  const activeLabel =
    deleteOptions.find((opt) => opt.value === autoDeleteMode)?.label ||
    "Select Mode";

  return (
    <>
      <div ref={containerRef} className="flex flex-col gap-6">
        {/* WALLET SECTION */}
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

              {walletDetails?.chainId === "1" && (
                <div className="mt-2 text-[10px] text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20 text-center">
                  ⚠️ <strong>Warning:</strong> You are on Ethereum Mainnet.
                  Switch to Ganache in MetaMask extension to test with dummy
                  ETH.
                </div>
              )}
            </div>
          )}
        </div>

        {/* BACKUP SECTION */}
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
              <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl text-xs text-zinc-300 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-150">
                Export your chats and local identity as an encrypted backup
                file, or import to restore your data on this device.
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-2.5 rounded-xl border border-zinc-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
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

        {/* AUTO DELETE SECTION */}
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
                local device. Due to the P2P architecture, it cannot delete
                messages stored on your peer's device.
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`w-full bg-zinc-900 border ${isOpen ? "border-indigo-500 ring-1 ring-indigo-500" : "border-zinc-800"} text-zinc-300 text-xs rounded-xl pl-3 pr-8 py-2.5 outline-none text-left transition-all shadow-sm flex items-center justify-between`}
            >
              <span className="truncate">{activeLabel}</span>
              {/* REFACTORED: Chevron rotation reversed because it opens upwards */}
              <ChevronDownIcon
                className={`w-4 h-4 text-zinc-500 transition-transform duration-200 absolute right-3 ${isOpen ? "rotate-0 text-indigo-400" : "rotate-180"}`}
              />
            </button>
            {/* REFACTORED: Dropdown menu positioned upwards using bottom-full mb-2 */}
            {isOpen && (
              <div className="absolute z-100 bottom-full mb-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                <ul className="py-1">
                  {deleteOptions.map((opt) => (
                    <li key={opt.value}>
                      <button
                        onClick={() => handleOptionSelect(opt.value)}
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

        {/* WIPE SECTION */}
        <div className="pt-2 border-t border-zinc-800/50">
          <button
            onClick={openWipeModal}
            className="w-full text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 py-2.5 rounded-xl border border-red-500/10 transition-colors flex items-center justify-center gap-2"
          >
            <TrashIcon className="w-3.5 h-3.5" /> Wipe Local Identity
          </button>
        </div>
      </div>

      {/* WIPE MODAL */}
      {isWipeModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-200 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-red-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-4 text-red-400">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                  <WarningIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold">Destructive Action</h3>
              </div>
              <p className="text-sm text-zinc-300 mb-2 leading-relaxed">
                This will permanently delete your local identity from this
                device.
              </p>
              <div className="mb-6">
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                  Type{" "}
                  <span className="text-white font-bold select-all">WIPE</span>{" "}
                  to confirm
                </label>
                <input
                  type="text"
                  value={wipeConfirmation}
                  onChange={(e) => setWipeConfirmation(e.target.value)}
                  placeholder="WIPE"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none transition-all placeholder:text-zinc-700 uppercase"
                  autoComplete="off"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsWipeModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeWipe}
                  disabled={wipeConfirmation !== "WIPE"}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${wipeConfirmation === "WIPE" ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-zinc-800 text-zinc-500 cursor-not-allowed"}`}
                >
                  Yes, Wipe Data
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
