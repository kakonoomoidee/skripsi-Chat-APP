import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import ms from "ms";
import packageJson from "../../../package.json";
import LandingFooter from "./components/LandingFooter";
import {
  ChevronRightIcon,
  LoginIcon,
  ServerCrossIcon,
  GlobeNodesIcon,
  KeyIcon,
  LandingLockIcon,
  ShieldCheckIcon,
  MegaphoneIcon,
  JournalistIcon,
  FingerprintIcon,
} from "@/components/icons";

/**
 * Landing Page Component presenting the product overview, architecture, cryptography, and features
 * @returns {JSX.Element}
 */
export default function LandingClient() {
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const fullText = "Leaving A Trace.";
  const appVersion = `v${packageJson.version}`;

  // Looping Typewriter Effect
  useEffect(() => {
    const typeSpeed = isDeleting ? 50 : 120;

    const timer = setTimeout(() => {
      if (!isDeleting && typedText === fullText) {
        setTimeout(() => setIsDeleting(true), ms("2s"));
      } else if (isDeleting && typedText === "") {
        setTimeout(() => setIsDeleting(false), ms("500ms"));
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
      <header className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-50 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex justify-between items-center transition-all duration-500">
        <div className="text-xl font-bold tracking-tight flex items-center gap-3 group cursor-pointer">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
            <img
              src="/logo.png"
              alt="SecureP2P Logo"
              className="w-8 h-8 object-contain relative z-10 transform group-hover:scale-110 transition-transform duration-300"
            />
          </div>
          <span>
            Secure<span className="text-indigo-400">P2P</span>
          </span>
        </div>
        
        <nav className="hidden md:flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-full px-2 py-1">
          <a
            href="http://10.64.24.248:8080/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-full text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all font-medium"
          >
            Explorer
          </a>
          <a
            href="https://github.com/kakonoomoidee/skripsi-Chat-APP"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-full text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all font-medium"
          >
            Source Code
          </a>
          <a
            href="https://youtu.be/96Tsss3J0Qk"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-full text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all font-medium"
          >
            Watch Demo
          </a>
          <Link
            to="/how-it-works"
            className="px-4 py-2 rounded-full text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all font-medium"
          >
            How It Works
          </Link>
        </nav>

        <Link
          to="/login"
          className="group relative bg-white text-black px-6 py-2.5 rounded-full text-sm font-bold transition-all transform hover:scale-105 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-200 via-white to-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative z-10 flex items-center gap-2">
            Launch App
            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
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
              <ChevronRightIcon className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-500 px-8 py-4 rounded-xl text-base font-medium transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2 group"
            >
              Login to Existing
              <div className="text-zinc-500 group-hover:text-zinc-300 transition-colors">
                <LoginIcon className="w-4 h-4" />
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
                <ServerCrossIcon className="w-full h-full" />
              </div>
              <h3 className="text-2xl font-bold mb-6 text-red-400 flex items-center gap-3">
                <div className="w-6 h-6">
                  <ServerCrossIcon className="w-full h-full" />
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
                <GlobeNodesIcon className="w-full h-full" />
              </div>
              <h3 className="text-2xl font-bold mb-6 text-indigo-400 flex items-center gap-3">
                <div className="w-6 h-6 text-emerald-500">
                  <ShieldCheckIcon className="w-full h-full" />
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
                  <KeyIcon className="w-full h-full" />
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
                  <FingerprintIcon className="w-full h-full" />
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
                  <LandingLockIcon className="w-full h-full" />
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
                <MegaphoneIcon className="w-full h-full" />
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
                <JournalistIcon className="w-full h-full" />
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
                <FingerprintIcon className="w-full h-full" />
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
      <LandingFooter appVersion={appVersion} />
    </div>
  );
}
