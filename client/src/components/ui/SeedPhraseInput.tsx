import React, { useCallback } from "react";
import {
  getSeedPhraseProgress,
  MAX_SEED_PHRASE_WORDS,
  processSeedPhraseInput,
} from "@/utils/auth/seedPhrase";

/**
 * Properties for the SeedPhraseInput component.
 *
 * @interface SeedPhraseInputProps
 * @property {string} value - The current string value of the seed phrase input.
 * @property {(value: string) => void} onChange - Callback function triggered upon input change.
 * @property {string} [error] - Optional error message displayed below the input.
 * @property {boolean} [disabled] - Disables the text area if set to true.
 * @property {string} [placeholder] - Placeholder text for the input area.
 */
export interface SeedPhraseInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * A reusable textarea component strictly designed for 12-word seed phrase input.
 * Enforces real-time validation: allows only alphabetic characters, single spaces,
 * prevents line breaks, and strictly limits input to exactly 12 words.
 *
 * @param {SeedPhraseInputProps} props - Component properties.
 * @returns {React.JSX.Element} The rendered and validated seed phrase input component.
 */
export const SeedPhraseInput = ({
  value,
  onChange,
  error,
  disabled = false,
  placeholder = "e.g. apple banana cat dog elephant frog grape hat ice juice kite lemon",
}: SeedPhraseInputProps): React.JSX.Element => {
  const { wordCount, isComplete } = getSeedPhraseProgress(value);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = processSeedPhraseInput(e.target.value, value);
      onChange(nextValue);
    },
    [value, onChange],
  );

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
          12-Word Seed Phrase
        </label>
        <span
          className={`text-[10px] font-mono ${
            isComplete ? "text-emerald-400" : "text-zinc-500"
          }`}
        >
          {wordCount} / {MAX_SEED_PHRASE_WORDS}
        </span>
      </div>
      <textarea
        value={value}
        onChange={handleInput}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
        className={`w-full px-4 py-2.5 bg-zinc-950 border rounded-xl focus:ring-1 outline-none transition-all placeholder:text-zinc-600 resize-none font-mono text-xs shadow-sm leading-relaxed custom-scrollbar ${
          error
            ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/30"
            : isComplete
              ? "border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500/30"
              : "border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/30"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      />
      {error && (
        <p className="text-[10px] text-red-400 mt-1.5 ml-1 animate-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
};
