import { useState } from "react";

/**
 * Manages seed phrase modal input state and common helpers.
 *
 * @returns {{
 *   seedInput: string;
 *   setSeedInput: React.Dispatch<React.SetStateAction<string>>;
 *   clearSeedInput: () => void;
 *   canSubmit: boolean;
 * }} Seed input state and helpers.
 */
export const useSeedInputModal = () => {
  const [seedInput, setSeedInput] = useState<string>("");

  const clearSeedInput = () => setSeedInput("");
  const canSubmit = Boolean(seedInput.trim());

  return { seedInput, setSeedInput, clearSeedInput, canSubmit };
};
