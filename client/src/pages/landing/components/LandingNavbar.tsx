import { useState } from "react";
import { Link } from "react-router-dom";

export default function LandingNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-50 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex justify-between items-center transition-all duration-500">
        <Link to="/" className="text-xl font-bold tracking-tight flex items-center gap-3 group cursor-pointer">
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
        </Link>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-full px-2 py-1">
          <a href="http://10.64.24.248:8080/" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all font-medium">Explorer</a>
          <a href="https://github.com/kakonoomoidee/skripsi-Chat-APP" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all font-medium">Source Code</a>
          <a href="https://youtu.be/96Tsss3J0Qk" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all font-medium">Watch Demo</a>
          <Link to="/how-it-works" className="px-4 py-2 rounded-full text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all font-medium">How It Works</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden md:flex group relative bg-white text-black px-6 py-2.5 rounded-full text-sm font-bold transition-all transform hover:scale-105 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-200 via-white to-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center gap-2">
              Launch App
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </Link>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors relative z-50"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-zinc-950/98 backdrop-blur-3xl md:hidden pt-32 px-6 pb-6 flex flex-col gap-6 animate-in fade-in duration-300">
          <nav className="flex flex-col gap-2 text-center">
            <a href="http://10.64.24.248:8080/" onClick={() => setIsMobileMenuOpen(false)} className="py-4 text-xl font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-2xl transition-colors">Explorer</a>
            <a href="https://github.com/kakonoomoidee/skripsi-Chat-APP" onClick={() => setIsMobileMenuOpen(false)} className="py-4 text-xl font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-2xl transition-colors">Source Code</a>
            <a href="https://youtu.be/96Tsss3J0Qk" onClick={() => setIsMobileMenuOpen(false)} className="py-4 text-xl font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-2xl transition-colors">Watch Demo</a>
            <Link to="/how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="py-4 text-xl font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-2xl transition-colors">How It Works</Link>
          </nav>
          <div className="mt-auto pb-8">
            <Link
              to="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block w-full bg-white text-black py-4 rounded-full text-center font-bold text-lg shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              Launch App
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
