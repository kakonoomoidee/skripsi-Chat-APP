export interface PasswordRuleState {
  id: number;
  text: string;
  met: boolean;
}

/**
 * Evaluates password requirements and returns per-rule state.
 *
 * @param {string} password - Password to evaluate.
 * @returns {PasswordRuleState[]} Rule states.
 */
export const getPasswordRuleStates = (
  password: string,
): PasswordRuleState[] => [
  { id: 1, text: "Min. 8 characters", met: password.length >= 8 },
  { id: 2, text: "Uppercase letter", met: /[A-Z]/.test(password) },
  { id: 3, text: "Lowercase letter", met: /[a-z]/.test(password) },
  { id: 4, text: "Number", met: /[0-9]/.test(password) },
  { id: 5, text: "Special character", met: /[^A-Za-z0-9]/.test(password) },
];

/**
 * Returns whether all password requirements are satisfied.
 *
 * @param {string} password - Password to evaluate.
 * @returns {boolean} True when all rules pass.
 */
export const isPasswordSecure = (password: string): boolean =>
  getPasswordRuleStates(password).every((rule) => rule.met);

/**
 * Removes all whitespace characters from an input string.
 *
 * @param {string} value - Raw input value.
 * @returns {string} Value without whitespace.
 */
export const stripWhitespace = (value: string): string =>
  value.replace(/\s/g, "");
