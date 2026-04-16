import { ReactNode } from "react";
import { LockIcon, BoltIcon } from "@/components/icons";

/**
 * Interface defining the layout props
 *
 * @interface AuthLayoutProps
 * @property {ReactNode} children - The form content to render.
 * @property {string} title - The main heading title.
 * @property {string} [subtitle] - The optional secondary text below the title.
 */
interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

/**
 * Split-Screen Auth Layout
 * Provides a premium, enterprise-grade authentication interface.
 * Features an independently scrollable left pane and a fixed static right hero section.
 *
 * @param {AuthLayoutProps} props - Component properties.
 * @returns {React.JSX.Element}
 */
export default function AuthLayout({
  children,
  title,
  subtitle,
}: AuthLayoutProps): React.JSX.Element {
  return (
    <div className="flex h-100dvh w-full bg-zinc-950 font-sans antialiased text-zinc-100 overflow-hidden">
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col h-full px-8 sm:px-16 lg:px-24 bg-zinc-950 z-10 relative shadow-2xl shadow-black overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-md mx-auto py-12 lg:py-24 my-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Secure<span className="text-indigo-500">P2P</span>
            </h1>
            <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase">
              Decentralized Encrypted Chat
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            {subtitle && (
              <p className="text-sm text-zinc-400 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          <div className="space-y-6">{children}</div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 h-full relative bg-zinc-900 overflow-hidden items-center justify-center border-l border-zinc-800">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />

        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] mask-[linear-gradient(to_bottom,white,transparent)] pointer-events-none" />

        <div className="relative z-10 max-w-2xl px-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/50 mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-medium text-zinc-300">
              End-to-End Encrypted
            </span>
          </div>
          <h2 className="text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Absolute Privacy.
            <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-400">
              Zero Data Retention.
            </span>
          </h2>
          <p className="text-lg text-zinc-400 leading-relaxed mb-10">
            Communicate securely over WebRTC with AES-256 encryption. Your keys
            never leave your device. No central servers, no chat history stored
            on the cloud.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
                <LockIcon className="w-5 h-5 text-indigo-400" />
              </div>
              <h4 className="font-semibold text-zinc-200 mb-1">
                Local Identity
              </h4>
              <p className="text-sm text-zinc-500">
                Your cryptographic keys are locked locally behind your password.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
                <BoltIcon className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="font-semibold text-zinc-200 mb-1">
                P2P Tunneling
              </h4>
              <p className="text-sm text-zinc-500">
                Direct device-to-device connection. Relays only handle the
                initial handshake.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}