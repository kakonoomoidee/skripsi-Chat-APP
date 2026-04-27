import React from "react";
import { getSeedWords } from "@/utils/seedPhrase";

interface SeedPhraseGridProps {
  phrase: string;
}

/**
 * Renders a 12-word seed phrase in a clean, responsive grid layout.
 * @param {SeedPhraseGridProps} props - The component props containing the seed phrase.
 * @returns {React.JSX.Element} The grid layout of the seed phrase.
 */
export default function SeedPhraseGrid({
  phrase,
}: SeedPhraseGridProps): React.JSX.Element {
  const words = getSeedWords(phrase);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {words.map((word: string, index: number) => (
        <div
          key={index}
          className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-sm"
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-zinc-900 text-[11px] font-bold text-zinc-500 shrink-0">
            {index + 1}
          </div>
          <span className="font-mono text-sm text-zinc-200 font-medium tracking-wide">
            {word}
          </span>
        </div>
      ))}
    </div>
  );
}
