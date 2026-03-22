import { WarningIcon } from "@/components/icons";

/**
 * Interface defining the props for the warning component.
 */
export interface DuplicateTabWarningProps {
  title?: string;
  message?: string;
}

/**
 * Renders a full-screen warning blocking the UI when a session conflict is detected.
 * Utilizes a Dark Glassmorphism aesthetic for premium UI consistency.
 *
 * @param {DuplicateTabWarningProps} props - Component properties for custom warning messages.
 * @returns {React.JSX.Element} The session warning UI.
 */
export default function DuplicateTabWarning({
  title = "Duplicate Session Detected",
  message = "A pure Peer-to-Peer communication system does not allow multi-tab usage to prevent WebRTC port conflicts and protect the integrity of your local cryptographic database.",
}: DuplicateTabWarningProps): React.JSX.Element {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-950 p-4 font-sans selection:bg-indigo-500/30">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
          <WarningIcon className="w-8 h-8 text-red-400" />
        </div>

        <h2 className="text-xl font-bold text-zinc-100 mb-3 tracking-tight">
          {title}
        </h2>

        <p className="text-sm text-zinc-400 leading-relaxed mb-6">{message}</p>

        <div className="bg-black/40 border border-zinc-800/50 rounded-xl p-4 w-full backdrop-blur-sm">
          <p className="text-xs text-zinc-300">
            Please{" "}
            <span className="text-red-400 font-bold">close this tab</span> and
            return to your active device or window.
          </p>
        </div>
      </div>
    </div>
  );
}
