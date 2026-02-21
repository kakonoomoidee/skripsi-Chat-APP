import React from "react";

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header Section */}
        <div className="bg-slate-900 p-6 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Secure<span className="text-blue-400">P2P</span> Chat
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Zero Data Retention Architecture
          </p>
        </div>

        {/* Content Section */}
        <div className="p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
