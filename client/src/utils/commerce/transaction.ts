import { ethers } from "ethers";

/**
 * Initiates a native ETH transfer from the user's injected Web3 provider to a dynamically resolved target address.
 *
 * @param {string} targetAddress - The recipient's Ethereum address.
 * @param {string} amountInEth - The specific amount of native ETH to transfer.
 * @returns {Promise<string>} The transaction hash confirming the broadcast.
 */
export const transferViaInjectedProvider = async (
  targetAddress: string,
  amountInEth: string,
): Promise<string> => {
  if (!window.ethereum) {
    throw new Error("Web3 provider is not injected or available.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const transactionRequest = {
    to: targetAddress,
    value: ethers.parseEther(amountInEth),
  };

  const transactionResponse = await signer.sendTransaction(transactionRequest);
  return transactionResponse.hash;
};

/**
 * Initiates a native ETH transfer using an internal private key and a standard RPC Provider.
 *
 * @param {string} privateKey - The raw private key of the internal wallet.
 * @param {string} targetAddress - The recipient's Ethereum address.
 * @param {string} amountInEth - The specific amount of native ETH to transfer.
 * @param {string} rpcUrl - The JSON-RPC endpoint URL.
 * @returns {Promise<string>} The transaction hash confirming the broadcast.
 */
export const transferViaInternalWallet = async (
  privateKey: string,
  targetAddress: string,
  amountInEth: string,
  rpcUrl: string,
): Promise<string> => {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const transactionRequest = {
    to: targetAddress,
    value: ethers.parseEther(amountInEth),
  };

  const transactionResponse = await wallet.sendTransaction(transactionRequest);
  return transactionResponse.hash;
};
