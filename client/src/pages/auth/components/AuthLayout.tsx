import { ReactNode } from "react";

/**
 * 1. Wrapper layout for authentication pages
 * @param {ReactNode} children - The content to render inside the layout
 * @param {string} title - The main title of the page
 * @param {string} [subtitle] - The optional subtitle
 * @returns {JSX.Element}
 */
interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthLayout({
  children,
  title,
  subtitle,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 font-sans antialiased">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Section */}
        <div className="bg-zinc-950/50 p-6 text-center border-b border-zinc-800">
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Secure<span className="text-indigo-500">P2P</span>
          </h1>
          <p className="text-zinc-500 text-xs mt-2 font-medium tracking-widest uppercase">
            Zero Data Retention
          </p>
        </div>

        {/* Content Section */}
        <div className="p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
            {subtitle && (
              <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
