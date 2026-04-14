import React, { useCallback } from "react";

/**
 * Properties for the SeedPhraseModalInput component.
 *
 * @interface SeedPhraseModalInputProps
 * @property {string} value - The current string value of the seed phrase input.
 * @property {(value: string) => void} onChange - Callback function triggered upon input change.
 * @property {string} [error] - Optional error message displayed below the input.
 * @property {boolean} [disabled] - Disables the text area if set to true.
 * @property {string} [placeholder] - Placeholder text for the input area.
 */
export interface SeedPhraseModalInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * A reusable textarea component strictly designed for 12-word seed phrase input inside modals.
 * Includes built-in word limiting, real-time sanitization, and modal-specific dark styling.
 *
 * @param {SeedPhraseModalInputProps} props - Component properties.
 * @returns {React.JSX.Element} The rendered and validated modal seed phrase input component.
 */
export const SeedPhraseModalInput = ({
  value,
  onChange,
  error,
  disabled = false,
  placeholder = "e.g. apple banana cat dog elephant frog grape hat ice juice kite lemon",
}: SeedPhraseModalInputProps): React.JSX.Element => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const isComplete = wordCount === 12;

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const rawValue = e.target.value;
      let sanitizedValue = rawValue.replace(/[^a-zA-Z\s]/g, "");
      sanitizedValue = sanitizedValue.replace(/\s+/g, " ");

      if (sanitizedValue.length < value.length) {
        onChange(sanitizedValue);
        return;
      }

      const newWords = sanitizedValue.trim().split(/\s+/).filter(Boolean);

      if (
        newWords.length > 12 ||
        (newWords.length === 12 && sanitizedValue.endsWith(" "))
      ) {
        onChange(newWords.slice(0, 12).join(" "));
        return;
      }

      onChange(sanitizedValue);
    },
    [value, onChange],
  );

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
          12-Word Seed Phrase
        </label>
        <span
          className={`text-[10px] font-mono ${
            isComplete ? "text-emerald-400" : "text-zinc-500"
          }`}
        >
          {wordCount} / 12
        </span>
      </div>
      <textarea
        value={value}
        onChange={handleInput}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
        className={`w-full px-4 py-2.5 bg-zinc-900/50 border rounded-xl focus:ring-1 outline-none transition-all placeholder:text-zinc-600 resize-none font-mono text-xs shadow-inner leading-relaxed custom-scrollbar ${
          error
            ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/30 text-red-100"
            : isComplete
              ? "border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500/30 text-emerald-100"
              : "border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500/30 text-zinc-200"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-zinc-800/30" : ""}`}
      />
      {error && (
        <p className="text-[10px] text-red-400 mt-1.5 ml-1 animate-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
};
