import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useCrypto } from "@/hooks/security/useCrypto";
import { useDismissablePopover } from "@/hooks/ui/useDismissablePopover";
import { useUIStore } from "@/store";
import { transferViaInternalWallet } from "@/utils/commerce/transaction";
import { shortenAddress } from "@/utils/core/format";
import { ImportIcon, InfoIcon, WalletIcon, SendIcon } from "@/components/icons";
import SeedPhraseModal from "@/components/ui/SeedPhraseModal";
import ImportWalletModal from "./modals/ImportWalletModal";
import WithdrawalModal from "./modals/WithdrawalModal";
import { ClipboardDocumentIcon, RefreshIcon } from "@/components/icons";
import { useWeb3WalletData } from "@/hooks/security/useWeb3WalletData";
import {
  clearWalletLinkage,
  COPIED_STATE_RESET_MS,
  ESTIMATED_GAS_ETH,
  getLinkedWalletState,
  getSafeMaxWithdrawal,
  INTERNAL_TX_PRIVATE_KEY_STORAGE_KEY,
  persistExternalWallet,
  persistInternalWallet,
  resolveRpcUrl,
  validateWithdrawal,
} from "@/services/web3WalletService";

declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Renders the Web3 wallet management interface.
 * Handles internal wallet generation, importation, withdrawals with toggleable UI, and external provider linking.
 *
 * @returns {React.JSX.Element} The Web3 Wallet component.
 */
export default function Web3Wallet(): React.JSX.Element {
  const { encryptLocalDB, decryptLocalDB } = useCrypto();
  const { showToast } = useUIStore();
  const walletInfo = useDismissablePopover();

  const [txWalletAddress, setTxWalletAddress] = useState<string | null>(null);
  const [txWalletType, setTxWalletType] = useState<
    "internal" | "external" | null
  >(null);

  const { walletDetails, refreshWalletData, isRefreshing } = useWeb3WalletData(
    txWalletAddress,
    txWalletType,
  );

  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const [newInternalSeed, setNewInternalSeed] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importError, setImportError] = useState<string>("");

  const [copiedWalletAddr, setCopiedWalletAddr] = useState<boolean>(false);
  const [withdrawAddress, setWithdrawAddress] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] =
    useState<boolean>(false);
  const [withdrawError, setWithdrawError] = useState<string>("");
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);

  useEffect(() => {
    const linkedWallet = getLinkedWalletState();

    if (linkedWallet.address && linkedWallet.type) {
      setTxWalletAddress(linkedWallet.address);
      setTxWalletType(linkedWallet.type);
    }
  }, []);

  const handleCreateInternalWallet = (): void => {
    setIsConnecting(true);
    try {
      const newWallet = ethers.Wallet.createRandom();
      if (newWallet.mnemonic) {
        const address = newWallet.address;
        const phrase = newWallet.mnemonic.phrase;
        const privateKey = newWallet.privateKey;

        persistInternalWallet(address, encryptLocalDB(privateKey));

        setTxWalletAddress(address);
        setTxWalletType("internal");
        setNewInternalSeed(phrase);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleImportInternalWallet = (phrase: string): void => {
    setIsConnecting(true);
    setImportError("");
    try {
      const importedWallet = ethers.Wallet.fromPhrase(phrase.trim());
      const address = importedWallet.address;
      const privateKey = importedWallet.privateKey;

      persistInternalWallet(address, encryptLocalDB(privateKey));

      setTxWalletAddress(address);
      setTxWalletType("internal");
      setIsImportModalOpen(false);
    } catch {
      setImportError("Invalid seed phrase.");
    } finally {
      setIsConnecting(false);
    }
  };

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
        persistExternalWallet(linkedAddress);
      }
    } catch {
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectWallet = (): void => {
    setTxWalletAddress(null);
    setTxWalletType(null);
    clearWalletLinkage();
  };

  /**
   * Validates the withdrawal inputs against the safe maximum (balance minus gas)
   * before opening the seed-phrase confirmation modal.
   *
   * @returns {void}
   */
  const handleInitiateWithdrawal = (): void => {
    const validation = validateWithdrawal(
      withdrawAddress,
      withdrawAmount,
      walletDetails?.balance,
      ESTIMATED_GAS_ETH,
    );

    if (!validation.valid) {
      showToast(validation.error || "Invalid withdrawal request.", "error");
      return;
    }

    setIsWithdrawModalOpen(true);
  };

  const executeWithdrawal = async (
    withdrawSeedInput: string,
  ): Promise<void> => {
    setWithdrawError("");
    setIsWithdrawing(true);

    try {
      const confirmationWallet = ethers.Wallet.fromPhrase(
        withdrawSeedInput.trim(),
      );

      if (
        confirmationWallet.address.toLowerCase() !==
        txWalletAddress?.toLowerCase()
      ) {
        throw new Error("Seed phrase does not match active wallet.");
      }

      const encryptedPk = localStorage.getItem(
        INTERNAL_TX_PRIVATE_KEY_STORAGE_KEY,
      );
      if (!encryptedPk) throw new Error("Private key not found.");

      const internalPk = decryptLocalDB(encryptedPk);
      const rpcUrl = resolveRpcUrl();

      await transferViaInternalWallet(
        internalPk,
        withdrawAddress,
        withdrawAmount,
        rpcUrl,
      );

      showToast(
        `Withdrawal of ${withdrawAmount} ETH to ${shortenAddress(withdrawAddress)} successful!`,
        "success",
      );

      setWithdrawAddress("");
      setWithdrawAmount("");
      setIsWithdrawModalOpen(false);

      if (txWalletAddress) {
        await refreshWalletData();
      }
    } catch (error: any) {
      setWithdrawError(error.message || "Failed to process withdrawal.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  /**
   * Sets the withdrawal amount to the maximum safe value: balance minus the
   * estimated gas fee. If the balance is insufficient to cover even the fee,
   * the amount is set to zero to prevent invalid submissions.
   *
   * @returns {void}
   */
  const handleMaxAmount = (): void => {
    const currentBalance = Number.parseFloat(walletDetails?.balance || "0");
    const safeMax = getSafeMaxWithdrawal(currentBalance, ESTIMATED_GAS_ETH);
    setWithdrawAmount(safeMax > 0 ? safeMax.toFixed(4) : "0");
  };

  return (
    <>
      <div>
        <div
          className="flex items-center gap-1.5 mb-2 relative"
          ref={walletInfo.containerRef}
        >
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
            Web3 Wallet (Transaction)
          </label>
          <button
            type="button"
            onClick={walletInfo.toggle}
            className={`transition-colors focus:outline-none ${walletInfo.isOpen ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <InfoIcon className="w-3.5 h-3.5" />
          </button>
          {walletInfo.isOpen && (
            <div className="absolute left-0 top-6 z-40 w-64 p-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl text-xs text-zinc-300 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-150">
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
                className="flex-1 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl border border-zinc-700 transition-colors shadow-sm disabled:opacity-50"
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-inner flex flex-col gap-4">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                    {txWalletType === "internal"
                      ? "Internal Wallet"
                      : "External Wallet"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={refreshWalletData}
                    disabled={isRefreshing}
                    className="text-[10px] font-medium text-zinc-400 hover:text-indigo-400 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshIcon
                      className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`}
                    />
                    {isRefreshing ? "Refreshing..." : "Refresh"}
                  </button>
                  <button
                    onClick={handleDisconnectWallet}
                    className="text-[10px] text-red-400 hover:text-red-300 underline underline-offset-2"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-[9px] text-zinc-500 block mb-0.5">
                    ADDRESS
                  </span>
                  <div className="flex items-center gap-2 bg-zinc-950 px-1.5 py-1.5 rounded-md border border-zinc-800/50">
                    <span className="text-xs text-zinc-200 font-mono break-all flex-1">
                      {txWalletAddress}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(txWalletAddress ?? "");
                        setCopiedWalletAddr(true);
                        setTimeout(
                          () => setCopiedWalletAddr(false),
                          COPIED_STATE_RESET_MS,
                        );
                      }}
                      className="shrink-0 text-zinc-600 hover:text-indigo-400 transition-colors p-0.5"
                      title="Copy address"
                    >
                      {copiedWalletAddr ? (
                        <span className="text-[9px] font-bold text-emerald-400">
                          Copied!
                        </span>
                      ) : (
                        <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
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

            {txWalletType === "internal" && (
              <div className="pt-3 border-t border-zinc-800/50">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                  External Withdrawal
                </p>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                        Destination Address
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="0x..."
                          value={withdrawAddress}
                          onChange={(e) => setWithdrawAddress(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-3 py-2.5 text-xs text-zinc-200 outline-none transition-all placeholder:text-zinc-600 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                        Amount (ETH)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          placeholder="0.0000"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-3 py-2.5 pr-14 text-xs text-zinc-200 outline-none transition-all placeholder:text-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={handleMaxAmount}
                          disabled={
                            !walletDetails ||
                            Number.parseFloat(walletDetails.balance) <=
                              ESTIMATED_GAS_ETH
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600/20 hover:bg-indigo-600/40 disabled:opacity-40 disabled:cursor-not-allowed text-[9px] font-bold text-indigo-300 px-2 py-0.5 rounded-md transition-colors border border-indigo-500/30"
                        >
                          MAX
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-600 flex items-center gap-1 mt-0.5">
                        Est. network fee: ~{ESTIMATED_GAS_ETH} ETH
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleInitiateWithdrawal}
                    disabled={!withdrawAddress || !withdrawAmount}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <SendIcon className="w-3.5 h-3.5" />
                    Execute Transfer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {newInternalSeed && (
        <SeedPhraseModal
          seedPhrase={newInternalSeed}
          title="Internal Wallet Created"
          subtitle="Please save this 12-word seed phrase securely. It's the only way to recover your funds."
          onClose={() => setNewInternalSeed(null)}
        />
      )}

      <ImportWalletModal
        isOpen={isImportModalOpen}
        isConnecting={isConnecting}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportError("");
        }}
        onImport={handleImportInternalWallet}
        importError={importError}
      />

      <WithdrawalModal
        isOpen={isWithdrawModalOpen}
        withdrawAmount={withdrawAmount}
        isWithdrawing={isWithdrawing}
        withdrawError={withdrawError}
        onClose={() => {
          setIsWithdrawModalOpen(false);
          setWithdrawError("");
        }}
        onConfirm={executeWithdrawal}
      />
    </>
  );
}
