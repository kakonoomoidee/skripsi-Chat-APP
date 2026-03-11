import React, { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@/components/icons";

/**
 * Interface defining the properties for the PasswordInput component.
 */
export interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

/**
 * Render a reusable password input field with a visibility toggle button.
 *
 * @param {PasswordInputProps} props - The component props.
 * @returns {React.JSX.Element} The rendered PasswordInput component.
 */
export default function PasswordInput({
  value,
  onChange,
  placeholder = "Enter your password",
  disabled = false,
  label = "Encryption Password",
}: PasswordInputProps): React.JSX.Element {
  const [showPassword, setShowPassword] = useState<boolean>(false);

  return (
    <div>
      {label && (
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600 shadow-sm pr-12"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none disabled:opacity-50"
          title={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeSlashIcon className="w-5 h-5" />
          ) : (
            <EyeIcon className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
