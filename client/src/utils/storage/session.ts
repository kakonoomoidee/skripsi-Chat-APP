export const AUTH_TOKEN_STORAGE_KEY = "auth_token";
export const LAST_ACTIVITY_STORAGE_KEY = "securep2p_last_activity";

export const getStoredAuthToken = (): string | null =>
  localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

export const setStoredAuthToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
};

export const clearStoredAuthToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

export const updateStoredLastActivity = (): void => {
  localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, Date.now().toString());
};

export const getStoredLastActivity = (): number | null => {
  const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY);
  if (!lastActivityStr) {
    return null;
  }

  const lastActivity = Number.parseInt(lastActivityStr, 10);
  return Number.isFinite(lastActivity) ? lastActivity : null;
};

export const clearStoredLastActivity = (): void => {
  localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
};
