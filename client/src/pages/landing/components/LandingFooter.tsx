const PROJECT_LINKS = {
  explorer: "http://10.64.24.248:8080/",
  github: "https://github.com/kakonoomoidee/skripsi-Chat-APP",
  youtube: "https://youtu.be/96Tsss3J0Qk",
  whitepaper: "#",
  article: "#",
};

const RESOURCE_LINKS = [
  { label: "Local Explorer", href: PROJECT_LINKS.explorer },
  { label: "Source Code", href: PROJECT_LINKS.github },
  { label: "Watch Demo", href: PROJECT_LINKS.youtube },
  { label: "Thesis Document", href: PROJECT_LINKS.whitepaper },
  { label: "Research Article", href: PROJECT_LINKS.article },
];

/**
 * Renders the landing page footer with project resources.
 * @param {{ appVersion: string }} props - Footer props.
 * @returns {JSX.Element} The footer element.
 */
export default function LandingFooter({ appVersion }: { appVersion: string }) {
  return (
    <footer className="py-12 border-t border-zinc-800 z-10 bg-zinc-950">
      <div className="max-w-6xl mx-auto px-6 grid gap-10 md:grid-cols-[1.2fr_0.9fr_1fr] items-start">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="SecureP2P Logo"
            className="w-6 h-6 object-contain opacity-80"
          />
          <span className="font-bold text-zinc-300 tracking-wide text-lg">
            SecureP2P
          </span>
          <span className="text-[11px] font-semibold tracking-wide text-indigo-200 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-full">
            {appVersion}
          </span>
        </div>
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
            Resources
          </p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {RESOURCE_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-500 hover:text-indigo-400 transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-left md:text-right text-zinc-500 text-sm">
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
  );
}
