import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

// ============================================================================
// SVG ICONS (KEPT HERE FOR EASY MAINTENANCE, CAN BE MOVED TO SEPARATE FILE IF NEEDED)
// ============================================================================

const IconChevronRight = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </svg>
);

const IconLogin = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
    />
  </svg>
);

const IconServerCross = () => (
  <svg
    className="w-full h-full"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1}
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
);

const IconGlobeNodes = () => (
  <svg
    className="w-full h-full"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

const IconKey = () => (
  <svg
    className="w-full h-full"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1}
      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
    />
  </svg>
);

const IconLock = () => (
  <svg
    className="w-full h-full"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const IconShieldCheck = () => (
  <svg
    className="w-full h-full"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const IconMegaphone = () => (
  <svg
    className="w-full h-full"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1}
      d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
    />
  </svg>
);

const IconJournalist = () => (
  <svg
    className="w-full h-full"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1}
      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15"
    />
  </svg>
);

const IconFingerprint = () => (
  <svg
    className="w-full h-full"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1}
      d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
    />
  </svg>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Landing Page Component presenting the product overview, architecture, cryptography, and features
 * @returns {JSX.Element}
 */
export default function LandingClient() {
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const fullText = "Leaving A Trace.";

  // Looping Typewriter Effect
  useEffect(() => {
    const typeSpeed = isDeleting ? 50 : 120;

    const timer = setTimeout(() => {
      if (!isDeleting && typedText === fullText) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && typedText === "") {
        setTimeout(() => setIsDeleting(false), 500);
      } else {
        setTypedText(
          fullText.substring(0, typedText.length + (isDeleting ? -1 : 1)),
        );
      }
    }, typeSpeed);

    return () => clearTimeout(timer);
  }, [typedText, isDeleting]);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const techStack = [
    "Ethereum Blockchain",
    "WebRTC Data Channels",
    "AES-256 Encryption",
    "ECDH Key Exchange",
    "IndexedDB Local Storage",
    "Socket.io Signaling",
    "Zero-Knowledge Infrastructure",
    "Vite React",
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            display: flex;
            width: fit-content;
            animation: marquee 30s linear infinite;
          }
          .animate-marquee:hover {
            animation-play-state: paused;
          }
        `}
      </style>

      {/* HEADER */}
      <header className="px-6 py-4 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="text-xl font-bold tracking-tight flex items-center gap-3">
          <img
            src="/logo.png"
            alt="SecureP2P Logo"
            className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(79,70,229,0.8)]"
          />
          <span>
            Secure<span className="text-indigo-400">P2P</span>
          </span>
        </div>
        <Link
          to="/login"
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(79,70,229,0.4)]"
        >
          Launch App
        </Link>
      </header>

      {/* HERO SECTION */}
      <main className="flex flex-col items-center justify-center text-center px-4 pt-32 pb-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-100 md:w-200 md:h-125 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse duration-1000"></div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold tracking-wide mb-8 uppercase hover:bg-indigo-500/20 transition-colors cursor-default">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
            Zero-Knowledge Infrastructure
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] min-h-30 md:min-h-40">
            Communicate Without <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 via-purple-400 to-cyan-400">
              {typedText}
              <span className="inline-block w-1 h-12 md:h-16 bg-cyan-400 ml-1 animate-pulse align-middle"></span>
            </span>
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl mb-12 leading-relaxed max-w-2xl mx-auto font-light">
            A decentralized messaging protocol that bypasses central servers
            entirely. Own your identity via Ethereum Smart Contracts and
            establish military-grade direct tunnels using WebRTC.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <Link
              to="/register"
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.6)] transform hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              Create Web3 Identity
              <IconChevronRight />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-500 px-8 py-4 rounded-xl text-base font-medium transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2 group"
            >
              Login to Existing
              <div className="text-zinc-500 group-hover:text-zinc-300 transition-colors">
                <IconLogin />
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* TECH STACK MARQUEE */}
      <div className="border-y border-zinc-800/80 bg-zinc-900/30 py-4 overflow-hidden flex whitespace-nowrap">
        <div className="animate-marquee flex gap-12 text-zinc-500 font-semibold text-sm tracking-widest uppercase items-center">
          {[...techStack, ...techStack].map((tech, index) => (
            <div key={index} className="flex items-center gap-12">
              <span className="hover:text-indigo-400 transition-colors cursor-default">
                {tech}
              </span>
              <span className="text-zinc-700">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* THE PARADIGM SHIFT */}
      <section className="py-24 px-6 relative z-10 bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              The Privacy Paradigm Shift
            </h2>
            <p className="text-zinc-500 max-w-2xl mx-auto text-lg">
              Why rely on corporations to keep your data safe when you can
              remove them from the equation entirely?
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-linear-to-b from-red-500/10 to-zinc-950 border border-red-500/20 p-10 rounded-4xl relative overflow-hidden group hover:border-red-500/40 transition-colors duration-500">
              <div className="absolute top-0 right-0 p-6 w-48 h-48 text-red-500 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 transform origin-top-right">
                <IconServerCross />
              </div>
              <h3 className="text-2xl font-bold mb-6 text-red-400 flex items-center gap-3">
                <div className="w-6 h-6">
                  <IconServerCross />
                </div>
                The Status Quo
              </h3>
              <ul className="space-y-5 text-zinc-400 relative z-10 text-lg">
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>
                    Your messages sit permanently on centralized database
                    servers.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>
                    Tech giants control your identity, access, and contact
                    lists.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>
                    Highly vulnerable to data breaches and metadata harvesting.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-linear-to-b from-indigo-500/10 to-zinc-950 border border-indigo-500/30 p-10 rounded-4xl relative overflow-hidden group hover:border-indigo-500/50 transition-colors duration-500">
              <div className="absolute top-0 right-0 p-6 w-48 h-48 text-indigo-500 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 transform origin-top-right">
                <IconGlobeNodes />
              </div>
              <h3 className="text-2xl font-bold mb-6 text-indigo-400 flex items-center gap-3">
                <div className="w-6 h-6 text-emerald-500">
                  <IconShieldCheck />
                </div>
                SecureP2P Architecture
              </h3>
              <ul className="space-y-5 text-zinc-300 relative z-10 text-lg">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-500 mt-1">✓</span>
                  <span>
                    Messages flow directly peer-to-peer via encrypted WebRTC
                    tunnels.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-500 mt-1">✓</span>
                  <span>
                    Self-Sovereign Identity tied mathematically to your Ethereum
                    Wallet.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-500 mt-1">✓</span>
                  <span>
                    Zero central database. Local storage with self-healing Dexie
                    DB.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* NEW CRYPTOGRAPHY DEEP DIVE (REDESIGNED WITH OVERLAYS) */}
      <section className="py-32 px-6 bg-zinc-950 relative overflow-hidden border-t border-zinc-800">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-75 bg-emerald-500/5 blur-[150px] pointer-events-none"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-24">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-6 tracking-tight">
              Cryptography Pipeline
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
              How we achieve{" "}
              <span className="text-emerald-400 font-semibold">
                Perfect Forward Secrecy
              </span>{" "}
              without a centralized key server.
            </p>
          </div>

          <div className="relative">
            {/* Glowing connecting horizontal line */}
            <div className="hidden md:block absolute top-[40%] left-0 w-full h-1 bg-linear-to-r from-indigo-500/20 via-cyan-500/50 to-emerald-500/20 -translate-y-1/2 z-0"></div>

            <div className="grid md:grid-cols-3 gap-8 relative z-10">
              {/* Box 1 */}
              <div className="bg-linear-to-br from-zinc-900/90 to-zinc-950 backdrop-blur-sm p-10 rounded-4xl border border-indigo-500/30 hover:border-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.1)] hover:shadow-[0_0_40px_rgba(79,70,229,0.3)] transition-all duration-500 group overflow-hidden relative">
                <div className="absolute -right-6 -bottom-6 w-40 h-40 text-indigo-500 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
                  <IconKey />
                </div>
                <div className="w-16 h-16 bg-zinc-950 border border-indigo-500/50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-inner relative z-10">
                  <span className="text-indigo-400 font-mono font-bold text-xl">
                    01
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-4 text-indigo-300 relative z-10">
                  ECDH Exchange
                </h3>
                <p className="text-zinc-400 leading-relaxed text-sm relative z-10">
                  Both peers generate ephemeral Elliptic Curve keypairs. Public
                  keys are securely exchanged via the relay node during the
                  initial signaling phase.
                </p>
              </div>

              {/* Box 2 (Elevated) */}
              <div className="bg-linear-to-br from-zinc-900/90 to-zinc-950 backdrop-blur-sm p-10 rounded-4xl border border-cyan-500/30 hover:border-cyan-500 shadow-[0_0_30px_rgba(34,211,238,0.1)] hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] transition-all duration-500 group md:-translate-y-12 overflow-hidden relative">
                <div className="absolute -right-6 -bottom-6 w-40 h-40 text-cyan-500 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
                  <IconFingerprint />
                </div>
                <div className="w-16 h-16 bg-zinc-950 border border-cyan-500/50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-inner relative z-10">
                  <span className="text-cyan-400 font-mono font-bold text-xl">
                    02
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-4 text-cyan-300 relative z-10">
                  Shared Secret
                </h3>
                <p className="text-zinc-400 leading-relaxed text-sm relative z-10">
                  Each peer independently computes an identical, unguessable
                  Shared Secret locally. This critical secret never travels
                  across any network.
                </p>
              </div>

              {/* Box 3 */}
              <div className="bg-linear-to-br from-zinc-900/90 to-zinc-950 backdrop-blur-sm p-10 rounded-4xl border border-emerald-500/30 hover:border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.1)] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all duration-500 group overflow-hidden relative">
                <div className="absolute -right-6 -bottom-6 w-40 h-40 text-emerald-500 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
                  <IconLock />
                </div>
                <div className="w-16 h-16 bg-zinc-950 border border-emerald-500/50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-inner relative z-10">
                  <span className="text-emerald-400 font-mono font-bold text-xl">
                    03
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-4 text-emerald-300 relative z-10">
                  AES-256 Stream
                </h3>
                <p className="text-zinc-400 leading-relaxed text-sm relative z-10">
                  The Shared Secret acts as the symmetric key for the AES-256
                  cipher. All WebRTC packets are encrypted end-to-end, rendering
                  interception useless.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6 relative z-10 bg-zinc-900/30 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How The Tunnel Is Built
            </h2>
            <p className="text-zinc-500 max-w-2xl mx-auto text-lg">
              A seamless blend of Blockchain authentication and WebRTC
              networking.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-linear-to-r from-indigo-500/0 via-indigo-500/50 to-cyan-500/0"></div>

            <div className="relative text-center z-10 group">
              <div className="w-24 h-24 mx-auto bg-zinc-950 border-2 border-indigo-500/30 group-hover:border-indigo-500 group-hover:shadow-[0_0_30px_rgba(79,70,229,0.3)] rounded-2xl flex items-center justify-center text-indigo-400 mb-6 transition-all duration-300 transform group-hover:-translate-y-2">
                <span className="text-3xl font-black">1</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Blockchain Identity</h3>
              <p className="text-sm text-zinc-400 leading-relaxed px-4">
                You register a gasless transaction on the EVM network. Your
                public keys are bound to your wallet address permanently.
              </p>
            </div>

            <div className="relative text-center z-10 group">
              <div className="w-24 h-24 mx-auto bg-zinc-950 border-2 border-purple-500/30 group-hover:border-purple-500 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] rounded-2xl flex items-center justify-center text-purple-400 mb-6 transition-all duration-300 transform group-hover:-translate-y-2">
                <span className="text-3xl font-black">2</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Socket Signaling</h3>
              <p className="text-sm text-zinc-400 leading-relaxed px-4">
                Connect via any custom relay node. The server only facilitates
                the initial ECDH handshake and is then completely dropped.
              </p>
            </div>

            <div className="relative text-center z-10 group">
              <div className="w-24 h-24 mx-auto bg-zinc-950 border-2 border-cyan-500/30 group-hover:border-cyan-500 group-hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] rounded-2xl flex items-center justify-center text-cyan-400 mb-6 transition-all duration-300 transform group-hover:-translate-y-2">
                <span className="text-3xl font-black">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3">P2P Tunneling</h3>
              <p className="text-sm text-zinc-400 leading-relaxed px-4">
                A direct WebRTC data channel is formed. AES-256 encrypted
                messages and images are sent straight to the recipient's device.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES WITH SVGS OVERLAYS */}
      <section className="py-24 px-6 bg-zinc-950 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Built For Absolute Confidentiality
            </h2>
            <p className="text-zinc-500 max-w-2xl mx-auto">
              Who benefits from a zero-knowledge infrastructure?
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-3xl hover:border-zinc-600 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-32 h-32 text-zinc-600 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                <IconMegaphone />
              </div>
              <h4 className="text-xl font-bold text-zinc-100 mb-4 relative z-10">
                Whistleblowers
              </h4>
              <p className="text-zinc-400 text-sm leading-relaxed relative z-10">
                Ensure metadata cannot be tracked back to you. The lack of a
                central database means no logs exist to be subpoenaed.
              </p>
            </div>

            <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-3xl hover:border-zinc-600 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-32 h-32 text-zinc-600 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                <IconJournalist />
              </div>
              <h4 className="text-xl font-bold text-zinc-100 mb-4 relative z-10">
                Journalists
              </h4>
              <p className="text-zinc-400 text-sm leading-relaxed relative z-10">
                Communicate with confidential sources using ephemeral tunnels.
                Once the browser closes, the active tunnel ceases to exist.
              </p>
            </div>

            <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-3xl hover:border-zinc-600 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-32 h-32 text-zinc-600 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                <IconFingerprint />
              </div>
              <h4 className="text-xl font-bold text-zinc-100 mb-4 relative z-10">
                Privacy Purists
              </h4>
              <p className="text-zinc-400 text-sm leading-relaxed relative z-10">
                For those who believe digital identity should be self-sovereign,
                not rented from Web2 social media monopolies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* UPDATED FAQ */}
      <section className="py-24 px-6 bg-zinc-900/20 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-zinc-500">
              Understanding the capabilities of SecureP2P.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Are my messages stored on the Ethereum Blockchain?",
                a: "No. The blockchain is strictly used for Identity Registry (storing your public key and username). Messages are transmitted directly via WebRTC and stored only in your browser's local database.",
              },
              {
                q: "What happens if the Relay Server goes down?",
                a: "The Relay Server is only needed for the initial 2-second 'Handshake'. If it goes down while you are chatting, your chat will not disconnect. You can also manually input a custom Relay Server URL if the default one fails.",
              },
              {
                q: "Can I recover my chat history if I clear my browser data?",
                a: "Yes, provided you have utilized the 'Export' feature beforehand. SecureP2P allows you to export an encrypted backup of your IndexedDB storage (.securep2p file), which can later be imported to seamlessly restore your active sessions and messages.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="border border-zinc-800 rounded-xl bg-zinc-950 overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-4 text-left font-semibold flex justify-between items-center hover:bg-zinc-900/50 transition-colors"
                >
                  {faq.q}
                  <span className="text-zinc-500">
                    {openFaq === idx ? "−" : "+"}
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-4 text-zinc-400 text-sm leading-relaxed border-t border-zinc-800/50 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SLEEK CTA */}
      <section className="py-16 relative z-10 bg-zinc-950 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-colors duration-500"></div>
            <div className="text-center md:text-left relative z-10">
              <h2 className="text-2xl font-bold mb-2 text-white">
                Reclaim Your Digital Sovereignty
              </h2>
              <p className="text-zinc-400 text-sm">
                Open source thesis project built for the decentralized web.
              </p>
            </div>
            <Link
              to="/register"
              className="relative z-10 whitespace-nowrap bg-white text-zinc-950 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 hover:bg-indigo-50 shadow-lg shadow-white/5"
            >
              Start Handshake
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-zinc-800 z-10 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="SecureP2P Logo"
              className="w-6 h-6 object-contain opacity-80"
            />
            <span className="font-bold text-zinc-300 tracking-wide text-lg">
              SecureP2P
            </span>
          </div>
          <div className="text-center md:text-right text-zinc-500 text-sm">
            <p>
              Designed & Developed by{" "}
              <span className="text-zinc-300 font-medium">Rizki Ramadan</span>
            </p>
            <p className="mt-1">
              Undergraduate Thesis Project &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
