import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useCrypto } from "@/hooks/security/useCrypto";
import { useUIStore } from "@/store";
import { transferViaInternalWallet } from "@/utils/transaction";
import { shortenAddress } from "@/utils/format";
import { ImportIcon, InfoIcon, WalletIcon, SendIcon } from "@/components/icons";
import SeedPhraseModal from "@/components/ui/SeedPhraseModal";
import ImportWalletModal from "./modals/ImportWalletModal";
import WithdrawalModal from "./modals/WithdrawalModal";

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface WalletDetails {
  balance: string;
  network: string;
  chainId: string;
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

  const [showWalletInfoTooltip, setShowWalletInfoTooltip] =
    useState<boolean>(false);
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
  const [importError, setImportError] = useState<string>("");

  const [showWithdrawForm, setShowWithdrawForm] = useState<boolean>(false);
  const [withdrawAddress, setWithdrawAddress] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] =
    useState<boolean>(false);
  const [withdrawError, setWithdrawError] = useState<string>("");
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);

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
  }, []);

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
          import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545",
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

  const handleDisconnectWallet = (): void => {
    setTxWalletAddress(null);
    setTxWalletType(null);
    setWalletDetails(null);
    setShowWithdrawForm(false);
    localStorage.removeItem("linked_metamask");
    localStorage.removeItem("internal_tx_wallet");
    localStorage.removeItem("internal_tx_pk");
  };

  const handleInitiateWithdrawal = (): void => {
    if (!ethers.isAddress(withdrawAddress)) {
      showToast("Invalid destination address.", "error");
      return;
    }

    const numericAmount = Number(withdrawAmount);
    const currentBalance = Number(walletDetails?.balance || "0");

    if (isNaN(numericAmount) || numericAmount <= 0) {
      showToast("Invalid withdrawal amount.", "error");
      return;
    }

    if (numericAmount > currentBalance) {
      showToast("Insufficient funds.", "error");
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

      const encryptedPk = localStorage.getItem("internal_tx_pk");
      if (!encryptedPk) throw new Error("Private key not found.");

      const internalPk = decryptLocalDB(encryptedPk);
      const rpcUrl = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:7545";

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
      setShowWithdrawForm(false);

      if (txWalletAddress) {
        fetchWalletDetails(txWalletAddress, false);
      }
    } catch (error: any) {
      setWithdrawError(error.message || "Failed to process withdrawal.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleMaxAmount = async (): Promise<void> => {
    if (!txWalletAddress) return;

    try {
      const rpcUrl = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:7545";
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      const rawBalance = await provider.getBalance(txWalletAddress);
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits("2", "gwei");

      const gasCost = 21000n * gasPrice;

      if (rawBalance > gasCost) {
        const maxAmountWei = rawBalance - gasCost;
        const maxAmountEth = ethers.formatEther(maxAmountWei);

        const safeMax = Math.floor(parseFloat(maxAmountEth) * 10000) / 10000;
        setWithdrawAmount(safeMax.toString());
      } else {
        showToast("Balance too low to cover gas fees.", "error");
      }
    } catch {
      const currentBal = parseFloat(walletDetails?.balance || "0");
      const fallbackMax = Math.max(0, currentBal - 0.001);
      setWithdrawAmount(fallbackMax.toFixed(4));
    }
  };

  return (
    <>
      <div>
        <div className="flex items-center gap-1.5 mb-2 relative">
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
            Web3 Wallet (Transaction)
          </label>
          <button
            type="button"
            onClick={() => setShowWalletInfoTooltip(!showWalletInfoTooltip)}
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

            {txWalletType === "internal" && (
              <div className="pt-3 border-t border-zinc-800/50">
                <button
                  onClick={() => setShowWithdrawForm(!showWithdrawForm)}
                  className="w-full flex items-center justify-between text-[10px] font-semibold text-zinc-500 uppercase tracking-widest hover:text-zinc-300 transition-colors focus:outline-none"
                >
                  <span>External Withdrawal</span>
                  <span>{showWithdrawForm ? "Hide" : "Show"}</span>
                </button>

                {showWithdrawForm && (
                  <div className="flex flex-col gap-2 mt-3 animate-in slide-in-from-top-2 fade-in duration-200">
                    <input
                      type="text"
                      placeholder="Destination Address (0x...)"
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none transition-all placeholder:text-zinc-600"
                    />
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          placeholder="Amount ETH"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-3 py-2 pr-12 text-xs text-zinc-200 outline-none transition-all placeholder:text-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={handleMaxAmount}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-zinc-800 hover:bg-zinc-700 text-[9px] font-bold text-zinc-300 px-1.5 py-0.5 rounded transition-colors"
                        >
                          MAX
                        </button>
                      </div>
                      <button
                        onClick={handleInitiateWithdrawal}
                        disabled={!withdrawAddress || !withdrawAmount}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center"
                      >
                        <SendIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
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
