import React, { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@/components/icons";
import {
  getPasswordRuleStates,
  isPasswordSecure,
  stripWhitespace,
} from "@/utils/auth/password";

/**
 * Interface for PasswordInput component properties.
 *
 * @interface PasswordInputProps
 * @property {string} [label] - Optional label for the input.
 * @property {string} value - The current password string.
 * @property {(e: React.ChangeEvent<HTMLInputElement>) => void} onChange - Change event handler.
 * @property {string} [placeholder] - Placeholder text.
 * @property {boolean} [disabled] - Disables the input when true.
 * @property {boolean} [showRules] - Determines whether to display password validation rules below the input.
 * @property {string} [error] - Optional error message to display below the input.
 */
export interface PasswordInputProps {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  showRules?: boolean;
  error?: string;
}

/**
 * Validates if a given password meets all security requirements.
 *
 * @param {string} password - The password string to evaluate.
 * @returns {boolean} True if the password meets all criteria, false otherwise.
 */
export const validatePasswordSecurity = (password: string): boolean => {
  return isPasswordSecure(password);
};

/**
 * Renders a secure password input field with visibility toggle and dynamic strength indicators.
 * Restricts whitespace characters from being entered.
 *
 * @param {PasswordInputProps} props - Component properties.
 * @returns {React.JSX.Element} The rendered password input component.
 */
export const PasswordInput = ({
  label = "Password",
  value,
  onChange,
  placeholder = "Enter your password",
  disabled = false,
  showRules = false,
  error,
}: PasswordInputProps): React.JSX.Element => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const rules = getPasswordRuleStates(value);

  /**
   * Intercepts the change event to strip out any whitespace before passing to parent.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event.
   * @returns {void}
   */
  const handleNoSpaceChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    e.target.value = stripWhitespace(e.target.value);
    onChange(e);
  };

  return (
    <div className="flex flex-col w-full">
      {label && (
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={handleNoSpaceChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full bg-zinc-950 border rounded-xl px-4 py-2.5 text-sm outline-none transition-all pr-12 disabled:opacity-50 ${
            error
              ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/30 text-red-200 placeholder:text-red-800"
              : "border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-zinc-200 placeholder:text-zinc-600"
          }`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none disabled:opacity-50"
        >
          {showPassword ? (
            <EyeSlashIcon className="w-4 h-4" />
          ) : (
            <EyeIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      {error && !showRules && (
        <p className="text-[10px] text-red-400 mt-1.5 ml-1 animate-in slide-in-from-top-1 font-medium">
          {error}
        </p>
      )}

      {showRules && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center gap-1.5">
              <div
                className={`w-3 h-3 rounded-full flex items-center justify-center border transition-colors ${
                  rule.met
                    ? "bg-emerald-500/20 border-emerald-500/50"
                    : "bg-zinc-800 border-zinc-700"
                }`}
              >
                {rule.met && (
                  <span className="text-[8px] text-emerald-400 font-bold">
                    ✓
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] transition-colors ${
                  rule.met ? "text-emerald-400" : "text-zinc-500"
                }`}
              >
                {rule.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
